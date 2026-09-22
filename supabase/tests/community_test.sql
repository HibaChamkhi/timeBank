-- Runs after social_test.sql. Users: a = Alice, b = Bob (has "Web dev help" at 1.5/h), c = Carol (2 credits).
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

\echo == profile editing: own fields only, with length limits
select pg_temp.as_user(:c);
update profiles set headline = 'Carpenter', bio = 'I fix things.' where id = auth.uid();
select pg_temp.expect_error($q$update profiles set bio = repeat('x', 501) where id = auth.uid()$q$, 'profiles_bio_len');
select pg_temp.expect_error($q$update profiles set is_admin = true where id = auth.uid()$q$, 'permission denied');
select pg_temp.expect_error($q$update profiles set utc_offset_min = 600 where id = auth.uid()$q$, 'permission denied');
do $$ begin
  update profiles set headline = 'Hacked' where id = '00000000-0000-0000-0000-00000000000b';
  assert (select headline from profiles where id = '00000000-0000-0000-0000-00000000000b') <> 'Hacked', 'cannot edit others';
end $$;
reset role;
do $$ begin assert (select headline from profiles where id = '00000000-0000-0000-0000-00000000000c') = 'Carpenter'; end $$;

\echo == availability: windows validated, bookings must fit inside them
select pg_temp.as_user(:b);
select pg_temp.expect_error($q$select set_availability('[{"weekday":1,"start_min":660,"end_min":780},{"weekday":1,"start_min":720,"end_min":840}]', 120)$q$, 'invalid_availability');
select pg_temp.expect_error($q$select set_availability('[{"weekday":9,"start_min":0,"end_min":60}]', 0)$q$, 'invalid_availability');
select pg_temp.expect_error($q$select set_availability('[{"weekday":1,"start_min":700,"end_min":650}]', 0)$q$, 'invalid_availability');
select pg_temp.expect_error($q$select set_availability('[]', 5000)$q$, 'invalid_availability');
-- Bob is at UTC+2 and free Mondays 11:00-13:00 his time.
select set_availability('[{"weekday":1,"start_min":660,"end_min":780}]', 120);
do $$ begin assert (select count(*) from availability where user_id = auth.uid()) = 1; end $$;
reset role;
-- next Monday, 10:00 UTC (= 12:00 in Bob's local time), always at least a week away
select set_config('t.monday', ((date_trunc('day', now() at time zone 'UTC') + ((1 - extract(dow from now() at time zone 'UTC')::int + 7) % 7 + 7) * interval '1 day' + interval '10 hours') at time zone 'UTC')::text, false);
select pg_temp.as_user(:c);
select pg_temp.expect_error($q$select book_session(id, current_setting('t.monday')::timestamptz + interval '90 minutes', 1) from skills where owner_id = '00000000-0000-0000-0000-00000000000b' and active$q$, 'outside_availability'); -- 13:30 local
select pg_temp.expect_error($q$select book_session(id, current_setting('t.monday')::timestamptz - interval '3 hours', 1) from skills where owner_id = '00000000-0000-0000-0000-00000000000b' and active$q$, 'outside_availability'); -- 09:00 local
select pg_temp.expect_error($q$select book_session(id, current_setting('t.monday')::timestamptz + interval '1 day', 1) from skills where owner_id = '00000000-0000-0000-0000-00000000000b' and active$q$, 'outside_availability'); -- Tuesday
select pg_temp.expect_error($q$select book_session(id, current_setting('t.monday')::timestamptz + interval '30 minutes', 2) from skills where owner_id = '00000000-0000-0000-0000-00000000000b' and active$q$, 'outside_availability'); -- would end after the window
select book_session(id, current_setting('t.monday')::timestamptz, 1) from skills where owner_id = '00000000-0000-0000-0000-00000000000b' and active; -- 12:00-13:00 local: fits
do $$ begin assert (select balance from wallets) = 0.5, 'Carol paid 1.5 for the fitting booking'; end $$;
reset role;

\echo == blocking: hidden from discovery, cannot book or chat, reversible, private
select set_config('t.bid', (select id::text from bookings where requester_id = '00000000-0000-0000-0000-00000000000c' and status = 'requested'), false);
select pg_temp.as_user(:c);
do $$ begin assert (select count(*) from discover_skills(null, null) where owner_id = '00000000-0000-0000-0000-00000000000b') > 0, 'visible before block'; end $$;
select pg_temp.expect_error($q$select block_user(auth.uid())$q$, 'invalid_target');
select block_user('00000000-0000-0000-0000-00000000000b');
select block_user('00000000-0000-0000-0000-00000000000b'); -- idempotent
do $$ begin
  assert (select count(*) from discover_skills(null, null) where owner_id = '00000000-0000-0000-0000-00000000000b') = 0, 'hidden from the blocker';
  assert (select count(*) from blocks) = 1;
end $$;
select pg_temp.expect_error($q$insert into messages (booking_id, sender_id, body) values (current_setting('t.bid')::uuid, auth.uid(), 'hello?')$q$, 'row-level security');
reset role;
select pg_temp.as_user(:b);
do $$ begin
  assert (select count(*) from discover_skills(null, null) where owner_id = '00000000-0000-0000-0000-00000000000c') = 0, 'hidden from the blocked person too';
  assert (select count(*) from blocks) = 0, 'the blocked person cannot see who blocked them';
end $$;
select pg_temp.expect_error($q$insert into messages (booking_id, sender_id, body) values (current_setting('t.bid')::uuid, auth.uid(), 'why?')$q$, 'row-level security');
reset role;
select pg_temp.as_user(:a);
do $$ begin assert (select count(*) from blocks) = 0, 'Alice sees no blocks'; end $$;
reset role;
select pg_temp.as_user(:c);
select unblock_user('00000000-0000-0000-0000-00000000000b');
insert into messages (booking_id, sender_id, body) values (current_setting('t.bid')::uuid, auth.uid(), 'back again');
do $$ begin assert (select count(*) from discover_skills(null, null) where owner_id = '00000000-0000-0000-0000-00000000000b') > 0, 'visible again'; end $$;
reset role;

\echo == a blocked pair cannot book each other
select pg_temp.as_user(:b);
select block_user('00000000-0000-0000-0000-00000000000a');
reset role;
select pg_temp.as_user(:a);
select pg_temp.expect_error($q$select book_session(id, now() + interval '30 days', 0.5) from skills where owner_id = '00000000-0000-0000-0000-00000000000b' and active$q$, 'skill_not_found');
reset role;
select pg_temp.as_user(:b);
select unblock_user('00000000-0000-0000-0000-00000000000a');
reset role;

\echo == reports: members can file them but never read them
select pg_temp.as_user(:c);
select report_user('00000000-0000-0000-0000-00000000000b', 'no_show', 'Did not turn up');
select pg_temp.expect_error($q$select report_user('00000000-0000-0000-0000-00000000000b', 'rude', '')$q$, 'invalid_reason');
select pg_temp.expect_error($q$select report_user(auth.uid(), 'spam', '')$q$, 'invalid_target');
select pg_temp.expect_error($q$select * from reports$q$, 'permission denied');
select pg_temp.expect_error($q$select * from admin_reports()$q$, 'forbidden');
reset role;

\echo == admin review: only admins, refund or pay, final, notifies both
select pg_temp.as_user(:b);
create temp table d2 as select * from book_session('33333333-3333-3333-3333-333333333333', now() + interval '11 days', 0.5);
reset role;
select pg_temp.as_user(:a);
select respond_booking((select id from d2), true);
reset role;
update bookings set starts_at = now() - interval '2 hours', ends_at = now() - interval '90 minutes' where id = (select id from d2);
select pg_temp.as_user(:b);
select dispute_booking((select id from d2));
select pg_temp.expect_error($q$select * from admin_disputes()$q$, 'forbidden');
select pg_temp.expect_error(format($q$select resolve_dispute(%L, 'pay')$q$, (select id from d2)), 'forbidden');
reset role;
select set_config('t.d1', (select id::text from bookings where status = 'disputed' and provider_id = '00000000-0000-0000-0000-00000000000a' and requester_id = '00000000-0000-0000-0000-00000000000b' order by created_at limit 1), false);
update profiles set is_admin = true where id = '00000000-0000-0000-0000-00000000000c';
select pg_temp.as_user(:c);
do $$ declare n int; begin
  select count(*) into n from admin_disputes();
  assert n = 2, 'two disputes waiting, got ' || n;
  assert (select count(*) from admin_reports()) = 1;
end $$;
select pg_temp.expect_error($q$select resolve_dispute(current_setting('t.d1')::uuid, 'maybe')$q$, 'invalid_outcome');
reset role;
do $$ begin
  create temp table before_w as select user_id, balance from wallets;
end $$;
select pg_temp.as_user(:c);
select resolve_dispute(current_setting('t.d1')::uuid, 'refund');  -- Bob gets credits back
select resolve_dispute((select id from d2), 'pay');                -- Alice is paid
select pg_temp.expect_error($q$select resolve_dispute(current_setting('t.d1')::uuid, 'pay')$q$, 'invalid_status');
select resolve_report((select report_id from admin_reports() limit 1));
do $$ begin assert (select count(*) from admin_reports()) = 0 and (select count(*) from admin_disputes()) = 0; end $$;
reset role;
do $$ begin
  assert (select status from bookings where id = current_setting('t.d1')::uuid) = 'cancelled';
  assert (select status from bookings where id = (select id from d2)) = 'completed';
  assert (select balance from wallets where user_id = '00000000-0000-0000-0000-00000000000b') - (select balance from before_w where user_id = '00000000-0000-0000-0000-00000000000b') = 0.5, 'refund of 0.5 to Bob';
  assert (select balance from wallets where user_id = '00000000-0000-0000-0000-00000000000a') - (select balance from before_w where user_id = '00000000-0000-0000-0000-00000000000a') = 0.5, 'Alice paid 0.5';
  assert (select count(*) from notifications where kind = 'dispute_resolved') = 4, 'both sides notified for both cases';
  assert not exists (select 1 from notifications where kind = 'booking_cancelled' and booking_id = current_setting('t.d1')::uuid), 'no generic cancel notice for resolved disputes';
end $$;

\echo == invariant: every wallet still equals the sum of its ledger
do $$ begin
  assert not exists (select 1 from wallets w where w.balance <> (select coalesce(sum(amount), 0) from ledger_entries l where l.user_id = w.user_id)), 'wallet != ledger sum';
end $$;
\echo ALL COMMUNITY TESTS PASSED
