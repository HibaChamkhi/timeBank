#!/bin/sh
# Two sessions try to spend the same 2 credits on two 1.5-credit bookings at once.
# Exactly one must succeed; the wallet must never go negative.
set -u
PSQL="psql -X -q -v ON_ERROR_STOP=0 -U postgres -d tb -At"
$PSQL <<'SQL'
insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000d1'), ('00000000-0000-0000-0000-0000000000d2');
insert into skills (id, owner_id, title, category, credits_per_hour)
  values ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-0000000000d2', 'Race skill', 'Technology', 1.5);
SQL
run() { # $1 = day offset
  $PSQL 2>&1 <<SQL | grep -E "insufficient_credits|BOOKED" | head -1
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d1', false);
set role authenticated;
begin;
select 'BOOKED' from book_session('22222222-2222-2222-2222-222222222222', now() + interval '$1 days', 1);
select pg_sleep(1.5);
commit;
SQL
}
run 10 > /tmp/r1.txt & run 20 > /tmp/r2.txt & wait
ok=$(cat /tmp/r1.txt /tmp/r2.txt | grep -c BOOKED)
fail=$(cat /tmp/r1.txt /tmp/r2.txt | grep -c insufficient_credits)
bal=$($PSQL -c "select balance from wallets where user_id='00000000-0000-0000-0000-0000000000d1'")
echo "succeeded=$ok rejected=$fail balance=$bal"
[ "$ok" = 1 ] && [ "$fail" = 1 ] && [ "$bal" = "0.50" ] && echo "CONCURRENCY TEST PASSED" || { echo "CONCURRENCY TEST FAILED"; exit 1; }
