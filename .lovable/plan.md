# Skillora backend completion plan

Existing backend (already live, will not touch): profiles, user_roles, categories, worker_profiles (with privacy-safe approx location), worker_gallery, bookings, reviews, favorites, RLS on everything, Google + email auth, Google Maps connector, security triggers.

Delivered in phases so each ships working. UI is preserved — only new pages I add (chat, admin, reset-password, forgot-password) get new UI in the existing Skillora style.

## Phase 1 — Storage, uploads & password reset (this turn)

**Storage buckets** (created via tool, RLS on `storage.objects`):
- `avatars` (public) — profile photos
- `worker-gallery` (public) — showcase images
- `worker-docs` (private) — Aadhaar / ID (owner + admin read only)
- `review-photos` (public) — review images

**Wire uploads into existing UI:**
- Worker onboarding: profile photo + gallery + Aadhaar upload
- Customer dashboard: profile photo edit
- Worker profile view: show gallery from bucket

**Password reset:**
- `/forgot-password` route (email form → `resetPasswordForEmail`)
- `/reset-password` route (new password form → `updateUser`)
- Link from `/auth`

**Email verification:** enable via `configure_auth` (turn OFF auto-confirm so real verification emails send).

## Phase 2 — Realtime chat

- `conversations` (customer_id, worker_id, booking_id nullable) + `messages` (conversation_id, sender_id, body, image_url, read_at)
- RLS: only participants can read/write
- Realtime enabled on `messages`
- New route `/_authenticated/chat` + chat panel embedded on booking detail
- Header badge for unread count

## Phase 3 — Realtime notifications

- `notifications` (user_id, type, title, body, link, read_at)
- DB triggers create notifications on: booking created/accepted/rejected/completed, review received, new message
- Bell icon + dropdown in `Header`, realtime subscribed

## Phase 4 — Reviews with photo uploads

- Add `photos text[]` to `reviews` (already has field? verify)
- Upload UI on customer dashboard "Leave review" action after completed booking
- Store in `review-photos` bucket

## Phase 5 — Live GPS for workers

- `worker_locations` table (worker_id, lat, lng, updated_at, accuracy) — separate from static onboarding location
- Worker dashboard: "Share live location" toggle → `navigator.geolocation.watchPosition` → updates every 30s while online
- Customer browse: subscribe to nearby workers' realtime updates when map is open
- RLS: only approx location exposed publicly; precise for confirmed bookings

## Phase 6 — Phone/OTP verification

- Use Supabase phone auth (Twilio) — requires user's Twilio credentials
- OR fallback: email-OTP via Lovable managed email
- Verification badge on profile once confirmed
- Will ask for Twilio keys when we reach this phase

## Phase 7 — Admin panel

- New `/admin` routes gated by `has_role(admin)` beforeLoad
- Users list, worker verification queue (approve Aadhaar → set `is_verified`), bookings, reviews moderation, services CRUD, complaints, analytics widgets
- Server functions with `requireSupabaseAuth` + admin check for all writes

## Phase 8 — Razorpay payments

- `payments` table (booking_id, amount, method: cash/upi/razorpay, razorpay_order_id, razorpay_payment_id, status)
- Server route `/api/create-razorpay-order` (createServerFn)
- Public webhook `/api/public/webhooks/razorpay` (signature verified with HMAC)
- "Pay with UPI/Razorpay" or "Cash" toggle on booking completion
- Will ask for RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET when we start this phase

## What I need from you along the way

- **Phase 6:** Twilio Account SID + Auth Token + phone number (or approve email OTP fallback)
- **Phase 8:** Razorpay Key ID + Key Secret from dashboard.razorpay.com → Settings → API Keys

## Approval

Approve this plan and I'll ship Phase 1 immediately. Each subsequent phase I'll confirm before starting so you can reprioritize.
