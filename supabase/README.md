# TimeBank backend

## Set up a project
1. Create a project at supabase.com.
2. SQL Editor → run every file in `migrations/`, in filename order (there are three: schema and credits, chat/reviews/notifications, then notification parameters for translation).
3. Project Settings → API → copy the URL and `anon` key into `.env` (see `.env.example`).
4. Authentication → Providers → Email. For development, turn off "Confirm email" so sign-up signs you in straight away.

Without `.env` the app runs in demo mode with sample data and no accounts.

## How credits work
- Everyone starts with 2 credits (`welcome_grant`).
- `book_session` reserves the cost immediately (`hold`). It fails with `insufficient_credits` if the balance would go below 0.
- Declining or cancelling refunds the requester (`refund`). Once both people confirm, the provider is paid (`earn`).
- `ledger_entries` is append-only. `wallets.balance` is updated by a trigger and has `CHECK (balance >= 0)`, so two simultaneous bookings can't spend the same credits.
- The app can only read wallets/ledger and call the functions; it cannot write balances.

## Tests
Needs Docker. Runs the migration on a throwaway Postgres, including a concurrent double-spend check:

    ./supabase/run-tests.sh
