# Final marketplace setup

## 1. Replace the project
1. Stop the old server with `Ctrl + C`.
2. Rename your old `C:\Users\26046\simple-market` to `simple-market-backup`.
3. Extract this package and rename its folder to `simple-market`.
4. Copy only `.env.local` from the backup into the new project.
5. Run:
   ```bat
   cd C:\Users\26046\simple-market
   npm install
   npm run dev
   ```

## 2. Run the Supabase migration
Open Supabase Dashboard → SQL Editor and run:

`supabase/2026_marketplace_features.sql`

It adds:
- avatar / public username / display name profile fields
- image paths for services and demands
- `reports` complaints table and RLS
- `post-images` and `avatars` Storage buckets + policies

Do **not** replace your original base schema with this file; this is an additive migration.

For online/offline presence, last-seen time and message read receipts, also run:

`supabase/2026_presence_and_read_receipts.sql`

This additive migration creates `profiles.last_seen_at`, `messages.read_at`, the unread index, and the protected `mark_conversation_read` function.

For the redesigned public and personal profile pages, also run:

`supabase/2026_profile_layout_fields.sql`

It adds expertise, personal tags, and a joined-at date copied from the real Supabase Auth registration time.

## 3. Authentication redirect URLs
Supabase → Authentication → Providers → Email must have the Email provider and new-user sign-ups enabled.

Supabase → Authentication → URL Configuration should allow both local and production URLs, for example:
- `http://localhost:3000/**`
- `https://youqiuvip.com/**`

Set production Site URL to your production domain.

## 4. Complaint email
Complaints are always stored in `public.reports`. To also email the site owner automatically, configure a Resend account and add these to `.env.local` and to your hosting provider's environment variables:

```env
RESEND_API_KEY=re_...
REPORT_TO_EMAIL=your-admin-email@example.com
REPORT_FROM_EMAIL=Marketplace Reports <reports@your-verified-domain.com>
```

During Resend testing, `onboarding@resend.dev` can be used subject to Resend's current account restrictions. For production, verify your own sending domain.

After changing production environment variables, redeploy the site.

## 5. What is included
- Chinese / English UI
- Magic Link + password login + forgot/reset password
- Account Settings in footer (avatar, public username/ID, display name, bio, password, logout)
- Per-user disclaimer dismissal (another account on the same browser still gets the disclaimer)
- Up to 5 images per service/demand, 5 MB each
- Complaints/reports from posts, users and transaction pages
- Reports stored in Supabase and optionally emailed to the administrator
- Public user profile pages
- Full transaction page with preserved history, realtime chat, completion state and continued chat after completion
