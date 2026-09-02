# Deployment

**Live at https://super-tic-tac-toe-kcyp.onrender.com**

Deployed to Render on 2026-09-03 from the committed `render.yaml`. Everything
below is a record of the setup; there are no outstanding steps.

---

## What is already done

Firebase project **`supertictactoe-745a1`** (display name "supertictactoe"), on
the free Spark plan, no billing attached:

| Item                        | State                                                            |
| --------------------------- | ---------------------------------------------------------------- |
| Web app registered          | Done — `1:502553446646:web:365812905e2136746bc4d7`               |
| Cloud Firestore `(default)` | Created, Native mode, `nam5`                                     |
| Security rules              | Deployed from `app/firestore.rules`                              |
| Composite indexes           | Deployed from `app/firestore.indexes.json`, both `READY`         |
| Runtime service account     | `ttt-server@supertictactoe-745a1.iam.gserviceaccount.com`        |
| Service-account roles       | `datastore.user` + `serviceusage.serviceUsageConsumer` only      |
| Key file                    | `~/.secrets/ttt-sa.json` — **outside the repo, never committed** |
| Local `app/.env`            | Written with the live web config (gitignored)                    |

Verified against this live project — not emulators — with two real Firebase
accounts: token verification, room create/join, realtime move sync, and results
plus recent history landing in live Firestore.

---

## Step 1 — Enable Google sign-in ✅ DONE

Enabled in the console on 2026-09-03 and **verified working**: signing in with a
real Google account lands in the lobby with the correct display name and avatar,
creates a room with a shareable code, and plays a game against the computer with
the forced-sub-board rule behaving correctly — all against live Firebase, no
emulators.

This step could not be automated: enabling a Google provider needs an OAuth 2.0
web client, and Google publishes no API to create one. The Identity Toolkit API
refuses with `INVALID_CONFIG : client_id cannot be empty`.

## Step 2 — Deploy the server ✅ DONE

Deployed as a Render **web service** on the free plan, from the committed
[`render.yaml`](../render.yaml) blueprint. One Node process serves the SPA and
runs the authoritative socket.io game server.

- Service: `super-tic-tac-toe` (`srv-dac7edv10e5c73fqs9b0`)
- URL: **https://super-tic-tac-toe-kcyp.onrender.com**
- Branch: `main`, auto-deploys on push

> **Render suffixed the hostname.** `render.yaml` asks for the service name
> `super-tic-tac-toe`, but `.onrender.com` hostnames are globally unique and that
> one was taken, so the URL came back as `super-tic-tac-toe-kcyp.onrender.com`.
> `CLIENT_ORIGIN` had to be corrected to match after the first deploy — the
> server rejects socket handshakes from any other origin.

## Step 3 — Authorise the deployed domain ✅ DONE

`super-tic-tac-toe-kcyp.onrender.com` was added to the Firebase authorised
domains via the Identity Toolkit API. Without it, Google sign-in fails with
`auth/unauthorized-domain`.

## Step 4 — Smoke-test production

1. Open the Render URL. The sign-in screen should render.
2. Sign in with Google.
3. **Create a game**, copy the code.
4. Open the same URL in a private window, sign in as a different Google account,
   join with the code.
5. Play a few moves — they should appear on both screens.
6. Refresh one tab mid-game; the board should come back.
7. Resign, then have both sides press **Rematch**.
8. Check the lobby shows the result under "Your record".

If sign-in fails with `auth/unauthorized-domain`, step 3 was missed.

---

## Notes

- **Render's free tier sleeps** after 15 minutes with no traffic. The first
  visitor after a quiet spell waits roughly a minute. A game in progress keeps
  itself awake through the socket heartbeat.
- **Games live in the server's memory.** A restart or a sleep drops games in
  progress. That is the correct trade for one free instance; a shared store
  would only be needed to run more than one.
- **Google Cloud Run was ruled out**: it needs an active billing account, and
  both trial billing accounts on this Google account are closed. It also spreads
  WebSocket clients across instances that do not share memory, which this
  architecture depends on.
- **A second project, `supertictactoe-745a1`, is the one in use.** The old
  AI Studio project `gen-lang-client-0977588738` (whose API key was hardcoded in
  the pre-v2 source) already has Google sign-in enabled, but it cannot get a
  `(default)` Firestore database without billing, so it was not used.
