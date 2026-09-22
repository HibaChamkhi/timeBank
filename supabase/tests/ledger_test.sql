-- Run as superuser; each block impersonates a member the way Supabase does.
create function pg_temp.as_user(u uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', u::text, false);
  set role authenticated;
end $$;
create function pg_temp.expect_error(q text, msg text) returns void language plpgsql as $$
begin
  begin execute q; exception when others then
    if sqlerrm like '%' || msg || '%' then return; end if;
    raise exception 'wanted error %, got: %', msg, sqlerrm;
  end;
  raise exception 'expected error % but query succeeded: %', msg, q;
end $$;

insert into auth.users (id, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', '{"full_name":"Alice"}'),
  ('00000000-0000-0000-0000-00000000000b', '{"full_name":"Bob"}');

\echo == signup grants 2h and creates profile + wallet
do $$ begin
  assert (select balance from wallets where user_id = '00000000-0000-0000-0000-00000000000a') = 2;
  assert (select full_name from profiles where id = '00000000-0000-0000-0000-00000000000b') = 'Bob';
end $$;

-- Bob offers a skill at 1.5 credits/hour
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into skills (id, owner_id, title, category, credits_per_hour)
  values ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-00000000000b', 'Web dev help', 'Technology', 1.5);
reset role;

\echo == booking holds credits and blocks overspending
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
create temp table t1 as select * from book_session('11111111-1111-1111-1111-111111111111', now() + interval '1 day', 1);
do $$ begin assert (select balance from wallets) = 0.5, 'hold should leave 0.5'; end $$;
select pg_temp.expect_error($q$select book_session('11111111-1111-1111-1111-111111111111', now() + interval '3 days', 1)$q$, 'insufficient_credits');

\echo == provider cannot be double-booked
reset role;
insert into auth.users (id) values ('00000000-0000-0000-0000-00000000000c');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.expect_error($q$select book_session('11111111-1111-1111-1111-111111111111', now() + interval '1 day' + interval '30 minutes', 1)$q$, 'time_slot_taken');
select pg_temp.expect_error($q$select book_session('11111111-1111-1111-1111-111111111111', now() - interval '1 day', 1)$q$, 'start_in_past');
select pg_temp.expect_error($q$select book_session('11111111-1111-1111-1111-111111111111', now() + interval '5 days', 0.3)$q$, 'invalid_hours');

\echo == cannot book own skill, cannot touch wallet or ledger directly
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect_error($q$select book_session('11111111-1111-1111-1111-111111111111', now() + interval '6 days', 1)$q$, 'cannot_book_own_skill');
select pg_temp.expect_error($q$update wallets set balance = 999$q$, 'permission denied');
select pg_temp.expect_error($q$insert into ledger_entries (user_id, kind, amount) values (auth.uid(), 'welcome_grant', 50)$q$, 'permission denied');
select pg_temp.expect_error($q$update profiles set id = id where false; update bookings set status = 'completed'$q$, 'permission denied');

\echo == decline refunds the requester
select respond_booking((select id from t1), false);
reset role;
do $$ begin assert (select balance from wallets where user_id = '00000000-0000-0000-0000-00000000000a') = 2, 'refund restores 2'; end $$;

\echo == full happy path: book, accept, both confirm, provider paid once
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
create temp table t2 as select * from book_session('11111111-1111-1111-1111-111111111111', now() + interval '2 days', 1);
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select respond_booking((select id from t2), true);
select pg_temp.expect_error(format($q$select confirm_session(%L)$q$, (select id from t2)), 'session_not_started');
reset role;
update bookings set starts_at = now() - interval '2 hours', ends_at = now() - interval '1 hour' where id = (select id from t2);
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select confirm_session((select id from t2));
select confirm_session((select id from t2));  -- idempotent
do $$ begin assert (select status from bookings where id = (select id from t2)) = 'accepted', 'one confirmation is not enough'; end $$;
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select confirm_session((select id from t2));
reset role;
do $$ begin
  assert (select status from bookings where id = (select id from t2)) = 'completed';
  assert (select balance from wallets where user_id = '00000000-0000-0000-0000-00000000000b') = 3.5, 'Bob: 2 grant + 1.5 earned';
  assert (select balance from wallets where user_id = '00000000-0000-0000-0000-00000000000a') = 0.5, 'Alice: 2 - 1.5';
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect_error(format($q$select cancel_booking(%L)$q$, (select id from t2)), 'invalid_status');
reset role;

\echo == privacy: members only see their own wallet and ledger
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
do $$ begin
  assert (select count(*) from wallets) = 1, 'only own wallet';
  assert (select count(*) from ledger_entries) = 1, 'only own ledger (welcome grant)';
  assert (select count(*) from bookings) = 0, 'not a participant';
end $$;
reset role;

\echo == ledger is append-only
select pg_temp.expect_error($q$update ledger_entries set amount = 100$q$, 'ledger_is_append_only');
select pg_temp.expect_error($q$delete from ledger_entries$q$, 'ledger_is_append_only');

\echo == invariant: every wallet equals the sum of its ledger
do $$ begin
  assert not exists (
    select 1 from wallets w
    where w.balance <> (select coalesce(sum(amount), 0) from ledger_entries l where l.user_id = w.user_id)
  ), 'wallet != ledger sum';
end $$;
\echo ALL LEDGER TESTS PASSED
