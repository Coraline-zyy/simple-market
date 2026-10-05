# Password login / recovery setup

## Supabase Dashboard

Open **Authentication → Providers → Email** and confirm:

- **Enable Email provider** is on.
- **Allow new users to sign up** is on.
- Choose whether **Confirm email** is required. When enabled, new users must open the confirmation email before their first password login.

Open **Authentication → URL Configuration**.

Add these Redirect URLs while developing:

- `http://localhost:3000/**`

For production also add your real site, for example:

- `https://your-domain.com/**`

Make sure `NEXT_PUBLIC_SITE_URL` in `.env.local` points to the environment you are currently testing, or remove it during local testing so the app uses `window.location.origin`.

## New routes

- `/zh/forgot-password`
- `/en/forgot-password`
- `/zh/reset-password`
- `/en/reset-password`

## Existing Magic Link users

They can continue signing in by Magic Link. Once signed in, the home-page authentication box shows **Set / change password**, which lets them create a password for the same Supabase user account.

## No SQL migration required

Passwords and registration are managed by Supabase Auth and must not be stored in your public database tables.
