# Deployment

The Firebase side is **already set up and verified**. What remains is choosing a
host and one Firebase console click that has no API.

---

## What is already done

Firebase project **`supertictactoe-745a1`** (display name "supertictactoe"), on
the free Spark plan, no billing attached:

| Item | State |
| --- | --- |
| Web app registered | Done — `1:502553446646:web:365812905e2136746bc4d7` |
| Cloud Firestore `(default)` | Created, Native mode, `nam5` |
| Security rules | Deployed from `app/firestore.rules` |
| Composite indexes | Deployed from `app/firestore.indexes.json`, both `READY` |
| Runtime service account | `ttt-server@supertictactoe-745a1.iam.gserviceaccount.com` |
| Service-account roles | `datastore.user` + `serviceusage.serviceUsageConsumer` only |
| Key file | `~/.secrets/ttt-sa.json` — **outside the repo, never committed** |
| Local `app/.env` | Written with the live web config (gitignored) |

Verified against this live project — not emulators — with two real Firebase
accounts: token verification, room create/join, realtime move sync, and results
plus recent history landing in live Firestore.

---

## Step 1 — Enable Google sign-in (console only, ~30 seconds)

This is the one thing that cannot be automated. Enabling a Google provider
requires an OAuth 2.0 web client, and Google publishes **no API** to create one
— it is a console-only operation. The Identity Toolkit API rejects the request
with `INVALID_CONFIG : client_id cannot be empty`.

1. Open <https://console.firebase.google.com/project/supertictactoe-745a1/authentication/providers>
2. Click **Google** → toggle **Enable**
3. Pick a support email → **Save**

Firebase auto-creates the OAuth client and its redirect URIs. Nothing else to configure.

## Step 2 — Deploy the server

The app is a single Node process (Express serves the SPA *and* runs the
authoritative socket.io game server), so it needs a host that keeps a process
alive. Serverless platforms do not work here: game state lives in that process's
memory, and socket.io needs a persistent connection.

**Render** is the recommended host — it is the only platform with a genuinely
free tier that supports persistent WebSockets and does not ask for a credit card.
[`render.yaml`](../render.yaml) is committed, so Render configures itself.

1. Sign up at <https://render.com> with GitHub (free, no card).
2. **New → Blueprint**, pick `hammadshakeelai/Game-Database-Project`.
   Render reads `render.yaml` and proposes the service.
3. Set the environment variables below, then **Apply**.

### Environment variables to paste into Render

These are the live values for this project. The `VITE_*` values are public
identifiers that ship in the browser bundle by design.

```
VITE_FIREBASE_API_KEY=AIzaSyAcvBOYkq4bX03GkKQzY6FMsHD1dZF5X00
VITE_FIREBASE_AUTH_DOMAIN=supertictactoe-745a1.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=supertictactoe-745a1
VITE_FIREBASE_STORAGE_BUCKET=supertictactoe-745a1.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=502553446646
VITE_FIREBASE_APP_ID=1:502553446646:web:365812905e2136746bc4d7
```

Plus two more:

- **`FIREBASE_SERVICE_ACCOUNT`** — a real secret. Paste the entire contents of
  `~/.secrets/ttt-sa.json` **as one line**. Get it with:

  ```bash
  node -e "console.log(JSON.stringify(require(require('os').homedir()+'/.secrets/ttt-sa.json')))"
  ```

- **`CLIENT_ORIGIN`** — your Render URL, e.g. `https://super-tic-tac-toe.onrender.com`.
  You will only know this after the first deploy, so set it then and redeploy.
  The server **refuses to start** without it in production; that is deliberate,
  so the CORS allowlist can never silently become a wildcard.

## Step 3 — Authorise the deployed domain

Google sign-in rejects any domain not on the allowlist, so the first deploy will
fail sign-in until you do this.

1. Open <https://console.firebase.google.com/project/supertictactoe-745a1/authentication/settings>
2. **Authorised domains → Add domain** → your Render hostname
   (e.g. `super-tic-tac-toe.onrender.com`, no scheme)

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
