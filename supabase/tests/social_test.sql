-- Runs after ledger_test.sql in the same database: Alice (a) booked Bob (b); that session is completed.
create function pg_temp.as_user(u uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', u::text, false); set role authenticated; end $$;
create function pg_temp.expect_error(q text, msg text) returns void language plpgsql as $$
begin
  begin execute q; exception when others then
    if sqlerrm like '%' || msg || '%' then return; end if;
    raise exception 'wanted error %, got: %', msg, sqlerrm;
  end;
  raise exception 'expected error % but query succeeded: %', msg, q;
end $$;
\set a '''00000000-0000-0000-0000-00000000000a'''
\set b '''00000000-0000-0000-0000-00000000000b'''
\set c '''00000000-0000-0000-0000-00000000000c'''

\echo == notifications were created by the earlier flow
do $$ begin
  assert exists (select 1 from notifications where user_id = '00000000-0000-0000-0000-00000000000b' and kind = 'booking_requested');
  assert exists (select 1 from notifications where user_id = '00000000-0000-0000-0000-00000000000a' and kind = 'booking_accepted');
  assert exists (select 1 from notifications where user_id = '00000000-0000-0000-0000-00000000000b' and kind = 'credits_earned' and title = 'You earned 1.5h');
  assert exists (select 1 from notifications where user_id = '00000000-0000-0000-0000-00000000000a' and kind = 'session_completed');
  assert exists (select 1 from notifications where user_id = '00000000-0000-0000-0000-00000000000a' and kind = 'booking_cancelled' and body like '%credits were returned%');
end $$;

\echo == notifications carry structured params for translation
do $$ declare n record; begin
  select * into n from notifications where kind = 'credits_earned';
  assert n.params ->> 'name' = 'Alice' and (n.params ->> 'credits')::numeric = 1.5, 'credits_earned params';
  select * into n from notifications where kind = 'booking_requested' and user_id = '00000000-0000-0000-0000-00000000000b' limit 1;
  assert n.params ->> 'name' = 'Alice' and (n.params ->> 'hours')::numeric = 1, 'booking_requested params';
  select * into n from notifications where kind = 'booking_cancelled' limit 1;
  assert (n.params ->> 'refund')::boolean is true, 'cancel params say credits were refunded';
end $$;

\echo == chat: participants talk, outsiders cannot read or write
select pg_temp.as_user(:a);
insert into messages (booking_id, sender_id, body) select id, auth.uid(), 'Hi Bob, thanks for the session!' from bookings where status = 'completed';
select pg_temp.expect_error($q$insert into messages (booking_id, sender_id, body) select id, '00000000-0000-0000-0000-00000000000b', 'fake' from bookings where status = 'completed'$q$, 'row-level security');
select pg_temp.expect_error($q$insert into messages (booking_id, sender_id, body) select id, auth.uid(), '   ' from bookings where status = 'completed'$q$, 'check constraint');
reset role;
select set_config('t.bid', (select id::text from bookings where status = 'completed'), false);
select pg_temp.as_user(:c);
do $$ begin
  assert (select count(*) from messages) = 0, 'outsider sees no messages';
end $$;
select pg_temp.expect_error($q$insert into messages (booking_id, sender_id, body) values (current_setting('t.bid')::uuid, auth.uid(), 'sneaky')$q$, 'row-level security');
reset role;
select pg_temp.as_user(:b);
do $$ begin
  assert (select count(*) from messages) = 1, 'Bob sees the message';
  assert (select body from notifications where kind = 'message' and user_id = auth.uid()) like 'Hi Bob%';
  assert (select params ->> 'snippet' from notifications where kind = 'message' and user_id = auth.uid()) like 'Hi Bob%', 'message snippet param';
end $$;
reset role;

\echo == reviews: only after completion, once per person, updates stats
select pg_temp.as_user(:c);
select pg_temp.expect_error($q$select submit_review(gen_random_uuid(), 5, 'x')$q$, 'booking_not_found');
reset role;
select pg_temp.as_user(:a);
select pg_temp.expect_error($q$select submit_review(id, 6, '') from bookings where status = 'completed'$q$, 'invalid_rating');
select submit_review(id, 5, 'Super helpful') from bookings where status = 'completed';
select pg_temp.expect_error($q$select submit_review(id, 4, '') from bookings where status = 'completed'$q$, 'already_reviewed');
select pg_temp.expect_error($q$insert into reviews (booking_id, reviewer_id, reviewee_id, rating) select id, auth.uid(), provider_id, 5 from bookings$q$, 'permission denied');
reset role;
select pg_temp.as_user(:b);
select submit_review(id, 4, 'Great learner') from bookings where status = 'completed';
do $$ begin
  assert (select count(*) from notifications where kind = 'review_received' and user_id = auth.uid()) = 1;
end $$;
reset role;
-- a session that is not completed cannot be reviewed
select pg_temp.as_user(:a);
select pg_temp.expect_error($q$select submit_review(id, 5, '') from bookings where status = 'cancelled' limit 1$q$, 'invalid_status');
reset role;

\echo == profile_stats and discover_skills
select pg_temp.as_user(:a);
do $$ declare s record; begin
  select * into s from profile_stats('00000000-0000-0000-0000-00000000000b');
  assert s.rating = 5.0 and s.review_count = 1, 'Bob: one 5-star review';
  assert s.sessions_completed = 1 and s.hours_given = 1 and s.people_helped = 1 and s.skills_count = 1, 'Bob stats';
end $$;
do $$ declare r record; begin
  select * into r from discover_skills(null, null);
  assert r.owner_name = 'Bob' and r.rating = 5.0, 'discover shows Bob with rating';
  assert (select count(*) from discover_skills('web', null)) = 1;
  assert (select count(*) from discover_skills('zzz', null)) = 0;
  assert (select count(*) from discover_skills(null, 'Design')) = 0;
end $$;
reset role;
select pg_temp.as_user(:b);
do $$ begin assert (select count(*) from discover_skills(null, null)) = 0, 'own skills are not listed'; end $$;
select pg_temp.expect_error($q$select mark_notifications_read(); update notifications set title = 'x'$q$, 'permission denied');
reset role;

\echo == mark_notifications_read only touches your own
select pg_temp.as_user(:b);
select mark_notifications_read();
do $$ begin assert not exists (select 1 from notifications where read_at is null), 'Bob: all read'; end $$;
reset role;
do $$ begin assert exists (select 1 from notifications where read_at is null and user_id = '00000000-0000-0000-0000-00000000000a'), 'Alice untouched'; end $$;

\echo == dispute freezes credits and notifies the other side
select pg_temp.as_user(:a);
insert into skills (id, owner_id, title, category, credits_per_hour)
  values ('33333333-3333-3333-3333-333333333333', auth.uid(), 'English tutoring', 'Languages', 1);
reset role;
select pg_temp.as_user(:b);
create temp table d1 as select * from book_session('33333333-3333-3333-3333-333333333333', now() + interval '9 days', 0.5);
do $$ begin assert (select balance from wallets) = 3.0, 'Bob: 3.5 - 0.5 held'; end $$;
reset role;
select pg_temp.as_user(:a);
select respond_booking((select id from d1), true);
reset role;
update bookings set starts_at = now() - interval '2 hours', ends_at = now() - interval '90 minutes' where id = (select id from d1);
select pg_temp.as_user(:b);
select dispute_booking((select id from d1));
select pg_temp.expect_error(format($q$select confirm_session(%L)$q$, (select id from d1)), 'invalid_status');
reset role;
do $$ begin
  assert (select status from bookings where id = (select id from d1)) = 'disputed';
  assert exists (select 1 from notifications where kind = 'booking_disputed' and user_id = '00000000-0000-0000-0000-00000000000a');
  assert (select balance from wallets where user_id = '00000000-0000-0000-0000-00000000000b') = 3.0, 'credits stay held';
  assert (select balance from wallets where user_id = '00000000-0000-0000-0000-00000000000a') = 0.5, 'provider not paid';
end $$;
\echo ALL SOCIAL TESTS PASSED
