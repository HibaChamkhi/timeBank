-- TimeBank core schema: profiles, skills, bookings and an append-only credit ledger.
-- Money-like rules live in the database, not the app: balances can never go negative,
-- credits move only through the functions below, and every movement is recorded once.

create extension if not exists btree_gist;

create type public.booking_status as enum ('requested', 'accepted', 'completed', 'cancelled', 'disputed');
create type public.ledger_kind as enum ('welcome_grant', 'hold', 'earn', 'refund');

-- ---------------------------------------------------------------- tables

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  headline text not null default '',
  bio text not null default '',
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Balance is kept apart from profiles so it is never visible to other members.
create table public.wallets (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  balance numeric(8, 2) not null default 0 check (balance >= 0)
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 80),
  category text not null,
  description text not null default '',
  credits_per_hour numeric(4, 2) not null default 1 check (credits_per_hour > 0 and credits_per_hour <= 10),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index skills_owner_idx on public.skills (owner_id);
create index skills_category_idx on public.skills (category) where active;

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid not null references public.skills (id),
  provider_id uuid not null references public.profiles (id),
  requester_id uuid not null references public.profiles (id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  hours numeric(3, 1) not null check (hours > 0 and hours <= 8 and hours * 2 = floor(hours * 2)),
  credits numeric(8, 2) not null check (credits > 0),
  status public.booking_status not null default 'requested',
  requester_confirmed_at timestamptz,
  provider_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (provider_id <> requester_id),
  check (ends_at > starts_at),
  -- A provider cannot be double-booked while a request or accepted session is open.
  exclude using gist (provider_id with =, tstzrange(starts_at, ends_at) with &&)
    where (status in ('requested', 'accepted'))
);
create index bookings_requester_idx on public.bookings (requester_id);
create index bookings_provider_idx on public.bookings (provider_id);

create table public.ledger_entries (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id),
  booking_id uuid references public.bookings (id),
  kind public.ledger_kind not null,
  amount numeric(8, 2) not null,
  created_at timestamptz not null default now(),
  check ((kind in ('welcome_grant', 'earn', 'refund') and amount > 0) or (kind = 'hold' and amount < 0)),
  check ((kind = 'welcome_grant') = (booking_id is null))
);
-- Each booking can hold, earn and refund at most once per person: retries cannot double-pay.
create unique index ledger_once_per_booking on public.ledger_entries (booking_id, kind, user_id) where booking_id is not null;
create index ledger_user_idx on public.ledger_entries (user_id, created_at desc);

-- ---------------------------------------------------------------- ledger integrity

-- The wallet balance is derived from ledger inserts. Its CHECK (balance >= 0) plus the row
-- lock taken by this UPDATE is what makes double-spending impossible under concurrency.
create function public.apply_ledger_entry() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.wallets set balance = balance + new.amount where user_id = new.user_id;
  return new;
end $$;
create trigger ledger_apply after insert on public.ledger_entries
  for each row execute function public.apply_ledger_entry();

create function public.ledger_append_only() returns trigger
language plpgsql as $$
begin
  raise exception 'ledger_is_append_only';
end $$;
create trigger ledger_no_update before update or delete on public.ledger_entries
  for each row execute function public.ledger_append_only();

-- ---------------------------------------------------------------- signup

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  insert into public.wallets (user_id) values (new.id);
  -- Everyone starts with 2 hours so they can ask for help before they have given any.
  insert into public.ledger_entries (user_id, kind, amount) values (new.id, 'welcome_grant', 2);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- credit functions

create function public.book_session(p_skill_id uuid, p_starts_at timestamptz, p_hours numeric)
returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  s public.skills;
  b public.bookings;
  cost numeric;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if p_hours is null or p_hours <= 0 or p_hours > 8 or p_hours * 2 <> floor(p_hours * 2) then
    raise exception 'invalid_hours';
  end if;
  select * into s from public.skills where id = p_skill_id and active;
  if not found then raise exception 'skill_not_found'; end if;
  if s.owner_id = uid then raise exception 'cannot_book_own_skill'; end if;
  if p_starts_at <= now() then raise exception 'start_in_past'; end if;

  cost := round(p_hours * s.credits_per_hour, 2);

  begin
    insert into public.bookings (skill_id, provider_id, requester_id, starts_at, ends_at, hours, credits)
    values (s.id, s.owner_id, uid, p_starts_at, p_starts_at + make_interval(secs => (p_hours * 3600)::float8), p_hours, cost)
    returning * into b;
  exception when exclusion_violation then
    raise exception 'time_slot_taken';
  end;

  begin
    insert into public.ledger_entries (user_id, booking_id, kind, amount) values (uid, b.id, 'hold', -cost);
  exception when check_violation then
    raise exception 'insufficient_credits';
  end;

  return b;
