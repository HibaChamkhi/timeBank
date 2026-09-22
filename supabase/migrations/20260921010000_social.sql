-- Chat, reviews, notifications, and read helpers (profile stats, discovery).

-- ---------------------------------------------------------------- messages

create table public.messages (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  sender_id uuid not null references public.profiles (id),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index messages_booking_idx on public.messages (booking_id, id);

-- ---------------------------------------------------------------- reviews

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id),
  reviewer_id uuid not null references public.profiles (id),
  reviewee_id uuid not null references public.profiles (id),
  rating smallint not null check (rating between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  unique (booking_id, reviewer_id),
  check (reviewer_id <> reviewee_id)
);
create index reviews_reviewee_idx on public.reviews (reviewee_id);

create function public.submit_review(p_booking_id uuid, p_rating int, p_comment text default '')
returns public.reviews
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); b public.bookings; r public.reviews;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  select * into b from public.bookings where id = p_booking_id;
  if not found then raise exception 'booking_not_found'; end if;
  if uid not in (b.requester_id, b.provider_id) then raise exception 'forbidden'; end if;
  if b.status <> 'completed' then raise exception 'invalid_status'; end if;
  if p_rating is null or p_rating not between 1 and 5 then raise exception 'invalid_rating'; end if;
  begin
    insert into public.reviews (booking_id, reviewer_id, reviewee_id, rating, comment)
    values (b.id, uid, case when uid = b.requester_id then b.provider_id else b.requester_id end, p_rating, coalesce(p_comment, ''))
    returning * into r;
  exception when unique_violation then
    raise exception 'already_reviewed';
  end;
  return r;
end $$;

-- ---------------------------------------------------------------- notifications

create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null default '',
  booking_id uuid references public.bookings (id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, id desc);

create function public.notify(p_user uuid, p_kind text, p_title text, p_body text, p_booking uuid)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, kind, title, body, booking_id) values (p_user, p_kind, p_title, p_body, p_booking);
$$;
revoke all on function public.notify from public, anon, authenticated;

create function public.name_of(p_user uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(nullif(full_name, ''), 'Someone') from public.profiles where id = p_user;
$$;
revoke all on function public.name_of from public, anon, authenticated;

create function public.on_booking_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.notify(new.provider_id, 'booking_requested', 'New session request',
    public.name_of(new.requester_id) || ' requested ' || trim_scale(new.hours) || 'h', new.id);
  return new;
end $$;
create trigger bookings_notify_insert after insert on public.bookings
  for each row execute function public.on_booking_insert();

create function public.on_booking_update() returns trigger
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); other uuid;
begin
  if new.status is distinct from old.status then
    if new.status = 'accepted' then
      perform public.notify(new.requester_id, 'booking_accepted', 'Booking accepted',
        public.name_of(new.provider_id) || ' accepted your session.', new.id);
    elsif new.status = 'cancelled' then
      other := case when actor = new.provider_id then new.requester_id else new.provider_id end;
      perform public.notify(other, 'booking_cancelled', 'Session cancelled',
        public.name_of(actor) || ' cancelled the session.' ||
        case when other = new.requester_id then ' Your credits were returned.' else '' end, new.id);
    elsif new.status = 'completed' then
      perform public.notify(new.provider_id, 'credits_earned', 'You earned ' || trim_scale(new.credits) || 'h',
        'Session with ' || public.name_of(new.requester_id) || ' is complete.', new.id);
      perform public.notify(new.requester_id, 'session_completed', 'Session complete',
        'How was it with ' || public.name_of(new.provider_id) || '? Leave a review.', new.id);
    elsif new.status = 'disputed' then
      other := case when actor = new.provider_id then new.requester_id else new.provider_id end;
      perform public.notify(other, 'booking_disputed', 'Problem reported',
        public.name_of(actor) || ' reported a problem. Credits are on hold.', new.id);
    end if;
  elsif new.status = 'accepted' then
    if new.requester_confirmed_at is distinct from old.requester_confirmed_at then
      perform public.notify(new.provider_id, 'confirm_needed', 'Confirm your session',
        public.name_of(new.requester_id) || ' confirmed it happened. Confirm to get paid.', new.id);
    elsif new.provider_confirmed_at is distinct from old.provider_confirmed_at then
      perform public.notify(new.requester_id, 'confirm_needed', 'Confirm your session',
        public.name_of(new.provider_id) || ' confirmed it happened. Confirm to complete it.', new.id);
    end if;
  end if;
  return new;
