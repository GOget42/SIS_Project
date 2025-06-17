# Supabase Functions

The project uses two Supabase Edge Functions for user management.

## create-user

Located at `supabase/functions/create-user`. It expects an authenticated request with an admin JWT and accepts a JSON body containing:

- `email`
- `password`
- `role` – `student`, `instructor` or `admin`
- `first_name` *(optional)*
- `last_name` *(optional)*

On success the function creates both an authentication record and a profile row in the corresponding table.

## delete-user

Located at `supabase/functions/delete-user`. It requires an admin JWT and expects a JSON body with `user_id` for the account to delete.

Both functions use the `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL` environment variables which are configured when deploying with the Supabase CLI.