end $$;

-- Provider accepts or declines a request. Declining returns the held credits.
create function public.respond_booking(p_booking_id uuid, p_accept boolean)
returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); b public.bookings;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'booking_not_found'; end if;
  if b.provider_id <> uid then raise exception 'forbidden'; end if;
  if b.status <> 'requested' then raise exception 'invalid_status'; end if;

  if p_accept then
    update public.bookings set status = 'accepted', updated_at = now() where id = b.id returning * into b;
  else
    update public.bookings set status = 'cancelled', updated_at = now() where id = b.id returning * into b;
    insert into public.ledger_entries (user_id, booking_id, kind, amount) values (b.requester_id, b.id, 'refund', b.credits);
  end if;
  return b;
end $$;

-- Either side can cancel before the session is completed; the requester gets the credits back.
create function public.cancel_booking(p_booking_id uuid)
returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); b public.bookings;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'booking_not_found'; end if;
  if uid not in (b.requester_id, b.provider_id) then raise exception 'forbidden'; end if;
  if b.status not in ('requested', 'accepted') then raise exception 'invalid_status'; end if;

  update public.bookings set status = 'cancelled', updated_at = now() where id = b.id returning * into b;
  insert into public.ledger_entries (user_id, booking_id, kind, amount) values (b.requester_id, b.id, 'refund', b.credits);
  return b;
end $$;

-- Each side confirms the session happened. When both have, the provider is paid.
create function public.confirm_session(p_booking_id uuid)
returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); b public.bookings;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'booking_not_found'; end if;
  if uid not in (b.requester_id, b.provider_id) then raise exception 'forbidden'; end if;
  if b.status <> 'accepted' then raise exception 'invalid_status'; end if;
  if now() < b.starts_at then raise exception 'session_not_started'; end if;

  if uid = b.requester_id then
    update public.bookings set requester_confirmed_at = coalesce(requester_confirmed_at, now()), updated_at = now()
      where id = b.id returning * into b;
  else
    update public.bookings set provider_confirmed_at = coalesce(provider_confirmed_at, now()), updated_at = now()
      where id = b.id returning * into b;
  end if;

  if b.requester_confirmed_at is not null and b.provider_confirmed_at is not null then
    update public.bookings set status = 'completed', updated_at = now() where id = b.id returning * into b;
    insert into public.ledger_entries (user_id, booking_id, kind, amount) values (b.provider_id, b.id, 'earn', b.credits);
  end if;
  return b;
end $$;

-- Freezes the credits until someone reviews it. Nothing is paid or refunded automatically.
create function public.dispute_booking(p_booking_id uuid)
returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); b public.bookings;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'booking_not_found'; end if;
  if uid not in (b.requester_id, b.provider_id) then raise exception 'forbidden'; end if;
  if b.status <> 'accepted' then raise exception 'invalid_status'; end if;
  update public.bookings set status = 'disputed', updated_at = now() where id = b.id returning * into b;
  return b;
end $$;

-- ---------------------------------------------------------------- privileges and RLS

alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.skills enable row level security;
alter table public.bookings enable row level security;
alter table public.ledger_entries enable row level security;

revoke all on public.profiles, public.wallets, public.skills, public.bookings, public.ledger_entries from anon, authenticated;
revoke all on function public.book_session, public.respond_booking, public.cancel_booking,
  public.confirm_session, public.dispute_booking from public, anon;

grant select on public.profiles to authenticated;
grant update (full_name, headline, bio, avatar_url) on public.profiles to authenticated;
grant select on public.wallets to authenticated;
grant select, insert, update, delete on public.skills to authenticated;
grant select on public.bookings to authenticated;
grant select on public.ledger_entries to authenticated;
grant execute on function public.book_session, public.respond_booking, public.cancel_booking,
  public.confirm_session, public.dispute_booking to authenticated;

create policy profiles_read on public.profiles for select to authenticated using (true);
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy wallets_read_own on public.wallets for select to authenticated using (user_id = auth.uid());

create policy skills_read on public.skills for select to authenticated using (active or owner_id = auth.uid());
create policy skills_insert_own on public.skills for insert to authenticated with check (owner_id = auth.uid());
create policy skills_update_own on public.skills for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy skills_delete_own on public.skills for delete to authenticated using (owner_id = auth.uid());

create policy bookings_read_participant on public.bookings for select to authenticated
  using (requester_id = auth.uid() or provider_id = auth.uid());

create policy ledger_read_own on public.ledger_entries for select to authenticated using (user_id = auth.uid());
