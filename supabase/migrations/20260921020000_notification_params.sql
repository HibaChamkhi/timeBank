-- Notifications keep an English title/body as a fallback, plus structured params so the app
-- can render them in the reader's language (English, French or Arabic).

alter table public.notifications add column params jsonb not null default '{}'::jsonb;

create function public.notify(p_user uuid, p_kind text, p_title text, p_body text, p_booking uuid, p_params jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, kind, title, body, booking_id, params)
  values (p_user, p_kind, p_title, p_body, p_booking, coalesce(p_params, '{}'::jsonb));
$$;
revoke all on function public.notify(uuid, text, text, text, uuid, jsonb) from public, anon, authenticated;

create or replace function public.on_booking_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.notify(new.provider_id, 'booking_requested', 'New session request',
    public.name_of(new.requester_id) || ' requested ' || trim_scale(new.hours) || 'h', new.id,
    jsonb_build_object('name', public.name_of(new.requester_id), 'hours', new.hours));
  return new;
end $$;

create or replace function public.on_booking_update() returns trigger
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); other uuid;
begin
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

create or replace function public.on_message_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare b public.bookings;
begin
  select * into b from public.bookings where id = new.booking_id;
  perform public.notify(case when new.sender_id = b.provider_id then b.requester_id else b.provider_id end,
    'message', public.name_of(new.sender_id), left(new.body, 120), new.booking_id,
    jsonb_build_object('name', public.name_of(new.sender_id), 'snippet', left(new.body, 120)));
  return new;
end $$;

create or replace function public.on_review_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.notify(new.reviewee_id, 'review_received', 'New review',
    public.name_of(new.reviewer_id) || ' gave you ' || new.rating || ' stars.', new.booking_id,
    jsonb_build_object('name', public.name_of(new.reviewer_id), 'rating', new.rating));
  return new;
end $$;

drop function public.notify(uuid, text, text, text, uuid);
