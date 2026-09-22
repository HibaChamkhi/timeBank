-- Profile limits, provider availability, blocking and reporting, and admin dispute review.

-- ---------------------------------------------------------------- profiles

alter table public.profiles
  add constraint profiles_name_len check (char_length(full_name) <= 80),
  add constraint profiles_headline_len check (char_length(headline) <= 80),
  add constraint profiles_bio_len check (char_length(bio) <= 500),
  add column utc_offset_min smallint not null default 0 check (utc_offset_min between -840 and 840),
  add column is_admin boolean not null default false;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ---------------------------------------------------------------- availability

-- Weekly windows in the provider's local wall time (weekday 0 = Sunday). Providers with no windows
-- are bookable at any time. `utc_offset_min` on the profile converts a booking instant to their local time.
create table public.availability (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_min smallint not null check (start_min between 0 and 1439),
  end_min smallint not null check (end_min between 1 and 1440),
  check (end_min > start_min),
  exclude using gist (user_id with =, weekday with =, int4range(start_min::int, end_min::int) with &&)
);

create function public.set_availability(p_windows jsonb, p_utc_offset_min int)
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); w jsonb;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if p_utc_offset_min is null or p_utc_offset_min not between -840 and 840
     or jsonb_typeof(p_windows) <> 'array' or jsonb_array_length(p_windows) > 40 then
    raise exception 'invalid_availability';
  end if;
  delete from public.availability where user_id = uid;
  for w in select * from jsonb_array_elements(p_windows) loop
    begin
      insert into public.availability (user_id, weekday, start_min, end_min)
      values (uid, (w ->> 'weekday')::int, (w ->> 'start_min')::int, (w ->> 'end_min')::int);
    exception when check_violation or exclusion_violation or not_null_violation
                 or invalid_text_representation or numeric_value_out_of_range then
      raise exception 'invalid_availability';
    end;
  end loop;
  update public.profiles set utc_offset_min = p_utc_offset_min where id = uid;
end $$;

-- ---------------------------------------------------------------- blocking and reporting

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id),
  target_id uuid not null references public.profiles (id),
  booking_id uuid references public.bookings (id),
  reason text not null check (reason in ('spam', 'harassment', 'no_show', 'unsafe', 'other')),
  details text not null default '' check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'reviewed')),
  created_at timestamptz not null default now(),
  check (reporter_id <> target_id)
);

create function public.is_blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.blocks where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a));
$$;

