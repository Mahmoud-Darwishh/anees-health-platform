# Medplum Handover: Where We Are, What Is Done, What Is Next

Last updated: 2026-05-27

This file is the full plain-English status for your current Medplum + Anees platform setup.

## 1) Short Answer

- Yes, you can keep building UI locally on localhost.
- No, UI editing does not require creating a booking.
- Booking was only used to verify the backend sync path to Medplum.

## 2) Current Architecture

- Main app (Next.js): Vercel deployment and local dev.
- Medplum server: self-hosted on Hostinger VPS.
- Medplum app UI: self-hosted on VPS.
- Public domains:
  - https://medplum.aneeshealth.com (Medplum app)
  - https://api.medplum.aneeshealth.com (Medplum API)

## 3) What Was Completed

### VPS and Medplum

- Medplum built from source and running.
- Server health endpoint confirmed working.
- Public HTTPS routing configured and working for both subdomains.
- TLS certificates issued and active.
- reCAPTCHA issue handled (register no longer blocked by invalid key setup).
- Process persistence added using systemd services:
  - medplum-server.service
  - medplum-app.service

### Application Code (this repo)

- Added Medplum server-side client integration.
- Added patient helper methods for Medplum reads and upsert.
- Wired booking-create API route to upsert patient in Medplum.
- Build and type-check pass.

Files involved:

- src/lib/medplum/client.ts
- src/lib/medplum/config.ts
- src/lib/medplum/patients.ts
- src/app/api/bookings/create/route.ts
- package.json

## 4) What Works Right Now

- Local UI edits and preview work as usual with npm run dev.
- Production app can authenticate to Medplum when env vars are set correctly.
- New booking flow can sync patient data to Medplum (non-blocking if Medplum is down).

## 5) What Is Not Finished Yet

- Not all patient-related flows are synced to Medplum yet (only booking create path is wired).
- No dedicated test endpoint yet for quick Medplum connectivity checks.
- Migration baseline between existing local patient records and Medplum is still pending.

## 6) Required Action Now (Important)

The ClientApplication secret was exposed in chat history. Treat it as compromised.

Do this now:

1. Rotate Medplum ClientApplication secret.
2. Update Vercel env vars with the new secret.
3. Redeploy.

Required Vercel env vars:

- MEDPLUM_BASE_URL
- MEDPLUM_CLIENT_ID
- MEDPLUM_CLIENT_SECRET

Set them in all environments you use (Production, Preview, Development).

## 7) How To Work Day To Day (UI and coding)

For UI changes:

1. npm run dev
2. Open http://localhost:3000/en
3. Edit files and refresh browser

No booking required for pure UI/design changes.

## 8) How To Verify Medplum Integration

Choose one:

- Option A: Normal app flow (create a test booking)
- Option B: Trigger the API route directly (Postman/curl) to avoid UI clicking

Then verify:

1. Check deployment logs for warnings.
2. In Medplum UI, find patient by phone or identifier.
3. Confirm identifier system/value exists and data matches.

Expected identifier system used by code:

- https://anees.health/fhir/identifier/patient-code

## 9) Safe Failure Behavior

Booking creation is intentionally non-blocking for Medplum sync.

Meaning:

- Booking can still succeed if Medplum sync fails.
- Failures are logged as warnings so user experience is not broken.

## 10) Immediate Next Steps (Recommended Order)

1. Rotate Medplum secret and update Vercel env.
2. Redeploy and run one end-to-end sync test.
3. Add Medplum sync in patient register flow.
4. Add Medplum sync/lookup in payment webhook flow if needed.
5. Add dedicated health/test endpoint for Medplum connectivity.
6. Plan migration baseline for existing patients.

## 11) Quick Troubleshooting

If sync does not appear in Medplum:

1. Verify Vercel env values exist in the correct environment.
2. Confirm new deployment happened after env update.
3. Confirm api.medplum.aneeshealth.com is reachable.
4. Check Vercel function logs for booking create route.
5. Re-check client id/secret and rotate again if uncertain.

## 12) Notes For Future You

- Use localhost for UI work.
- Use API/integration tests for Medplum behavior.
- Keep Medplum secret server-side only.
- Never put Medplum secret in client code.