end $$;
create trigger bookings_notify_update after update on public.bookings
  for each row execute function public.on_booking_update();

create function public.on_message_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare b public.bookings;
begin
  select * into b from public.bookings where id = new.booking_id;
  perform public.notify(case when new.sender_id = b.provider_id then b.requester_id else b.provider_id end,
    'message', public.name_of(new.sender_id), left(new.body, 120), new.booking_id);
  return new;
end $$;
create trigger messages_notify after insert on public.messages
  for each row execute function public.on_message_insert();

create function public.on_review_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.notify(new.reviewee_id, 'review_received', 'New review',
    public.name_of(new.reviewer_id) || ' gave you ' || new.rating || ' stars.', new.booking_id);
  return new;
end $$;
create trigger reviews_notify after insert on public.reviews
  for each row execute function public.on_review_insert();

create function public.mark_notifications_read() returns void
language sql security definer set search_path = '' as $$
  update public.notifications set read_at = now() where user_id = auth.uid() and read_at is null;
$$;

-- ---------------------------------------------------------------- read helpers

create function public.profile_stats(p_user uuid)
returns table (rating numeric, review_count int, sessions_completed int, hours_given numeric, people_helped int, skills_count int)
language sql stable security definer set search_path = '' as $$
  select
    (select round(avg(r.rating)::numeric, 1) from public.reviews r where r.reviewee_id = p_user),
    (select count(*)::int from public.reviews r where r.reviewee_id = p_user),
    (select count(*)::int from public.bookings b where b.status = 'completed' and p_user in (b.provider_id, b.requester_id)),
    (select coalesce(sum(b.hours), 0) from public.bookings b where b.status = 'completed' and b.provider_id = p_user),
    (select count(distinct b.requester_id)::int from public.bookings b where b.status = 'completed' and b.provider_id = p_user),
    (select count(*)::int from public.skills s where s.owner_id = p_user and s.active);
$$;

create function public.discover_skills(p_query text default null, p_category text default null)
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
    and (p_category is null or s.category = p_category)
    and (p_query is null or btrim(p_query) = '' or
         s.title ilike '%' || btrim(p_query) || '%' or s.description ilike '%' || btrim(p_query) || '%'
         or p.full_name ilike '%' || btrim(p_query) || '%' or s.category ilike '%' || btrim(p_query) || '%')
  order by st.rating desc nulls last, st.review_count desc, s.created_at desc
  limit 100;
$$;

-- ---------------------------------------------------------------- privileges and RLS

alter table public.messages enable row level security;
alter table public.reviews enable row level security;
alter table public.notifications enable row level security;

revoke all on public.messages, public.reviews, public.notifications from anon, authenticated;
revoke all on function public.submit_review, public.mark_notifications_read, public.profile_stats, public.discover_skills
  from public, anon;
grant select, insert on public.messages to authenticated;
grant select on public.reviews to authenticated;
grant select on public.notifications to authenticated;
grant execute on function public.submit_review, public.mark_notifications_read, public.profile_stats, public.discover_skills
  to authenticated;

create policy messages_read on public.messages for select to authenticated using (
  exists (select 1 from public.bookings b where b.id = booking_id and auth.uid() in (b.requester_id, b.provider_id)));
create policy messages_send on public.messages for insert to authenticated with check (
  sender_id = auth.uid() and exists (select 1 from public.bookings b where b.id = booking_id and auth.uid() in (b.requester_id, b.provider_id)));
create policy reviews_read on public.reviews for select to authenticated using (true);
create policy notifications_read_own on public.notifications for select to authenticated using (user_id = auth.uid());