create function public.block_user(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if p_user is null or p_user = uid or not exists (select 1 from public.profiles where id = p_user) then raise exception 'invalid_target'; end if;
  insert into public.blocks (blocker_id, blocked_id) values (uid, p_user) on conflict do nothing;
end $$;

create function public.unblock_user(p_user uuid) returns void
language sql security definer set search_path = '' as $$
  delete from public.blocks where blocker_id = auth.uid() and blocked_id = p_user;
$$;

create function public.report_user(p_target uuid, p_reason text, p_details text default '', p_booking uuid default null) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if p_reason is null or p_reason not in ('spam', 'harassment', 'no_show', 'unsafe', 'other') then raise exception 'invalid_reason'; end if;
  if p_target is null or p_target = uid or not exists (select 1 from public.profiles where id = p_target) then raise exception 'invalid_target'; end if;
  insert into public.reports (reporter_id, target_id, booking_id, reason, details)
  values (uid, p_target, p_booking, p_reason, coalesce(left(p_details, 1000), ''));
end $$;

-- ---------------------------------------------------------------- admin review

create function public.admin_disputes()
returns table (booking_id uuid, skill_title text, requester_name text, provider_name text, hours numeric, credits numeric, starts_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
    select b.id, s.title, public.name_of(b.requester_id), public.name_of(b.provider_id), b.hours, b.credits, b.starts_at
    from public.bookings b join public.skills s on s.id = b.skill_id
    where b.status = 'disputed' order by b.updated_at;
end $$;

create function public.admin_reports()
returns table (report_id uuid, reporter_name text, target_id uuid, target_name text, reason text, details text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
    select r.id, public.name_of(r.reporter_id), r.target_id, public.name_of(r.target_id), r.reason, r.details, r.created_at
    from public.reports r where r.status = 'open' order by r.created_at;
end $$;

create function public.resolve_report(p_report_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update public.reports set status = 'reviewed' where id = p_report_id;
end $$;

-- 'refund' returns the credits to the requester; 'pay' pays the provider. Either way it is final.
create function public.resolve_dispute(p_booking_id uuid, p_outcome text)
returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare b public.bookings;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_outcome not in ('refund', 'pay') then raise exception 'invalid_outcome'; end if;
  select * into b from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'booking_not_found'; end if;
  if b.status <> 'disputed' then raise exception 'invalid_status'; end if;

  if p_outcome = 'refund' then
    update public.bookings set status = 'cancelled', updated_at = now() where id = b.id returning * into b;
    insert into public.ledger_entries (user_id, booking_id, kind, amount) values (b.requester_id, b.id, 'refund', b.credits);
  else
    update public.bookings set status = 'completed', updated_at = now(),
      requester_confirmed_at = coalesce(requester_confirmed_at, now()), provider_confirmed_at = coalesce(provider_confirmed_at, now())
      where id = b.id returning * into b;
    insert into public.ledger_entries (user_id, booking_id, kind, amount) values (b.provider_id, b.id, 'earn', b.credits);
  end if;
  perform public.notify(b.requester_id, 'dispute_resolved', 'Problem resolved', 'An admin reviewed the reported problem.', b.id,
    jsonb_build_object('outcome', p_outcome, 'role', 'requester', 'credits', b.credits));
  perform public.notify(b.provider_id, 'dispute_resolved', 'Problem resolved', 'An admin reviewed the reported problem.', b.id,
    jsonb_build_object('outcome', p_outcome, 'role', 'provider', 'credits', b.credits));
  return b;
end $$;

-- Resolving a dispute sends its own notifications, so the generic status-change ones are skipped.
create or replace function public.on_booking_update() returns trigger
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); other uuid;
begin
  if old.status = 'disputed' then return new; end if;
  if new.status is distinct from old.status then
    if new.status = 'accepted' then
      perform public.notify(new.requester_id, 'booking_accepted', 'Booking accepted',
        public.name_of(new.provider_id) || ' accepted your session.', new.id,
        jsonb_build_object('name', public.name_of(new.provider_id)));
    elsif new.status = 'cancelled' then
      other := case when actor = new.provider_id then new.requester_id else new.provider_id end;
      perform public.notify(other, 'booking_cancelled', 'Session cancelled',
        public.name_of(actor) || ' cancelled the session.' ||
        case when other = new.requester_id then ' Your credits were returned.' else '' end, new.id,
        jsonb_build_object('name', public.name_of(actor), 'refund', other = new.requester_id));
    elsif new.status = 'completed' then
      perform public.notify(new.provider_id, 'credits_earned', 'You earned ' || trim_scale(new.credits) || 'h',
        'Session with ' || public.name_of(new.requester_id) || ' is complete.', new.id,
        jsonb_build_object('name', public.name_of(new.requester_id), 'credits', new.credits));
      perform public.notify(new.requester_id, 'session_completed', 'Session complete',
        'How was it with ' || public.name_of(new.provider_id) || '? Leave a review.', new.id,
        jsonb_build_object('name', public.name_of(new.provider_id)));
    elsif new.status = 'disputed' then
      other := case when actor = new.provider_id then new.requester_id else new.provider_id end;
      perform public.notify(other, 'booking_disputed', 'Problem reported',
        public.name_of(actor) || ' reported a problem. Credits are on hold.', new.id,
        jsonb_build_object('name', public.name_of(actor)));
    end if;
  elsif new.status = 'accepted' then
    if new.requester_confirmed_at is distinct from old.requester_confirmed_at then
      perform public.notify(new.provider_id, 'confirm_needed', 'Confirm your session',
        public.name_of(new.requester_id) || ' confirmed it happened. Confirm to get paid.', new.id,
        jsonb_build_object('name', public.name_of(new.requester_id), 'role', 'provider'));
    elsif new.provider_confirmed_at is distinct from old.provider_confirmed_at then
      perform public.notify(new.requester_id, 'confirm_needed', 'Confirm your session',
        public.name_of(new.provider_id) || ' confirmed it happened. Confirm to complete it.', new.id,
        jsonb_build_object('name', public.name_of(new.provider_id), 'role', 'requester'));
    end if;
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------- booking, discovery and chat respect all of the above

create or replace function public.book_session(p_skill_id uuid, p_starts_at timestamptz, p_hours numeric)
returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  s public.skills;
  b public.bookings;
  cost numeric;
  off int;
  lstart timestamp;
  smin int;
  emin int;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if p_hours is null or p_hours <= 0 or p_hours > 8 or p_hours * 2 <> floor(p_hours * 2) then
    raise exception 'invalid_hours';
  end if;
  select * into s from public.skills where id = p_skill_id and active;
  -- A blocked pair looks the same as a missing skill, so blocking reveals nothing.
  if not found or public.is_blocked_between(uid, s.owner_id) then raise exception 'skill_not_found'; end if;
  if s.owner_id = uid then raise exception 'cannot_book_own_skill'; end if;
  if p_starts_at <= now() then raise exception 'start_in_past'; end if;

  if exists (select 1 from public.availability a where a.user_id = s.owner_id) then
    select utc_offset_min into off from public.profiles where id = s.owner_id;
    lstart := (p_starts_at at time zone 'UTC') + make_interval(mins => off);
    smin := extract(hour from lstart)::int * 60 + extract(minute from lstart)::int;
    emin := smin + (p_hours * 60)::int;
    if not exists (
      select 1 from public.availability a
      where a.user_id = s.owner_id and a.weekday = extract(dow from lstart)::int and a.start_min <= smin and a.end_min >= emin
    ) then
      raise exception 'outside_availability';
    end if;
  end if;

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

create or replace function public.discover_skills(p_query text default null, p_category text default null)
returns table (skill_id uuid, title text, category text, description text, credits_per_hour numeric,
               owner_id uuid, owner_name text, owner_headline text, rating numeric, review_count int, sessions_completed int)
language sql stable security definer set search_path = '' as $$
  select s.id, s.title, s.category, s.description, s.credits_per_hour, s.owner_id, p.full_name, p.headline,
         st.rating, st.review_count, st.sessions_completed
  from public.skills s
  join public.profiles p on p.id = s.owner_id
  cross join lateral public.profile_stats(s.owner_id) st
  where s.active
    and s.owner_id is distinct from auth.uid()
    and not public.is_blocked_between(auth.uid(), s.owner_id)
    and (p_category is null or s.category = p_category)
    and (p_query is null or btrim(p_query) = '' or
         s.title ilike '%' || btrim(p_query) || '%' or s.description ilike '%' || btrim(p_query) || '%'
         or p.full_name ilike '%' || btrim(p_query) || '%' or s.category ilike '%' || btrim(p_query) || '%')
  order by st.rating desc nulls last, st.review_count desc, s.created_at desc
  limit 100;
$$;

drop policy messages_send on public.messages;
create policy messages_send on public.messages for insert to authenticated with check (
  sender_id = auth.uid() and exists (
    select 1 from public.bookings b
    where b.id = booking_id and auth.uid() in (b.requester_id, b.provider_id)
      and not public.is_blocked_between(b.requester_id, b.provider_id)));

-- ---------------------------------------------------------------- privileges and RLS

alter table public.availability enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
revoke all on public.availability, public.blocks, public.reports from anon, authenticated;
grant select on public.availability to authenticated;
grant select on public.blocks to authenticated;
create policy availability_read on public.availability for select to authenticated using (true);
create policy blocks_read_own on public.blocks for select to authenticated using (blocker_id = auth.uid());

revoke all on function public.is_admin, public.is_blocked_between, public.set_availability, public.block_user, public.unblock_user,
  public.report_user, public.admin_disputes, public.admin_reports, public.resolve_report, public.resolve_dispute from public, anon;
grant execute on function public.is_admin, public.is_blocked_between, public.set_availability, public.block_user, public.unblock_user,
  public.report_user, public.admin_disputes, public.admin_reports, public.resolve_report, public.resolve_dispute to authenticated;
