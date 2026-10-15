# Duels.ink API Reference

Programmatic access to your own match history, replays and game logs, Sign in with duels.ink for third-party sites that read a player’s data on their behalf, private-table creation for community leagues and tournaments, draft pods from Cubecana cubes or cube lists, deck-builder import links for deck sites and bots, and the anonymous community aggregates behind the stats pages — ink-pair matchups and Coconut card usage — for analytics scripts, notebooks and AI agents.

This document is the canonical, machine-readable API reference, served at `GET https://duels.ink/api-docs.md` (no authentication). A styled version for humans lives at https://duels.ink/api-docs.

## Conventions

- Base URL: your deployment origin (e.g. https://duels.ink). All paths below are relative to it.
- All JSON responses use snake_case field names in export rows and camelCase in token-management responses (each endpoint documents its exact shape).
- All timestamps are ISO 8601 strings in UTC.
- IDs (game, replay, token) are opaque strings — treat them as stable identifiers, never parse them.
- A machine-readable Markdown version of this page is served at GET /api-docs.md (no authentication required).

## Authentication

Every personal endpoint authenticates the caller and only ever returns that caller’s own data. Two mechanisms are accepted:

### API token (recommended for scripts and agents)

Send the token in the Authorization header on every request. Tokens are minted on the account page (https://duels.ink/account → API Tokens) or via POST /api/me/api-tokens from a logged-in browser session; a registered third-party app gets a scoped token for a user through Sign in with duels.ink instead (see that section). The raw token is a 96-character hex string shown exactly once at creation — only its SHA-256 hash is stored server-side, so a lost token cannot be recovered, only replaced.

```
Authorization: Bearer <your-token>
```

### Browser session cookie

Same-origin requests from the site itself authenticate with the session cookie. Cross-origin requests carrying only a cookie are rejected with 403 — a cross-origin caller must present a Bearer token. Scripts should always use a token.

### Token rules

- Tokens are scoped to your account and are read-only with one exception: GET, HEAD and OPTIONS requests are allowed everywhere, plus the two POST manifest endpoints (/api/me/bulk-replays, /api/me/bulk-gamelogs — side-effect-free reads) and POST /api/table/create (the private-table orchestration surface, see Private tables).
- Any other write with a token is denied — tokens cannot play games, act in a table lobby, edit decks, or mint/revoke other tokens. Token management (POST/DELETE /api/me/api-tokens) requires a browser session.
- Scoped tokens — the ones issued to third-party apps through Sign in with duels.ink — are narrower still: they reach ONLY the routes of their scopes (always GET /api/me; GET /api/me/match-history with match_history:read; the two bulk manifest POSTs with replays:read) and never POST /api/table/create. Any other route treats a scoped token as if no token were sent, so authenticated routes answer 401. Personal tokens minted on the account page have no scopes and keep the rules above.
- A token expires at its optional expiry date (1–365 days) and stops validating immediately once revoked.
- You can hold at most 10 active tokens. Each successful use updates the token’s last-used timestamp and usage counters.

## Rate limits

Every endpoint enforces a per-user fixed-window rate limit (per-IP when unauthenticated), and the heavier ones also cap concurrent in-flight requests. Both denials return HTTP 429 with a JSON body.

Rate-limit denial:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 42
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1754560000

{"error": "Too many match-history exports.", "retryAfterSeconds": 42}
```

Concurrency-cap denial:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 1
X-Concurrency-Limit: 3

{"error": "Too many concurrent match-history exports for this account.", "concurrencyLimit": 3}
```

- On 429, wait the number of seconds in the Retry-After header (or retryAfterSeconds in the body) before retrying.
- Paginate sequentially. The per-endpoint limits are sized so a sequential loop never hits them.
- Concurrency-cap responses (X-Concurrency-Limit header present) mean too many simultaneous requests — reduce parallelism rather than backing off longer.

## API tokens

Identify the caller (GET /api/me) and manage the Bearer tokens themselves. Listing works with a token; minting and revoking are account-level writes and therefore require a logged-in browser session — a user token cannot create or destroy tokens.

### GET /api/me — Who am I

Identify the account behind the current credentials, plus metadata about the token itself. This is how an integration ties a token to a Duels.ink account: store id (stable, never changes) as the link key — never the name, which the player can change. Works with any token, including scoped tokens issued to apps (the profile scope every app token carries grants exactly this endpoint).

- **Authentication:** Bearer token or session cookie

**Response**

JSON object with the account’s id, public display name and avatar, and token — details of the Bearer token used (null when the call authenticated with a session cookie). The account’s email address is never returned.

```json
{
  "id": "u_0190…",
  "name": "Ashe",
  "image": "https://…/avatar.png",
  "token": {
    "id": "0199c4d1-…",
    "scopes": ["profile", "match_history:read"],
    "clientId": "dapp_3f9c…",
    "expiresAt": "2026-12-30T12:00:00.000Z"
  }
}
```

**Stable response fields**

| Field | Type | Description |
|---|---|---|
| `id` | string | The user id — stable for the life of the account. Use it as the key when linking a token to a user in your system. The same value appears as your_user_id in match-history rows. |
| `name` | string | The player’s public display name, as shown on the site. Can change; refresh it rather than keying on it. |
| `image` | string \| null | Avatar URL, or null. |
| `token` | object \| null | null when authenticated by session cookie. Otherwise the token’s id, its scopes (null for a personal token), clientId (the app it was issued to, null for a personal token) and expiresAt (null = never expires). |

**Example**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://duels.ink/api/me"
```

**Endpoint-specific errors**

- `401` — No valid token or session — missing, expired or revoked token (for an app: the user disconnected it, see Sign in with duels.ink).
- `403` — Cross-origin request authenticated only by a session cookie. Send a Bearer token.

### GET /api/me/api-tokens — List tokens

List your active API tokens. Raw token values are never returned — only metadata.

- **Authentication:** Bearer token or session cookie

**Response**

JSON object with a tokens array, ordered by creation time.

```json
{
  "tokens": [
    {
      "id": "01890b2e-…",
      "name": "analytics-notebook",
      "role": "user",
      "lastUsedAt": "2026-08-06T21:14:03.000Z",
      "createdAt": "2026-05-14T09:30:00.000Z",
      "expiresAt": "2026-08-12T09:30:00.000Z",
      "scopes": null,
      "oauthClient": null
    },
    {
      "id": "0199c4d1-…",
      "name": "Team Stats",
      "role": "user",
      "lastUsedAt": "2026-10-09T18:02:44.000Z",
      "createdAt": "2026-10-01T12:00:00.000Z",
      "expiresAt": "2026-12-30T12:00:00.000Z",
      "scopes": ["profile", "match_history:read"],
      "oauthClient": { "clientId": "dapp_3f9c…", "name": "Team Stats", "homepageUrl": "https://stats.example.com" }
    }
  ]
}
```

**Stable response fields**

| Field | Type | Description |
|---|---|---|
| `scopes` | string[] \| null | null for a personal token (full read-only access, see Token rules). An array for a token issued to an app through Sign in with duels.ink — it only reaches the routes of these scopes. |
| `oauthClient` | {clientId, name, homepageUrl} \| null | The app the token was issued to, or null for a personal token. Revoking an app-issued token (DELETE below) disconnects that app. |

**Example**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://duels.ink/api/me/api-tokens"
```

### POST /api/me/api-tokens — Create a token

Mint a new Bearer token. The raw token appears only in this response — store it immediately; only its SHA-256 hash is kept server-side.

- **Authentication:** Browser session only (tokens cannot write here)

- **Rate limit:** 6 creations / 60 s per user

**Request body (JSON)**

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `name` | string | yes | — | Token label, 1–64 characters. |
| `expiresInDays` | number | no | — | Optional expiry in days, 1–365. Omit for a non-expiring token. |

**Response**

JSON object with success: true and the new token, including its one-time rawToken.

```json
{
  "success": true,
  "token": {
    "id": "01890b2e-…",
    "name": "analytics-notebook",
    "rawToken": "f3a1…(96 hex chars)",
    "createdAt": "2026-08-07T10:00:00.000Z",
    "expiresAt": "2026-11-05T10:00:00.000Z"
  }
}
```

**Example**

```bash
# Requires a browser session (cookie) — an API token cannot mint tokens.
# Easiest: use the account page UI. From a script with an exported cookie:
curl -X POST "https://duels.ink/api/me/api-tokens" \
  -H "Content-Type: application/json" \
  -b "$SESSION_COOKIE" \
  -d '{"name":"analytics-notebook","expiresInDays":90}'
```

**Endpoint-specific errors**

- `400` — Missing/empty name, name over 64 chars, or expiresInDays outside 1–365.
- `409` — You already hold 10 tokens — revoke one first.

> Calling this with a Bearer token fails with 401: user tokens are read-only, so the write is denied and no session cookie is present to fall back on.

### DELETE /api/me/api-tokens — Revoke a token

Revoke a token by id. It stops validating immediately. Cannot be undone. Only tokens belonging to the caller can be revoked.

- **Authentication:** Browser session only (tokens cannot write here)

**Request body (JSON)**

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | string | yes | — | Id of one of your tokens (from the list endpoint or the account page). |

**Response**

JSON object: {"success": true}.

**Example**

```bash
# Requires a browser session (cookie), same as token creation.
curl -X DELETE "https://duels.ink/api/me/api-tokens" \
  -H "Content-Type: application/json" \
  -b "$SESSION_COOKIE" \
  -d '{"id":"<token-id>"}'
```

## Sign in with duels.ink (OAuth apps)

Let the players of your site link their Duels.ink account in one click, and get back a scoped, read-only token your server can use for them — no copy-pasting tokens. This is a standard OAuth 2.0 authorization-code flow with PKCE (OAuth 2.1 style): you send the player to a Duels.ink consent page, they click Approve, you receive a short-lived code on your callback, and your server exchanges it for a Bearer token. Register your app yourself at https://duels.ink/developers, test it right away with your own account, and other players can authorize it once Duels.ink has approved it. The token works on the same endpoints documented here, limited to the scopes the player approved.

### OAuth app or personal token?

Use a personal token (account page → API Tokens) for your own scripts, notebooks and agents reading your own data. Use an OAuth app when a site or bot acts for OTHER players — a team-stats site, a league tracker, a coaching tool — so each player approves your app on Duels.ink and can disconnect it at any time, and you never handle their credentials.

- App tokens are narrower than personal tokens: read-only, limited to their scopes, and never able to create tables (see Token rules).
- Apps are confidential server apps: the token exchange needs your client secret, so the flow requires a backend. Browser-only (SPA) and mobile apps without a server are not supported.

### Registering your app

Registration is self-serve: sign in and open https://duels.ink/developers → Register an app. You get the credentials immediately and can test the whole flow with your own Duels.ink account; other players can authorize the app once Duels.ink has reviewed and approved it. You provide:

- App name (shown to players on the consent screen, 1–64 characters) and a short description (max 280 characters). Names that impersonate the site are refused — anything containing "duels.ink", "duels ink" or "duelsink", or exactly "duels" or "official".
- Homepage URL.
- Redirect URIs — the exact callback URL(s) of your server, 1 to 10. They must be https://, except http://localhost[:port] and http://127.0.0.1[:port] for development. No #fragment. Matching is exact: scheme, host, port, path and query must be identical to what you send later.
- The scopes you need (see Scopes; profile is always included), and the longest token lifetime you allow (1–365 days, default 90).
- You receive a client_id (dapp_…, public) and a client_secret (dsec_…) — the secret is shown exactly once. Keep it on your server. If it leaks, rotate it on /developers: the old secret stops working immediately (tokens already issued keep working).
- Up to 5 apps per account, and registrations are rate-limited. You can edit or delete your apps on /developers at any time; deleting an app revokes every token it issued.

### Review status

Every self-registered app starts as pending. Duels.ink checks that the name does not impersonate anyone, the homepage is real, the redirect hosts belong to that homepage or developer and the scopes are justified, then approves or rejects it. The decision and any note from the reviewer appear on /developers.

- pending — only you (the owner) can authorize the app, so you can build and test your integration end to end. The consent page shows you an "Unreviewed — only you can authorize this app" banner. Any other player is stopped on the Duels.ink page with unauthorized_client ("This app is awaiting review by duels.ink.") and is not redirected back to you.
- approved — anyone can authorize the app.
- rejected — as pending (owner only). Read the reviewer’s note, fix the app and save it: editing a rejected app resubmits it as pending.
- Re-review: on an approved app, renaming it or adding a scope it did not have before puts it back to pending, because what players see on the consent screen changed. Tokens already issued keep working, but new players cannot authorize until it is re-approved. Changing the description, homepage, redirect URIs or maximum token lifetime, or removing scopes, applies immediately with no review. /developers warns you before you save a change that triggers re-review.
- Review status never revokes tokens. Only a suspension by the Duels.ink admin (disabled) does — see Token lifetime.

### The flow, step by step

Five steps. Steps 1, 3 and 4 run on your server; step 2 happens in the player’s browser on Duels.ink.

- 1. Start: generate a random code_verifier (43–128 characters from A-Z a-z 0-9 - . _ ~; 32 random bytes in base64url gives 43) and a random state (8–512 characters). Compute code_challenge = base64url(SHA-256(code_verifier)) without padding. Store verifier + state server-side, tied to the player’s session on your site.
- 2. Redirect the player to https://duels.ink/oauth/authorize with response_type=code, client_id, redirect_uri, scope, state, code_challenge, code_challenge_method=S256 and optionally expires_in_days (every parameter is listed under GET /oauth/authorize below). The player signs in to Duels.ink if needed, sees your app’s name, description, homepage, the requested scopes, the token lifetime and the host they will be sent back to, and clicks Approve or Cancel.
- 3. Handle the callback: Duels.ink redirects to your redirect_uri with ?code=…&state=… on approval, or ?error=access_denied&state=… on cancel (other error codes: see Errors). FIRST check that state equals the one you stored for this session — if not, stop. Then treat error=access_denied as “the player said no”, not as a failure.
- 4. Exchange the code at POST https://duels.ink/api/oauth/token within 60 seconds, from your server, with grant_type=authorization_code, the code, the same redirect_uri, your code_verifier and your client credentials. The response carries access_token, expires_in (seconds), the granted scope and user {id, name}.
- 5. Store the access token server-side (encrypted at rest if you can), keyed by user.id — the stable Duels.ink user id. Call the API with Authorization: Bearer <access_token> from your server. GET /api/me returns the same id at any time.

### Scopes

Pass scopes in the scope parameter, space-separated. Omitting it requests profile match_history:read (limited to what your app is registered for). Requesting a scope your app is not registered for, or an unknown scope, fails with invalid_scope. The scope field of the token response lists what was actually granted.

- profile — always granted to every app token, even if not requested: GET /api/me (stable user id, display name, avatar).
- match_history:read — GET /api/me/match-history (the player’s finished games, every format and filter).
- replays:read — POST /api/me/bulk-replays and POST /api/me/bulk-gamelogs (download manifests for the player’s replays and own-perspective game logs). Replay URLs (/r/{replay_id}) and CDN links download without any token. The /g/{game_id} fallback that bulk-gamelogs returns when no CDN copy exists is also covered by this scope (GET, your own games only).
- No scope grants any write. A scoped token calling a route outside its scopes is treated as unauthenticated (401).

### Token lifetime, re-linking and revocation

An app token lives expires_in_days days (1–365; default and maximum = your app’s registered limit, 90 unless agreed otherwise). The token response gives the lifetime in seconds as expires_in.

- There are NO refresh tokens. When a token expires — or before it does — send the player through /oauth/authorize again; with an existing Duels.ink session it is one click on Approve.
- One token per player per app: approving again replaces the previous token for your app, which stops working at once. Always overwrite the stored token with the newest one.
- Players see your app under Connected apps on their account page and can Disconnect it at any time. From then on every call with that token answers 401.
- Handle a 401 on a stored token (expired, disconnected, or replaced by a newer link) by marking the link as broken and asking the player to link again. Do not retry it in a loop.
- If your app is suspended (disabled) by the Duels.ink admin, all of its tokens stop working (401) until it is re-enabled. A pending or rejected review status does not affect tokens already issued.

### Errors

Errors in the flow use the OAuth shape {"error": "<code>", "error_description": "<human-readable detail>"} — as JSON from the token endpoint, as query parameters (error, error_description, state) on your redirect_uri. If the client_id is unknown or disabled, the redirect_uri does not exactly match a registered one, or the app is not approved yet and the player is not its owner (unauthorized_client), Duels.ink shows the error on its own page and never redirects — nothing reaches your callback.

- unauthorized_client (Duels.ink page, never redirected) — the app is pending or rejected and the player is not its owner. Only you can authorize it until it is approved (see Review status).
- access_denied (callback) — the player clicked Cancel. Show a neutral message and a way to try again.
- invalid_scope (callback) — an unknown scope, or one your app is not registered for.
- invalid_request (callback 400 / token 400) — a missing or malformed parameter: no state or state outside 8–512 characters, no code_challenge, code_challenge_method other than S256, expires_in_days outside 1–365, code_verifier outside 43–128 characters…
- unsupported_response_type (callback) — response_type is not code.
- invalid_client (token, 401) — unknown or disabled client_id, or wrong client_secret.
- invalid_grant (token, 400) — the code is unknown, expired (60 s), already used, issued to another app, the redirect_uri differs from the one sent to /oauth/authorize, or the code_verifier does not match the code_challenge. Start the flow again. Presenting an already-used code also revokes the token that code issued.
- unsupported_grant_type (token, 400) — grant_type is not authorization_code.
- slow_down (token, 429) — more than 30 token requests a minute for one client_id from one IP; wait for Retry-After.

### Security checklist for integrators

The flow is only as safe as the app implementing it.

- Keep client_secret on your server only — never in client-side JavaScript, a mobile app bundle or a public repository.
- Never send the access token to a browser. Your frontend talks to your server; your server talks to Duels.ink.
- Generate a fresh state and code_verifier for every attempt, bind them to the player’s session on your site, check state on the callback before anything else, and use each pair once.
- Register and send redirect_uri byte-for-byte identical — no trailing-slash or query-string variations.
- Exchange the code immediately (it expires after 60 s and is single-use), and log neither codes nor tokens.
- Key accounts on user.id from the token response (or GET /api/me), not on the display name.

### Complete example (Node.js / TypeScript, no framework)

A minimal server with the two handlers: /link/duels starts the flow, /link/duels/callback finishes it. Uses only node:http, node:crypto and the global fetch (Node 18+). Replace the in-memory maps and currentUserId() with your own session store, database and login.

```
import { createServer } from 'node:http'
import { createHash, randomBytes } from 'node:crypto'

const DUELS = 'https://duels.ink'
const CLIENT_ID = process.env.DUELS_CLIENT_ID!         // dapp_…
const CLIENT_SECRET = process.env.DUELS_CLIENT_SECRET! // dsec_… — server only
const REDIRECT_URI = 'https://stats.example.com/link/duels/callback' // exactly as registered

// state -> pending attempt. Use your session store in production.
const pending = new Map<string, { verifier: string; appUserId: string; createdAt: number }>()
// your user -> Duels.ink link. Use your database in production.
const links = new Map<string, { duelsUserId: string; name: string; token: string; expiresAt: number }>()

// Your own login (Discord SSO, …) decides who the player is on YOUR site.
function currentUserId(req: import('node:http').IncomingMessage): string | null {
  return req.headers['x-demo-user']?.toString() ?? null
}

function startUrl(appUserId: string): string {
  const verifier = randomBytes(32).toString('base64url') // 43 chars
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  const state = randomBytes(24).toString('base64url')
  pending.set(state, { verifier, appUserId, createdAt: Date.now() })

  const url = new URL('/oauth/authorize', DUELS)
  url.search = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'profile match_history:read',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  }).toString()
  return url.toString()
}

async function finish(query: URLSearchParams, appUserId: string): Promise<string> {
  // 1. state first: unknown, reused, stale or someone else's -> stop.
  const state = query.get('state') ?? ''
  const attempt = pending.get(state)
  pending.delete(state)
  if (!attempt || attempt.appUserId !== appUserId || Date.now() - attempt.createdAt > 10 * 60_000) {
    throw new Error('invalid state')
  }

  // 2. The player may have said no.
  const error = query.get('error')
  if (error === 'access_denied') return 'Linking cancelled.'
  if (error) throw new Error('authorize failed: ' + error + ' ' + (query.get('error_description') ?? ''))

  // 3. Exchange the code (valid 60 s, single use).
  const res = await fetch(DUELS + '/api/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: query.get('code') ?? '',
      redirect_uri: REDIRECT_URI,
      code_verifier: attempt.verifier,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error('token exchange failed: ' + body.error + ' ' + (body.error_description ?? ''))

  // 4. Store server-side, keyed on the stable Duels.ink user id. Overwrite any older token.
  links.set(appUserId, {
    duelsUserId: body.user.id,
    name: body.user.name,
    token: body.access_token,
    expiresAt: Date.now() + body.expires_in * 1000,
  })
  return 'Linked as ' + body.user.name + '.'
}

// Later, from your server: read the linked player's games.
export async function recentGames(appUserId: string) {
  const link = links.get(appUserId)
  if (!link) return null
  const res = await fetch(DUELS + '/api/me/match-history?limit=50', {
    headers: { Authorization: 'Bearer ' + link.token },
  })
  if (res.status === 401) { links.delete(appUserId); return null } // expired or disconnected: ask to re-link
  if (!res.ok) throw new Error('duels.ink ' + res.status)
  return (await res.json()).games
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const appUserId = currentUserId(req)
  if (!appUserId) { res.writeHead(401).end('log in first'); return }
  try {
    if (url.pathname === '/link/duels') {
      res.writeHead(302, { Location: startUrl(appUserId) }).end()
    } else if (url.pathname === '/link/duels/callback') {
      res.writeHead(200, { 'Content-Type': 'text/plain' }).end(await finish(url.searchParams, appUserId))
    } else {
      res.writeHead(404).end()
    }
  } catch (err) {
    res.writeHead(400, { 'Content-Type': 'text/plain' }).end(String(err))
  }
}).listen(3000)
```

### GET /oauth/authorize — Consent page

The page you send the player to (a full-page redirect or link — never an iframe; the page refuses to be framed). Signed-out players are sent to log in first and come back to the same URL. The page shows your app’s registered name, description, homepage and owner, what each requested scope allows, the token lifetime, a note when it will replace an existing connection to your app, and the host the player will be sent back to. Approve or Cancel redirects the browser to your redirect_uri.

- **Authentication:** None to build or open — a browser link; the visitor signs in on Duels.ink

**Query parameters**

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `response_type` | 'code' | yes | — | Must be code. |
| `client_id` | string | yes | — | Your app’s client id (dapp_…). |
| `redirect_uri` | string | yes | — | One of your registered redirect URIs, exactly. A mismatch is shown on the Duels.ink page and never redirected. |
| `scope` | string | no | profile match_history:read | Space-separated scopes (URL-encoded as + or %20). profile is always included. The default is limited to the scopes your app is registered for. |
| `state` | string | yes | — | 8–512 characters, random per attempt. Echoed back verbatim on the callback; check it before anything else. |
| `code_challenge` | string | yes | — | base64url(SHA-256(code_verifier)), no padding (43 characters). |
| `code_challenge_method` | 'S256' | yes | — | Must be S256. plain is rejected. |
| `expires_in_days` | number | no | — | Requested token lifetime, integer 1–365. Defaults to — and is capped at — your app’s registered maximum (90 days unless agreed otherwise). |

**Response**

An HTML page. On Approve the browser lands on redirect_uri?code=<code>&state=<state>; on Cancel on redirect_uri?error=access_denied&state=<state>. Redirectable validation errors (invalid_scope, invalid_request, unsupported_response_type) arrive the same way as error + error_description + state. Query parameters already present in your redirect_uri are kept.

```json
# Send the player here:
https://duels.ink/oauth/authorize?response_type=code&client_id=dapp_3f9c…&redirect_uri=https%3A%2F%2Fstats.example.com%2Flink%2Fduels%2Fcallback&scope=profile+match_history%3Aread&state=Jx8…&code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&code_challenge_method=S256

# Approved:
https://stats.example.com/link/duels/callback?code=4f1d…(64 hex chars)&state=Jx8…

# Cancelled:
https://stats.example.com/link/duels/callback?error=access_denied&state=Jx8…
```

**Example**

```bash
# Build the PKCE pair and the authorize URL in a shell (openssl + coreutils):
VERIFIER=$(openssl rand -base64 32 | tr '+/' '-_' | tr -d '=')
CHALLENGE=$(printf '%s' "$VERIFIER" | openssl dgst -sha256 -binary | openssl base64 | tr '+/' '-_' | tr -d '=')
STATE=$(openssl rand -hex 16)
echo "https://duels.ink/oauth/authorize?response_type=code&client_id=$CLIENT_ID&redirect_uri=$(printf '%s' "$REDIRECT_URI" | jq -sRr @uri)&scope=profile+match_history%3Aread&state=$STATE&code_challenge=$CHALLENGE&code_challenge_method=S256"
```

> The code in the callback is valid for 60 seconds and can be exchanged once.
>
> Errors that must not be redirected — unknown or disabled client_id, redirect_uri not registered, or unauthorized_client (app not approved yet and the player is not its owner) — are displayed on the Duels.ink page instead. Nothing reaches your callback in that case.

### POST /api/oauth/token — Exchange a code for a token

Server-to-server: trade the authorization code for the player’s access token. Send application/x-www-form-urlencoded (the OAuth standard) or application/json. Authenticate your app with client_id + client_secret in the body, or with HTTP Basic (Authorization: Basic base64(client_id:client_secret)). Never reads a session cookie, so it works from any server.

- **Authentication:** OAuth client credentials (client_id + client_secret) — server-to-server, no session

- **Rate limit:** 30 requests per minute per (client_id, IP); a 429 carries Retry-After

**Request body (JSON)**

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `grant_type` | 'authorization_code' | yes | — | The only supported grant. |
| `code` | string | yes | — | The code from the callback. Valid 60 s, single use. |
| `redirect_uri` | string | yes | — | The exact redirect_uri sent to /oauth/authorize. |
| `code_verifier` | string | yes | — | The PKCE verifier (43–128 characters) whose S256 hash was sent as code_challenge. |
| `client_id` | string | no | — | Your client id — required unless sent with HTTP Basic. |
| `client_secret` | string | no | — | Your client secret — required unless sent with HTTP Basic. |

**Response**

JSON with the access token (a 96-character hex string, used as a Bearer token), its type, lifetime in seconds, the granted scopes (space-separated) and the Duels.ink user it belongs to. Sent with Cache-Control: no-store. Approving again later issues a new token and revokes this one.

```json
{
  "access_token": "9b2e…(96 hex chars)",
  "token_type": "Bearer",
  "expires_in": 7776000,
  "scope": "profile match_history:read",
  "user": { "id": "u_0190…", "name": "Ashe" }
}
```

**Stable response fields**

| Field | Type | Description |
|---|---|---|
| `access_token` | string | The token. Store it server-side; send it as Authorization: Bearer <access_token>. |
| `token_type` | "Bearer" | Always Bearer. |
| `expires_in` | number | Seconds until the token expires. No refresh token is issued — re-run the authorize flow. |
| `scope` | string | Granted scopes, space-separated. Always contains profile. |
| `user.id` | string | Stable Duels.ink user id — the key to link on. |
| `user.name` | string | Public display name at the time of linking. |

**Example**

```bash
curl -X POST "https://duels.ink/api/oauth/token" \
  -u "$CLIENT_ID:$CLIENT_SECRET" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "grant_type=authorization_code" \
  --data-urlencode "code=$CODE" \
  --data-urlencode "redirect_uri=https://stats.example.com/link/duels/callback" \
  --data-urlencode "code_verifier=$VERIFIER"
```

**Endpoint-specific errors**

- `400` — invalid_request (missing/malformed parameter), invalid_grant (code unknown, expired, already used, issued to another app, redirect_uri mismatch, or PKCE verification failed) or unsupported_grant_type.
- `401` — invalid_client — unknown or disabled client_id, or wrong client_secret.
- `429` — slow_down — too many token requests; wait for Retry-After.

> Error bodies use the OAuth shape: {"error": "invalid_grant", "error_description": "…"}.
>
> Re-presenting a code that was already exchanged fails with invalid_grant AND revokes the token it issued — if your logs show this, someone may have intercepted a code.

### GET /api/me/oauth-apps — List your apps

The apps you registered, with their review status. This and the other /api/me/oauth-apps endpoints are what the /developers page uses; they are account-level and accept a logged-in browser session only — no Bearer token, personal or scoped. Most developers just use the page.

- **Authentication:** Browser session only (tokens cannot write here)

**Response**

JSON object with an apps array — your apps only. The client secret is never returned.

```json
{
  "apps": [
    {
      "id": "0199c4a0-…",
      "clientId": "dapp_3f9c…",
      "name": "Team Stats",
      "description": "Team dashboards for our league.",
      "homepageUrl": "https://stats.example.com",
      "redirectUris": ["https://stats.example.com/link/duels/callback", "http://localhost:3000/link/duels/callback"],
      "allowedScopes": ["profile", "match_history:read"],
      "maxExpiresInDays": 90,
      "status": "pending",
      "reviewNote": null,
      "reviewedAt": null,
      "disabledAt": null,
      "createdAt": "2026-10-10T09:00:00.000Z",
      "updatedAt": "2026-10-10T09:00:00.000Z",
      "activeTokenCount": 1
    }
  ]
}
```

**Stable response fields**

| Field | Type | Description |
|---|---|---|
| `status` | 'pending' \| 'approved' \| 'rejected' | Review status (see Review status). Only approved apps can be authorized by players other than you. |
| `reviewNote` | string \| null | The reviewer’s note — the reason for a rejection, typically. |
| `reviewedAt` | ISO 8601 \| null | When the app was last reviewed. |
| `disabledAt` | ISO 8601 \| null | Set when the Duels.ink admin suspended the app; its tokens do not work while set. You cannot change it. |
| `activeTokenCount` | number | Live tokens issued by the app (one per linked player). |

**Example**

```bash
# Requires a browser session (cookie) — easiest: the /developers page.
curl -b "$SESSION_COOKIE" "https://duels.ink/api/me/oauth-apps"
```

**Endpoint-specific errors**

- `401` — No browser session (a Bearer token is not accepted here).

### POST /api/me/oauth-apps — Register an app

Create an app owned by you. It starts as pending: you can authorize it with your own account right away; others can once it is approved. The client secret appears only in this response.

- **Authentication:** Browser session only (tokens cannot write here)

**Request body (JSON)**

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `name` | string | yes | — | 1–64 characters, shown on the consent screen. Names impersonating the site are refused (containing "duels.ink", "duels ink", "duelsink", or exactly "duels" / "official"). |
| `description` | string | no | — | Up to 280 characters, shown on the consent screen. |
| `homepageUrl` | string | no | — | Your app’s homepage. |
| `redirectUris` | string[] | yes | — | 1–10 exact callback URLs: https://, or http://localhost[:port] / http://127.0.0.1[:port]; no fragment. |
| `allowedScopes` | string[] | no | ["profile","match_history:read"] | Scopes the app may request. Known scopes only; must include profile. |
| `maxExpiresInDays` | number | no | 90 | Longest token lifetime the app can request, 1–365. |

**Response**

201 with the app (same shape as in the list, status pending) and its one-time clientSecret.

```json
{
  "app": { "id": "0199c4a0-…", "clientId": "dapp_3f9c…", "name": "Team Stats", "status": "pending", "…": "…" },
  "clientSecret": "dsec_…(64 hex chars)"
}
```

**Example**

```bash
# Requires a browser session (cookie), same-origin — easiest: the /developers page.
curl -X POST "https://duels.ink/api/me/oauth-apps" \
  -H "Content-Type: application/json" \
  -H "Origin: https://duels.ink" \
  -b "$SESSION_COOKIE" \
  -d '{"name":"Team Stats","homepageUrl":"https://stats.example.com","redirectUris":["https://stats.example.com/link/duels/callback"]}'
```

**Endpoint-specific errors**

- `400` — A field fails validation (name, description, redirect URI rules, unknown scope or missing profile, maxExpiresInDays out of range). The message says which.
- `401` — No browser session.
- `409` — You already own 5 apps — delete one first.
- `429` — Too many registrations in a short time.

> Edit an app with PATCH /api/me/oauth-apps, body {"id": "<app id>", …any of the fields above}. The response is {"app": …, "reviewRequired": boolean}: true when the change sent an approved app back to review (renamed, or a scope added), or resubmitted a rejected one. Description, homepage, redirect URIs, maxExpiresInDays and removed scopes apply immediately. 404 when the id is not one of your apps.
>
> Status, suspension, owner and review fields cannot be set through these endpoints — they belong to the Duels.ink admin.

### DELETE /api/me/oauth-apps — Delete an app

Delete one of your apps. Every token it issued stops working immediately and pending authorization codes are discarded. Cannot be undone.

- **Authentication:** Browser session only (tokens cannot write here)

**Request body (JSON)**

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | string | yes | — | The app’s id (id, not clientId). |

**Response**

JSON object: {"ok": true}.

**Example**

```bash
curl -X DELETE "https://duels.ink/api/me/oauth-apps" \
  -H "Content-Type: application/json" \
  -H "Origin: https://duels.ink" \
  -b "$SESSION_COOKIE" \
  -d '{"id":"<app-id>"}'
```

**Endpoint-specific errors**

- `404` — The id is not one of your apps.

### POST /api/me/oauth-apps/rotate-secret — Rotate an app’s client secret

Replace the client secret. The old one stops working at the token endpoint immediately; tokens already issued keep working. The new secret is shown only in this response.

- **Authentication:** Browser session only (tokens cannot write here)

**Request body (JSON)**

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | string | yes | — | The app’s id. |

**Response**

JSON object with the new one-time clientSecret.

```json
{ "clientSecret": "dsec_…(64 hex chars)" }
```

**Example**

```bash
curl -X POST "https://duels.ink/api/me/oauth-apps/rotate-secret" \
  -H "Content-Type: application/json" \
  -H "Origin: https://duels.ink" \
  -b "$SESSION_COOKIE" \
  -d '{"id":"<app-id>"}'
```

**Endpoint-specific errors**

- `404` — The id is not one of your apps.

## Private tables

Create and observe private game tables programmatically — the community-league / tournament surface. A script can lock the seats to named entrants (friend code or user id), lock each entrant’s registered decklist to their seat, grant spectator chairs, pick who takes the first turn, and organize without playing (asSpectator). The returned url is the join link: reserved players who open it are seated automatically, and no-shows are unambiguous because their named chair stays empty. This is the ONE write a user token may perform; everything that happens inside the lobby (deck picks, readying, starting) still comes from the seated players themselves.

### POST /api/table/create — Create a table

Create a private table lobby. The caller becomes the host — seated in the first chair, or holding a spectator chair when asSpectator is true (organize and watch, don’t play). Settings are validated by the same rules the in-app lobby enforces: everything except constructed deck mode is 1v1-only, bo3 is 1v1 constructed only, and unknown players or spectators fail the whole request so a bad entrant surfaces immediately.

- **Authentication:** Bearer token or session cookie

- **Rate limit:** 100 creations / 60 s, 1000 / hour, 3000 / day per user — a 256-table round (512 players) fits in ~3 minutes

**Request body (JSON)**

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `players` | (string \| { player, deck? })[] | no | — | Reserve the seats for these players — friend codes (e.g. AMBER-DRAGON-1234) or user ids, either bare or as { player, deck }. Only listed players may sit. When you play too, your own seat is reserved implicitly (list yourself with a deck to lock your own list). Reserving more than 2 seats requires multi-seat table access. |
| `players[].deck` | string \| string[] | no | — | LOCK the player's decklist (tournament "closed deck"): a plain-text decklist — one entry per line ('4 Card Name', '4x Card Name', '2 Card Name (1-172)', card names in EN/FR/DE/IT/JA/ZH; a 'Coconut: <id>' header declares the Coconut card) — as one string or an array of lines. The list is stamped onto their seat when they sit and cannot be changed at the table (they can review it, never edit it; other seats never see it). Parse or format-legality problems fail the whole request with per-card errors. Constructed tables only. |
| `spectators` | string[] | no | — | Grant spectator chairs (max 8) to these users. They get guaranteed access to watch the created game — past individual privacy opt-outs — and their names are visible to every player before the start. |
| `asSpectator` | boolean | no | false | Create the table as its spectator-host. Requires at least 2 reserved players. |
| `firstPlayer` | 'random' \| string | no | random | Who takes the first turn: random keeps the coin toss (1v1) / seeded draw (3-4 seats); a friend code or user id naming yourself or one of players skips the toss — the game opens straight at mulligan. |
| `timerPreset` | 'none' \| 'casual' \| 'standard' \| 'blitz' | no | none | Turn clock for the created game. |
| `gameFormat` | string \| null | no | CoreConstructed | Deck legality: CoreConstructed, InfinityConstructed, Coconut, or null for No Limit. |
| `gameMode` | 'constructed' \| 'sealed' \| 'pack_rush' \| 'draft' | no | constructed | Deck mode. Everything except constructed is 1v1-only. |
| `matchFormat` | 'bo1' \| 'bo3' | no | bo1 | Best-of series. bo3 is 1v1 constructed only. |
| `loreToWin` | number | no | — | Custom lore target. Omit for the variant default (20). |
| `otdInkDrop` | boolean | no | false | Ink Drop experiment: the player going second starts with 1 free ink drop. 1v1 constructed only, not with Coconut. |
| `visibility` | 'private' \| 'public' | no | private | 'public' advertises the table on the home page. Joining is by link either way. |
| `allowSpectators` | boolean | no | true | false blocks all spectating of the created game (incompatible with spectator chairs / asSpectator). |
| `openSeats` | number | no | 2 | Open chairs beyond the 1v1 default, up to your capacity. Set automatically when players reserves more than 2 seats. |
| `bot` | boolean \| string | no | false | Seat a bot immediately (value = difficulty: 'v1' (Easy) \| 'v2' (Normal); true = default 'v2'). Incompatible with players/spectators/asSpectator/firstPlayer. |

**Response**

JSON with tableId, url (the join/share link — possession admits reserved players and spectators alike) and view, the caller’s live table state (config, seats, spectators, status).

```json
{
  "tableId": "0198a3b4-…",
  "url": "https://duels.ink/table/0198a3b4-…",
  "view": {
    "id": "0198a3b4-…",
    "status": "assembling",
    "hostUserId": "u_0187…",
    "config": { "maxSeats": 2, "timerPreset": "standard", "seatReservations": [ … ], "firstPlayerUserId": "u_0190…" },
    "seats": [],
    "spectators": [ { "userId": "u_0187…", "username": "LeagueBot", "connected": false } ],
    "isSpectator": true,
    "isHost": true
  }
}
```

**Example**

```bash
curl -X POST "https://duels.ink/api/table/create" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "asSpectator": true,
    "players": [
      { "player": "AMBER-DRAGON-1234", "deck": "4 Tipo - Growing Son\n4 Pawpsicle\n…" },
      "FROZEN-OWL-5678"
    ],
    "firstPlayer": "AMBER-DRAGON-1234",
    "timerPreset": "standard"
  }'
```

**Endpoint-specific errors**

- `400` — Invalid setting, duplicate player, more reservations than your seat capacity, an orchestration field combined with bot, or a locked decklist that fails to parse / breaks the table’s format (response carries deckErrors, and the error names the entrant).
- `404` — A players / spectators / firstPlayer reference matched no account. The error message names the offending reference.

> A locked decklist fixes WHAT the player brings, not WHETHER they play: the entrant still sits down and readies up themselves. Locked lists are validated against the table’s format at creation (all-or-nothing) and again at start.
>
> Also accepts revealHands, revealHandsToSpectators, privateUndoConfig, afkPingEnabled, allowGuestInvites and packRushSets — the same settings the lobby modal offers, validated by the same rules.
>
> Naming players/spectators only GRANTS them access (a reserved seat, a spectator chair) — it never obligates them, and they are visible to everyone at the table.
>
> The lobby itself (deck picks, ready, start, cancel, settings changes) is driven by the seated players and the host through the site — /api/table/{tableId}/action is session-only, a token cannot act in a lobby.

### GET /api/table/{tableId}/view — Poll a table

Snapshot of a table: who is seated and ready, who is watching, the config in force, and — once the host starts — the created game’s id and result. status walks assembling → starting → completed (gameId set) or cancelled. Other seats’ deck contents are always hidden. Access is gated to your tables: while the table is assembling anyone authenticated with the link may look (the link is the invite), but once it starts only participants — the host, seated players, spectator chairs and reserved entrants — can poll it.

- **Authentication:** Bearer token or session cookie

**Response**

JSON with a view object: id, status, hostUserId, config, seats, spectators, gameId once started, and game — the created game’s live result (in_progress/finished, the winning seat, victory reason, turn count, end time).

```json
{
  "view": {
    "id": "0198a3b4-…",
    "status": "completed",
    "hostUserId": "u_0187…",
    "config": { "maxSeats": 2, "timerPreset": "standard", "seatReservations": [ … ] },
    "seats": [ { "index": 0, "userId": "u_0190…", "username": "Ashe", "ready": true, "connected": true, "hasDeck": true, "hasCoconut": false } ],
    "spectators": [ { "userId": "u_0187…", "username": "LeagueBot", "connected": false } ],
    "gameId": "0198a3c1-…",
    "game": {
      "status": "finished",
      "winnerSeatIndex": 0,
      "winnerUserId": "u_0190…",
      "winnerUsername": "Ashe",
      "victoryReason": "lore",
      "turnNumber": 14,
      "endedAt": 1754580000000
    }
  }
}
```

**Example**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://duels.ink/api/table/<tableId>/view"
```

**Endpoint-specific errors**

- `401` — No credentials — the endpoint is never public.
- `403` — The table has left assembling and the caller holds no place at it (not host, seated, spectating or reserved).
- `404` — No table with that id.

> When status is completed, gameId is the live game: spectator chairs open /spectate/{gameId}, players use /game/{gameId}.
>
> game appears once the table has handed off: {status: "in_progress" | "finished", winnerSeatIndex, winnerUserId, winnerUsername, victoryReason, turnNumber, endedAt}. A finished game with a null winner was cancelled or drawn. Poll this to learn the result without holding game credentials — the organizer flow needs nothing else.
>
> The token that created the table (the host) can always poll it; so can reserved entrants, seated players and spectators. There is no unauthenticated access.

## Draft pods

Put a "Draft on Duels.ink" button on your cube site: a plain link that opens a draft pod for a Cubecana cube, or for a cube list you encode into the link. There is no API call and no token — the visitor’s own signed-in session does the work. The cube is matched against the card database, saved as a private cube in the visitor’s library (opening the same Cubecana cube or an identical list again refreshes that cube instead of adding a copy), and a draft lobby is created with the visitor as host. Anyone signed in who opens the lobby url takes a seat, and the host starts the draft from the lobby.

### GET /draft/new?cubecana={cubecanaId} — One-click draft link

Sends the visitor to a "Start a draft pod" page for that cube. One click on Create draft pod imports the cube, creates the pod with the visitor as host and drops them in the lobby, ready to share. The pack shape comes from the cube’s own Cubecana settings (cards per booster, boosters per player). Instead of cubecana, pass list (plus an optional name) to draft a cube list encoded in the link. Pods use 30 s picks and a 35-card minimum deck; a list cube deals 4 packs of 12. Card names that match nothing are left out of the cube, and the cube must still hold enough cards for a 2-seat pod (2 × packs × pack size).

- **Authentication:** None to build or open — a browser link; the visitor signs in on Duels.ink

**Query parameters**

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `cubecana` | string | no | — | The Cubecana cube id — the UUID in https://www.cubecana.com/cube/<id>. The cube is fetched from Cubecana when the visitor clicks, so the pod always drafts its current list. Use this OR list. |
| `list` | string | no | — | A cube list instead of a Cubecana id. Any of: base64 or base64url of the list text (UTF-8, so curly apostrophes and JA/FR names survive); the text itself, URL-encoded so newlines arrive as %0A; entries separated by commas; or a Duels.ink deck code. The text is one entry per line — '1 Card Name', '2x Card Name', '1 Card Name (1-172)' — names in EN/FR/DE/IT/JA/ZH, matched like deck import links (ids in parentheses are exact). Up to 2,000 cards. URL-encode the value (+, / and = are not safe in a query string). Long cubes make long URLs — prefer cubecana when the cube is on Cubecana. |
| `name` | string | no | Imported Cube | With list: the name of the saved cube. |

**Response**

An HTML page. Signed-out visitors are sent to /login first and land back on the same link afterwards. On success the page navigates to /draft/{draftId}; on failure it shows the error and any card names that matched nothing.

```json
# A Cubecana cube:
https://duels.ink/draft/new?cubecana=d2bffcb4-545f-4560-ac4c-7f31c95157f5

# A cube list (base64url of "1 Ariel - On Human Legs\n1 Stitch - Rock Star\n…"):
https://duels.ink/draft/new?list=MSBBcmllbCAtIE9uIEh1bWFuIExlZ3MKMSBTdGl0Y2ggLSBSb2NrIFN0YXIK&name=My%20Cube
```

**Example**

```bash
<!-- The button on your cube page -->
<a href="https://duels.ink/draft/new?cubecana=d2bffcb4-545f-4560-ac4c-7f31c95157f5" target="_blank">
  Draft on Duels.ink
</a>

# Build a list link from a cube file (one entry per line):
python3 -c 'import base64,sys,urllib.parse; print("https://duels.ink/draft/new?list=" + urllib.parse.quote(base64.urlsafe_b64encode(sys.stdin.read().strip().encode()).decode(), safe="") + "&name=" + urllib.parse.quote("My Cube"))' < cube.txt
```

> The link itself never creates anything: the pod is made when the visitor clicks Create draft pod, so a link or an embedded page cannot open pods in someone’s name without them seeing it.
>
> No token or API key is needed — the request runs in the visitor’s own signed-in session. Build the link client-side with nothing but the cube id.

## Data export

The core export surface: one flat row per finished game, plus manifest endpoints that turn id lists into direct download URLs. All of it works with a Bearer token.

### GET /api/me/match-history — Match history

Returns one analytics-friendly row per finished game you played, newest first. Puzzle and playground games are never included. Each row carries stable ids and absolute URLs for the game’s replay and gamelog blobs, plus your own aggregated decklist — the opponent’s decklist is intentionally never returned (only their deck colors, which are public during play).

- **Authentication:** Bearer token or session cookie

- **Rate limit:** 20 requests / 60 s per user

- **Concurrency cap:** 3 concurrent requests per user

**Query parameters**

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `format` | 'json' \| 'csv' \| 'jsonl' | no | json | Response format. json wraps rows with a next_cursor; csv/jsonl stream bare rows and paginate via the Link header. |
| `limit` | number | no | 100 | Rows per request, 1–250. Values above 250 are clamped. |
| `cursor` | string | no | — | Pagination cursor "<iso-updated-at>\|<game-id>". Take it verbatim from next_cursor or the Link header — do not construct it yourself. |
| `from` | ISO 8601 | no | — | Inclusive lower bound on the game’s last-update time. |
| `to` | ISO 8601 | no | — | Exclusive upper bound on the game’s last-update time. |
| `source` | string | no | all | Comma-separated subset of 'matchmaking', 'private', 'bot'. |
| `queue` | string | no | — | Comma-separated queue ids. Only constrains matchmaking rows. |

**Response**

json: {"games": MatchHistoryRow[], "next_cursor": string | null}. jsonl: one row object per line (application/x-ndjson). csv: header row + one line per game (text/csv). All three formats send a Link: <url>; rel="next" header while more pages exist. See the Row reference below for every field.

```json
{
  "games": [
    {
      "game_id": "g_01890c…",
      "mode": "matchmaking",
      "queue_id": "standard-ranked",
      "ranked": true,
      "started_at": "2026-08-05T19:02:11.000Z",
      "ended_at": "2026-08-05T19:24:47.000Z",
      "result": "win",
      "your_lore": 20,
      "opp_lore": 14,
      "your_decklist": [{ "cardId": "be-prepared", "count": 4 }, …],
      "replay_id": "rp_01890c…",
      "replay_url": "https://duels.ink/r/rp_01890c…",
      "gamelog_url": "https://duels.ink/g/g_01890c…",
      "…": "(see Row reference for all 38 fields)"
    }
  ],
  "next_cursor": "2026-08-05T19:24:47.000Z|g_01890c…"
}
```

**Example**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://duels.ink/api/me/match-history?format=jsonl&limit=250&from=2026-01-01T00:00:00Z"
```

> Rows are served from the database only — this endpoint never touches blob storage, so it is the cheap way to enumerate games before selectively downloading files.
>
> Pagination is keyset-based (last-update time + game id): stable under concurrent inserts, no offset drift.

### POST /api/me/bulk-replays — Bulk replay manifest

Exchange a list of replay_id values for direct download URLs. Ownership is validated server-side: each id must belong to a game you played. The response is a manifest — your client fetches each URL itself, so the app server stays out of the byte path and the per-blob URLs hit an aggressively-cached CDN.

- **Authentication:** Bearer token or session cookie

- **Rate limit:** 30 requests / 60 s per user

**Request body (JSON)**

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `ids` | string[] | yes | — | Replay ids (replay_id from match-history rows). Max 1000, duplicates ignored. |

**Response**

JSON manifest: files (one entry per ready, owned replay — id, filename, url, in your request order) and missing (ids you do not own or whose replay is not ready yet).

```json
{
  "files": [
    { "id": "rp_abc", "filename": "g_0189…_p1.replay.gz", "url": "https://duels.ink/r/rp_abc" }
  ],
  "missing": ["rp_def"]
}
```

**Example**

```bash
curl -X POST "https://duels.ink/api/me/bulk-replays" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ids":["rp_abc","rp_def"]}'
```

> This POST is one of the two write-method endpoints a read-only token may call — it mutates nothing.

### POST /api/me/bulk-gamelogs — Bulk gamelog manifest

Exchange a list of game_id values for direct gamelog download URLs. Same manifest design as bulk-replays. Only finished games you participated in are returned.

- **Authentication:** Bearer token or session cookie

- **Rate limit:** 30 requests / 60 s per user

**Request body (JSON)**

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `ids` | string[] | yes | — | Game ids (game_id from match-history rows). Max 1000, duplicates ignored. |

**Response**

JSON manifest: files (id, filename, url per available gamelog) and missing (ids not owned or not finished). URLs point straight at the CDN when possible, falling back to /g/{game_id}.

```json
{
  "files": [
    { "id": "g_abc", "filename": "g_abc.logs.gz", "url": "https://cdn.duels.ink/logs/…" }
  ],
  "missing": ["g_def"]
}
```

**Example**

```bash
curl -X POST "https://duels.ink/api/me/bulk-gamelogs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ids":["g_abc","g_def"]}'
```

> You only ever receive your own perspective’s log file — the opponent’s hidden information is never in it.

## Direct downloads

Stable per-file URLs. In production these answer with a 302 redirect to a CDN URL and the app server never streams the bytes — always follow redirects (curl -L). Downloaded files are gzip-compressed JSON: decompress with gunzip/zcat or gzip.decompress.

### GET /r/{replay_id} — Download a replay

Download one replay blob (.replay.gz). Replay URLs are shareable, so this endpoint also works unauthenticated — but authenticated callers get a higher rate limit.

- **Authentication:** Optional — public, higher limits when authenticated

- **Rate limit:** 30 requests / 60 s authenticated, 10 / 60 s anonymous (shared with the site’s replay endpoints)

- **Concurrency cap:** 3 concurrent requests per identity

**Response**

302 redirect to the CDN URL serving the .replay.gz blob (bytes are streamed directly only in deployments without a CDN). The blob is immutable once generated.

**Example**

```bash
curl -L -o replay.replay.gz \
  -H "Authorization: Bearer $TOKEN" \
  "https://duels.ink/r/<replay_id>"
```

### GET /g/{game_id} — Download a gamelog

Download the finished-game log (.logs.gz) for a game you played. You receive the log filtered to your own perspective — a participant never sees the opponent’s hidden information. Non-participants get 404.

- **Authentication:** Bearer token or session cookie

- **Rate limit:** 30 requests / 60 s per user

- **Concurrency cap:** 3 concurrent requests per user

**Response**

302 redirect to the CDN URL serving your perspective’s .logs.gz file (proxied directly only without a CDN).

**Example**

```bash
curl -L -o game.logs.gz \
  -H "Authorization: Bearer $TOKEN" \
  "https://duels.ink/g/<game_id>"
```

**Endpoint-specific errors**

- `404` — Unauthenticated, not a participant of the game, or the game does not exist — deliberately indistinguishable.

## Deck import links

Send someone straight into the deck builder with a decklist already filled in — the "Play on Duels.ink" button for a deck site, a Discord bot, or a tournament registration sheet. Nothing is written by the link itself: it opens the builder’s import dialog pre-filled, the visitor reviews it (unknown card names get a resolution picker) and saves the deck to their own account. Links are built entirely on your side — there is no API call and no token involved. The decklist text grammar below is shared with players[].deck on POST /api/table/create and with the builder’s own Import / Export text.

### Duels.ink card ids

Every card in the catalog has a short id built from its printed set and collector number: <set>-<number>, with no leading zeros. Read both off the bottom of the card — "12/204 · EN · 1" is card 12 of set 1, so its id is 1-12. Sets are numbered in release order (1 = The First Chapter, 2 = Rise of the Floodborn, …), and the number is the printed one, so Enchanted and other numbers past the set size keep theirs (1-205). About 94% of the catalog is this plain form; the rest are promos and special printings that insert a segment between set and number.

- Plain set cards: 1-1 (Ariel - On Human Legs), 14-1, 1-205 (an Enchanted). Regex ^(\d+)-(\d+)$ — group 1 is the set, group 2 the collector number.
- Promos and special printings: <set>-<code>-<number>, e.g. 13-P3-58 (promo series P3), 4-DIS-1, 14-D23-13, 13-PD1-3. A few older outliers also exist: 1TFC-P1-1, 7-P2-24A, 7-P2-26-V and the 3-4a … 3-4e variants.
- Lookup is exact and case-insensitive: 13-p3-58 works, 01-012 does not (no zero padding). An id that is not in the catalog falls back to the card name written before it, if any.
- Coconut cards use coconut-<NNN> (zero-padded, e.g. coconut-007) and only appear on the Coconut: line, never as a deck entry.
- Enchanted / foil printing ids are accepted but import as the regular card (the visitor’s preferred printing is applied), so the plain number is the one to emit.
- These are the same cardId values that match-history rows carry in your_decklist, and the ids compact deck codes (GET /d/{code}) pack.

```
# Every id in the catalog matches:
^\d+[A-Z]*-(?:[A-Z]+\d*-)?\d+(?:[a-zA-Z]|-[A-Z])?$

# Build the plain id from a printed card ("12/204 · EN · 1"):
def card_id(set_number: int, collector_number: int) -> str:
    return f"{set_number}-{collector_number}"    # card_id(1, 12) -> "1-12"

# …and use it in a decklist line:
4 (1-12)
```

### GET /decks/new?import={decklist} — Open the deck builder with a decklist

Opens the deck builder with its import dialog pre-filled. The import value can be any of four encodings, tried in this order: (1) a compact deck code (see GET /d/{code}); (2) standard base64 (RFC 4648, with + / and = padding — not the URL-safe alphabet) of the decklist text; (3) the decklist text itself, URL-encoded so newlines arrive as %0A; (4) entries separated by commas instead of newlines (4 Card Name,2 Other Card). Whatever the encoding, it decodes to the decklist text described in the parameter below.

- **Authentication:** None to build or open — a browser link; the visitor signs in on Duels.ink

**Query parameters**

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `import` | string | yes | — | Decklist text, one entry per line: '<count> <card>' or '<count>x <card>'. <card> is a card id in parentheses — '4 (1-1)' — a full card name — '4 Ariel - On Human Legs' — or both — '4 Ariel - On Human Legs (1-1)', where the id wins. Names match the English full name or its FR/DE/IT/JA translation, case- and accent-insensitive, with a partial-name fallback; prefer ids, which never fuzzy-match. Ids are the ones the catalog uses (e.g. 1-1, 14-1, promos like 13-P3-58), the same cardId values match-history rows carry in your_decklist. Empty lines and lines starting with # or // are ignored. An optional 'Coconut: coconut-007' line (also '# Coconut: …') declares the Coconut card for a Coconut deck; it is not a deck card and counts toward nothing. Enchanted / foil printings import as the regular card — the visitor’s preferred printing is applied. |

**Response**

An HTML page (the deck builder). Signed-out visitors are sent to /login first and land back on the same link afterwards, with the import intact. The link also unfurls on Discord, X, etc. with a card-grid share image of the deck, so a pasted link previews the list.

```json
# Same 10-card list, three equivalent links:
https://duels.ink/decks/new?import=CABYOEAAAX746AIA                       (deck code)
https://duels.ink/decks/new?import=NCAoMS0xKQoyICgxLTIpCjQgKDE0LTEp       (base64 of the text)
https://duels.ink/decks/new?import=4%20(1-1)%0A2%20(1-2)%0A4%20(14-1)    (URL-encoded text)

# …all of which decode to:
4 (1-1)
2 (1-2)
4 (14-1)
```

**Example**

```bash
# Build a link from a decklist file (one entry per line):
python3 -c 'import base64,sys,urllib.parse; print("https://duels.ink/decks/new?import=" + urllib.parse.quote(base64.b64encode(sys.stdin.read().strip().encode()).decode(), safe=""))' < deck.txt
```

> Use ids in parentheses when you generate links: they are exact, short, and survive card-name translations and reprints.
>
> base64 links must contain plain ASCII text — the decoder reads the bytes as Latin-1, so non-ASCII card names (JA/accented FR) get mangled. Either use ids, or send the text URL-encoded (encoding 3) instead.
>
> URL-encode the base64 value too (+, / and = are not safe in a query string unescaped).
>
> Format legality is NOT checked by the link: the builder shows the deck’s validity per format after import, and the visitor decides what to keep.
>
> Keep the import value under 6,000 characters (a verbose 60-card list with full names is ~2,500). Longer values still open the builder but get no link-preview image.

### GET /d/{code} — Short deck link (compact deck code)

The short link deck-image QR codes encode. {code} is a compact deck code — an unpadded RFC 4648 base32 string (A-Z, 2-7), around 70 characters for a 60-card deck — and the route simply redirects to /decks/new?import={code}. Case-insensitive. You can also pass the bare code as the import value yourself.

- **Authentication:** None to build or open — a browser link; the visitor signs in on Duels.ink

**Response**

302 to /decks/new?import={code} (cacheable for a year — a code fully determines its target). A code that does not decode to at least one known card redirects to /decks instead.

```json
HTTP/1.1 302 Found
Location: https://duels.ink/decks/new?import=CABYOEAAAX746AIA
Cache-Control: public, max-age=31536000, immutable
```

**Example**

```bash
curl -sI "https://duels.ink/d/CABYOEAAAX746AIA" | grep -i '^location'
```

> Wire format (version 1). Bytes, then base32. All integers are unsigned LEB128 varints. Byte 0 = (version << 4) | flags, version 1; flag bit 0 = a Coconut card follows, bit 1 = a literal section follows. [If bit 0] varint(Coconut number): coconut-007 → 7.
>
> Ordinal section: varint(n), then n entries in ascending ordinal order. A card id of the form <set>-<number> (digits only, number ≤ 511) has ordinal set × 512 + number: 1-1 → 513. Each entry is varint((delta << 2) | (min(count, 4) − 1)), where delta = ordinal − previous ordinal (previous starts at 0); when min(count, 4) = 4, varint(count − 4) follows (0 for an exact 4-of).
>
> Literal section, for every other id (promos like 13-P3-58, set codes like 4-DIS-1, numbers above 511): varint(m), then m × { varint(count), varint(byte length), UTF-8 id }.
>
> Worked example: 4× 1-1, 2× 1-2, 4× 14-1 → bytes 10 03 87 10 00 05 FF CF 01 00 → base32 CABYOEAAAX746AIA. With Coconut card coconut-007 the header becomes 11 07 … → CEDQHBYQAAC77TYBAA.
>
> Decoding is strict (unknown version or flags, truncation, or no known card → not a code), so a malformed code never half-imports. Unrecognised ids inside an otherwise valid code surface in the import dialog’s resolution picker.

## Community stats

The anonymous, community-wide aggregates behind the public stats pages, with no token needed. Two endpoints: ink-pair matchups per queue (/api/stats/meta, behind https://duels.ink/stats) and Coconut card usage (/api/stats/coconut, behind https://duels.ink/stats/coconut). Both are aggregate-only — no player names, no individual histories, no decklists, only counters, and only cells backed by enough samples to be non-identifying. Neither moves more than a few times a day, so fetch each once a day, cache it on your side, and serve your own users from that cache. If you publish figures derived from them, show the sample count and updatedAt next to them and link back to the page they came from.

### GET /api/stats/meta — Ink-pair matchups

Returns the stats page payload for one queue and one time scope. This is the same response the /stats page itself loads, so it carries more than is documented here. ONLY the fields listed under "Stable response fields" are a supported contract; every other key is internal to the page and can change or disappear without notice — do not build on it.

- **Authentication:** None — public, anonymous aggregates

- **Rate limit:** 60 requests / 60 s per IP

**Query parameters**

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `queue` | string | no | core-bo1 | Queue id — always pass it explicitly, the default follows the site’s main queue. One of core-bo1, core-bo3, infinity-bo1, infinity-bo3, core-ja-bo1, special-ja-bo1, quick-play, quick-play-infinity. The current list (with names and formats) is in meta.queues.active of any response. An unknown id answers 200 with empty arrays, not an error. |
| `era` | string | no | — | Restrict to one card-set era by key, e.g. set-13 — the usual choice for tournament preparation, since it drops games played before the current set. Keys are listed in meta.eras (currentEra, pastEras). Omit for the queue’s whole lifetime. |
| `period` | string | no | all_time | Time scope: all_time, week:YYYY-MM-DD (one week, by its start date) or weeks:YYYY-MM-DD,YYYY-MM-DD,… (several weeks summed). Valid week start dates are listed in meta.availableWeeks. Combine with era to keep a week list inside one era. |
| `ranks` | string | no | — | Comma-separated rank tiers — Common, Uncommon, Rare, Super Rare, Legendary, Epic, Enchanted, Iconic. Keeps only games where BOTH players were in the selected tiers. Ranked queues only; unknown names are ignored. meta.appliedRanks echoes what was applied. |

**Response**

JSON object. matchups holds one row per unordered pair of decks, written once: colorsA sorts before colorsB (compare the ink names joined with "/"), so look a matchup up under that ordering and flip the numbers when your deck is side B. Rates are percentages from 0 to 100, rounded to 2 decimals.

```json
{
  "meta": {
    "queueId": "core-bo1",
    "period": "season:019f6cf4-…",
    "selectedEraKey": "set-13",
    "appliedRanks": null,
    "appliedWeeks": null,
    "…": "(internal fields omitted)"
  },
  "activity": { "totalGames": 1393360, "…": "…" },
  "colorPairs": [
    { "colors": ["amber", "emerald"], "games": 573720, "wins": 297614, "winRate": 51.87, "firstPlayerWinRate": 59.85 }
  ],
  "matchups": [
    {
      "colorsA": ["amber", "amethyst"],
      "colorsB": ["amber", "emerald"],
      "games": 77583,
      "winsA": 37155,
      "winRate": 47.89,
      "firstPlayerGames": 38856,
      "firstPlayerWinRate": 57.86
    }
  ],
  "updatedAt": "2026-09-19T01:46:59.715Z"
}
```

**Stable response fields**

| Field | Type | Description |
|---|---|---|
| `meta.queueId` | string | The queue the response describes (echoes the resolved queue parameter). |
| `meta.period` | string | The resolved time scope. With era set this is an internal season id — treat it as opaque and read meta.selectedEraKey instead. |
| `meta.selectedEraKey` | string \| null | Era key that was applied, or null. |
| `meta.appliedRanks` | string[] \| null | Rank tiers that were applied, or null when unfiltered. |
| `meta.appliedWeeks` | string[] \| null | Week start dates summed by a weeks: period, or null. |
| `meta.availableWeeks[]` | {startDate, endDate, label, totalGames} | The weeks that can be requested for this queue, with their game volume. |
| `meta.eras` | {currentEra, pastEras[]} | Era keys, names and start/end timestamps for the queue’s format. |
| `meta.queues.active[]` | {id, name, format, gameMode, ranked} | Queues that can be requested. Only these five properties are stable. |
| `activity.totalGames` | number | Games in the requested scope — the sample size behind the whole response. |
| `colorPairs[]` | {colors, games, wins, winRate, firstPlayerWinRate} | Per-deck totals across all opponents. colors is 1 or 2 ink names; firstPlayerWinRate is that deck’s win rate in the games where it went first (null when none). |
| `matchups[].colorsA / colorsB` | string[] | The two decks, as sorted lists of ink names (amber, amethyst, emerald, ruby, sapphire, steel). Mono-ink decks have one entry. |
| `matchups[].games` | number | Games between the two decks. In bo3 queues this counts finished MATCHES, not individual games. Rows under 5 games are omitted. |
| `matchups[].winsA` | number | Wins for side A. Draws count toward games but toward neither side, so B’s wins are not exactly games − winsA. |
| `matchups[].winRate` | number | Side A’s win rate, winsA / games. |
| `matchups[].firstPlayerGames` | number | Games in which side A went first (bo3: started game 1). Side A was on the draw in the remaining games − firstPlayerGames, minus a handful of old games with no recorded starting player. |
| `matchups[].firstPlayerWinRate` | number \| null | Side A’s win rate in the games where A went first. null when firstPlayerGames is 0. |
| `updatedAt` | ISO 8601 \| null | When the underlying aggregates were last computed. Show this as the data’s date. |

**Example**

```bash
# Current-set Core BO1 matchups, revalidated with the ETag from the last fetch
curl -s "https://duels.ink/api/stats/meta?queue=core-bo1&era=set-13" \
  -H 'If-None-Match: "<etag-from-last-response>"'
```

> Every response carries an ETag. Send it back as If-None-Match and an unchanged payload answers 304 with no body — a daily poll costs almost nothing.
>
> Mirror matchups (colorsA equals colorsB) are included. There winRate sits near 50 by symmetry and side A is simply one of the two seats, so firstPlayerWinRate is the figure that matters: the win rate of the player on the play, measured on roughly half the mirror’s games.
>
> Narrow scopes get thin quickly: one week at two rank tiers can leave most cells under a few dozen games. Always weigh a rate by its games count.
>
> Archetype-level fields (profiles, archetypeMatchups, archetypeOpening, pairCardLift) are not part of this contract and are empty for anonymous callers.

### GET /api/stats/coconut — Coconut card usage

Card-usage aggregates for the Coconut format: which cards the community publishes in its decks, which cards actually get played in the Coconut matchmaking queue, and how each printed Coconut performs, with EDHREC-style inclusion and synergy figures. The whole payload is returned in one response — no paging and no per-caller variation, so every consumer asking for the same window sees exactly the same numbers.

- **Authentication:** None — public, anonymous aggregates

- **Rate limit:** 60 requests / 60 s per IP

**Query parameters**

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `window` | string | no | all | Time window the aggregates are restricted to: all, 30d or 7d. Decks are filtered by when they were last edited, games by when they finished; games older than the ended-at column exist only in all. Each window is computed and cached separately, and the applied one is echoed as window in the response. An unknown value is a 400. |

**Response**

JSON object with two independent blocks. decks aggregates PUBLIC community decklists (what people build); games aggregates FINISHED private-table games (what people play), one row per human seat. Every card is keyed by its canonical id, so alternate-art, Enchanted and promo printings are already merged, and carries its own inks and set — group by those to get "most played by ink" or "newest cards". Percentages are 0–100 rounded to 1 decimal; costCurve entries are mean copies per deck, to 2 decimals.

```json
{
  "format": "Coconut",
  "window": "all",
  "thresholds": { "minDecksPerCoconut": 3, "minDecksPerCoconutCard": 2, "minGamesForWinRate": 10 },
  "decks": {
    "totalDecks": 412,
    "cards": [
      {
        "cardId": "1-1", "name": "Ariel - On Human Legs", "inks": ["amber"], "type": "character",
        "cost": 4, "set": "1",
        "decks": 301, "potentialDecks": 340, "inclusionPct": 88.5, "decksPct": 73.1,
        "avgCopies": 1, "synergy": null
      }
    ],
    "coconuts": [
      {
        "coconutId": "coconut-001",
        "name": "Scar - Finally King",
        "inks": ["steel"],
        "rank": 1,
        "decks": 58,
        "decksPct": 14.1,
        "cards": [
          {
            "cardId": "1-1", "name": "Ariel - On Human Legs", "inks": ["amber"], "type": "character",
            "cost": 4, "set": "1",
            "decks": 41, "potentialDecks": 44, "inclusionPct": 93.2, "decksPct": 70.7,
            "avgCopies": 1, "synergy": 4.7
          }
        ],
        "inkCombos": [
          { "inks": ["amber", "steel"], "decks": 39, "decksPct": 67.2 },
          { "inks": ["ruby", "steel"], "decks": 19, "decksPct": 32.8 }
        ],
        "costCurve": [0, 5.41, 9.12, 8.03, 7.88, 6.21, 3.45, 1.9, 0.83, 0.1, 0],
        "similar": [
          { "coconutId": "coconut-004", "name": "Stitch - Rock Star", "inks": ["amber"], "overlapPct": 38.9 }
        ]
      }
    ]
  },
  "games": {
    "totalGames": 233,
    "totalSeats": 512,
    "decidedGames": 221,
    "gamesBySeatCount": { "2": 180, "3": 31, "4": 22 },
    "cards": [
      { "cardId": "1-1", "name": "Ariel - On Human Legs", "inks": ["amber"], "type": "character", "cost": 4, "set": "1", "playPct": 19, "inclusionPct": 45, "winRate": 48 }
    ],
    "coconuts": [
      {
        "coconutId": "coconut-001", "name": "Scar - Finally King", "inks": ["steel"],
        "rank": 1, "games": 171, "wins": 83, "winRate": 48.8,
        "cards": [
          { "cardId": "2-190", "name": "…", "inks": ["steel"], "type": "character", "cost": 3, "set": "2", "playPct": 90, "inclusionPct": 90, "winRate": 51, "synergy": 21 }
        ],
        "inkCombos": [
          { "inks": ["ruby", "steel"], "games": 96, "gamesPct": 56.1, "wins": 53, "winRate": 55.2 }
        ],
        "costCurve": [0, 7.1, 9.8, 10.2, 8.4, 5.1, 3.3, 1.4, 0.8, 0.2, 0.1],
        "similar": []
      }
    ]
  },
  "updatedAt": "2026-09-22T06:11:04.882Z"
}
```

**Stable response fields**

| Field | Type | Description |
|---|---|---|
| `format` | "Coconut" | Always the literal string Coconut — this endpoint covers that format alone. |
| `window` | "all" \| "30d" \| "7d" | The window that was applied — echoes the window parameter, all when it was omitted. |
| `thresholds.minDecksPerCoconut` | number | A coconut needs this many public decks before its per-coconut card list is published. Below it the coconut still appears with its deck count and an empty cards array. |
| `thresholds.minDecksPerCoconutCard` | number | Inside a published per-coconut list, cards run by fewer decks than this are omitted. |
| `thresholds.minGamesForWinRate` | number | Decided games required before any winRate is filled in; below it the rate is null. |
| `decks.totalDecks` | number | Public community Coconut decks counted — the denominator behind decks.cards[].decksPct and decks.coconuts[].decksPct. Site preset/precon decks are excluded. |
| `decks.cards[]` | object[] | Every card seen in at least one public deck, sorted by decks descending, then name. |
| `decks.cards[].cardId` | string | Canonical card id, e.g. "3-55" (set-number). Reprints of the same card share it. |
| `decks.cards[].name` | string | English full name, "Name - Title". The reference is English-only; translate on your side if needed. |
| `decks.cards[].inks` | string[] | The CARD’s own ink(s), 1 or 2, from amber, amethyst, emerald, ruby, sapphire, steel — not the deck’s inks. Bucket cards by this to build a "most played by ink" view. |
| `decks.cards[].type` | string | Card type as printed: character, action, item, location, song. |
| `decks.cards[].cost` | number | Ink cost as printed. |
| `decks.cards[].set` | string | Set token of the canonical id — "3" in "3-55", "D23" in "D23-1". The highest numeric token present is the newest set in the data, so "cards from the new set" is a client-side filter. |
| `decks.cards[].decks` | number | Public decks running at least one copy. A deck counts once however many copies it runs. |
| `decks.cards[].potentialDecks` | number | Decks of the surrounding block that could legally run the card: every deck sharing at least one ink with it. A dual-ink card counts a deck of EITHER of its inks, so its potentialDecks is the union, never the intersection. |
| `decks.cards[].inclusionPct` | number | decks / potentialDecks — EDHREC’s "% of decks", the figure to rank cards by. 0 when potentialDecks is 0. |
| `decks.cards[].decksPct` | number | decks as a percentage of the surrounding block: of decks.totalDecks at the top level, of that coconut’s decks inside decks.coconuts[].cards. Unlike inclusionPct it does not account for ink legality. |
| `decks.cards[].synergy` | number \| null | Inside decks.coconuts[].cards: inclusion in this coconut’s decks minus inclusion across every eligible deck of the format, in percentage points. Positive means the coconut, not the card’s raw quality, explains the card. null on the top-level decks.cards[], where there is nothing to compare against. |
| `decks.cards[].avgCopies` | number | Mean copies among the decks that run the card. Coconut is singleton, so this is 1 except for the cards a coconut grants a playset allowance to, which can reach 4. |
| `decks.coconuts[]` | object[] | Every printed Coconut with at least one public deck, sorted by decks descending, then coconut number. Created (workshop) coconuts are never listed — their decks still count toward decks.totalDecks and decks.cards. |
| `decks.coconuts[].rank` | number | 1-based rank by decks, ties broken by coconut number — the array is already in this order. |
| `decks.coconuts[].coconutId` | string | Printed coconut id, "coconut-001" … . |
| `decks.coconuts[].name` | string | English full name of the Coconut card, "Name - Subtitle". |
| `decks.coconuts[].inks` | string[] | The coconut’s ink(s), 1 or 2 — the inks a deck built on it must include. |
| `decks.coconuts[].decks` | number | Public decks built around this coconut. |
| `decks.coconuts[].decksPct` | number | Share of decks.totalDecks built around this coconut. |
| `decks.coconuts[].cards[]` | object[] | Same shape as decks.cards[], restricted to decks built around this coconut and with decksPct measured against that coconut’s deck count. EMPTY when decks is below thresholds.minDecksPerCoconut — that is a privacy floor, not an absence of cards. |
| `decks.coconuts[].inkCombos[]` | {inks, decks, decksPct} | The ink sets of this coconut’s decks (1–3 inks — Coconut allows three), counted and sorted by decks descending. Empty below thresholds.minDecksPerCoconut, like cards. |
| `decks.coconuts[].costCurve` | number[] | Mean copies per deck at each ink cost, index = cost, 11 entries (0–10, where 10 is "10 or more"), 2 decimals. Summing it gives the mean deck size. Empty below thresholds.minDecksPerCoconut. |
| `decks.coconuts[].similar[]` | {coconutId, name, inks, overlapPct} | Up to 5 other coconuts whose published card lists overlap this one’s, by Jaccard index (shared cards / cards in either list), sorted descending. Only coconuts whose own list is published take part, and zero overlap is omitted. |
| `games.totalGames` | number | Finished games of the Coconut matchmaking queue counted (private table games are not included). Abandoned games are excluded. |
| `games.totalSeats` | number | Human seats across those games — the population behind games.cards[].games. Bot seats are dropped, so this can be below the sum of seat counts. |
| `games.decidedGames` | number | Games whose winner could be attributed to a seat. Draws and games won by a seat that cannot be resolved are excluded; they still count in totalGames. |
| `games.gamesBySeatCount` | Record<string, number> | totalGames split by table size, keyed "2", "3", "4". Read it before reading any winRate — the baseline is 50 only in 2-seat games. |
| `thresholds.minSeatsForCardStats` | number | Game-side card figures (format-wide and per coconut) need this many seats in their block, and a card win rate this many decided seats. Below it the card list is empty. |
| `thresholds.minPlayersPerGameRow` | number | A game-side card row — and an ink combo’s winRate — needs this many DIFFERENT players behind it. |
| `thresholds.minPlayersPerCoconut` | number | A coconut’s played-deck card list, cost curve and similar coconuts need this many different players. |
| `games.cards[]` | object[] | Cards of the played decks, sorted by playPct descending, then name. cardId, name, inks, type and cost are exactly as in decks.cards[]. There are deliberately NO raw counts: played decks were never published, and exact per-card counts would let anyone diff two snapshots around one game and read the opponent’s list. Figures are whole percentages over at least thresholds.minSeatsForCardStats seats, so one game moves them by at most one point. Empty below that seat count; a card run by fewer than thresholds.minPlayersPerGameRow different players is omitted. |
| `games.cards[].playPct` | number | Share of the block’s seats whose deck ran the card, whole percent. |
| `games.cards[].inclusionPct` | number | Share of the seats that could legally run it (share at least one ink) that did, whole percent. |
| `games.cards[].winRate` | number \| null | Win rate of the seats that ran the card, in DECIDED games, whole percent; null below thresholds.minSeatsForCardStats decided seats. |
| `games.coconuts[]` | object[] | Printed coconuts played, sorted by games descending, then coconut number. coconutId, name, inks and rank are as in decks.coconuts[] (rank here is by games). games and wins are seats; winRate is wins over seats in decided games, 1 decimal, null below thresholds.minGamesForWinRate. |
| `games.coconuts[].inkCombos[]` | {inks, games, gamesPct, wins, winRate} | Every ink combination this coconut was played on, with its own seat count and win rate — "this coconut on these inks wins X%". Never withheld (a seat’s inks are visible to the table and name no card); winRate (1 decimal) is null below thresholds.minGamesForWinRate decided seats or thresholds.minPlayersPerGameRow different players. |
| `games.coconuts[].cards[]` | object[] | Cards of the decks played with this coconut: the games.cards[] fields measured among this coconut’s seats, plus synergy (this inclusionPct minus the format-wide games inclusionPct, whole points). EMPTY unless the coconut has thresholds.minPlayersPerCoconut different players and thresholds.minSeatsForCardStats seats. |
| `games.coconuts[].costCurve` | number[] | As decks.coconuts[].costCurve, per played seat, 1 decimal. Empty whenever cards is. |
| `games.coconuts[].similar[]` | {coconutId, name, inks, overlapPct} | As decks.coconuts[].similar[], over the played card lists. Empty whenever cards is. |
| `updatedAt` | ISO 8601 | When the aggregates were computed. Show this as the data’s date. |

**Example**

```bash
# Full Coconut aggregates, revalidated with the ETag from the last fetch
curl -s "https://duels.ink/api/stats/coconut?window=all" \
  -H 'If-None-Match: "<etag-from-last-response>"'
```

**Endpoint-specific errors**

- `400` — window is present but is not one of all, 30d, 7d.
- `429` — More than 60 requests in a minute from one IP.
- `503` — The aggregates could not be computed and no earlier copy is available — retry after the Retry-After delay.

> Fetch it at most once a day, cache the payload on your side and serve your own users from that cache. The aggregates are recomputed lazily a few times a day at most, so a tighter poll returns the same bytes.
>
> Every response carries an ETag. Send it back as If-None-Match and an unchanged payload answers 304 with no body. Access-Control-Allow-Origin is *, so a community site can fetch this straight from the browser.
>
> Show updatedAt and the relevant count (decks.totalDecks, or games.totalGames / the card’s games) next to any figure you publish, and link back to https://duels.ink/stats/coconut — the same numbers with the same caveats.
>
> "Most played by ink" is derived client-side: group decks.cards[] (or games.cards[]) by the entries of each card’s own inks array. A dual-ink card belongs to both buckets.
>
> SYNERGY is defined exactly as EDHREC defines it: inclusion in this coconut’s decks minus inclusion across every eligible deck of the format. A card can be in most decks of a coconut and still have a synergy near zero (everyone plays it anyway); a card with a high synergy is one this coconut, specifically, wants. Rank a coconut’s cards by synergy to get its identity, by inclusionPct to get its staples.
>
> INCLUSION is measured against potentialDecks, not against every deck: a card is only counted where it is legal, i.e. in decks sharing at least one of its inks. Use decksPct instead when you want the raw share of the whole format.
>
> A coconut with an empty cards array is a PRIVACY FLOOR, not a coconut nobody builds: below thresholds.minDecksPerCoconut decks the list would simply be one author’s decklist. Never render it as "no cards".
>
> Win rates come from private-table games, where 3- and 4-seat tables are common — in those the neutral baseline is 33 and 25, not 50. Weigh every rate against its sample (games.coconuts[].games, inkCombos[].games) and games.gamesBySeatCount.
>
> The payload is aggregate-only: no deck ids or names, no authors, no player names, no game ids, no per-game rows and no timestamps other than updatedAt. It cannot be joined back to individual decks or players, and there is no endpoint that extends it with those.
>
> If the aggregates cannot be computed and no previous copy is held server-side, the endpoint answers 503 with a Retry-After header. Keep your previous copy and try again later — it never answers 200 with an empty payload.

### GET /api/stats/coconut/card/{cardId} — One card in the Coconut format

Everything the whole-format payload knows about a single card, arranged as a card page: how often it is published, which Coconuts want it and how much (synergy), how it performs at the table, and up to 20 PUBLISHED decks that run it. Every aggregate is taken from the same cached payload /api/stats/coconut serves, so the two endpoints can never disagree.

- **Authentication:** None — public, anonymous aggregates

- **Rate limit:** 120 requests / 60 s per IP

**Query parameters**

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `cardId` | string | yes | — | Path parameter. Any printing id — a reprint resolves to its canonical id, and the response reports the canonical one. Ids of workshop cards (custom-…) and coconut ids are 404, not data. |
| `window` | string | no | all | As on /api/stats/coconut: all, 30d or 7d. It applies to the aggregates AND to publicDecks (by when each deck was last edited). |

**Response**

JSON object. decks describes the card across published decklists (with a per-coconut breakdown), games describes it across finished Coconut queue games, and publicDecks links real published decks running it. Deck percentages are 0–100 rounded to 1 decimal; game percentages are whole numbers.

```json
{
  "format": "Coconut",
  "window": "all",
  "card": { "cardId": "1-1", "name": "Ariel - On Human Legs", "inks": ["amber"], "type": "character", "cost": 4, "set": "1" },
  "thresholds": { "minDecksPerCoconut": 3, "minDecksPerCoconutCard": 2, "minGamesForWinRate": 10 },
  "decks": {
    "decks": 301,
    "potentialDecks": 340,
    "inclusionPct": 88.5,
    "avgCopies": 1,
    "coconuts": [
      {
        "coconutId": "coconut-001", "name": "Scar - Finally King", "inks": ["steel"],
        "decks": 41, "coconutDecks": 44, "inclusionPct": 93.2, "synergy": 4.7
      }
    ]
  },
  "games": { "playPct": 19, "inclusionPct": 45, "winRate": 48 },
  "publicDecks": [
    { "deckId": "019fb4ac-bc37-7f33-81cc-80a3c9daaebe", "name": "Coconut Tinkerbell", "coconutId": "coconut-015", "inks": ["amethyst", "emerald", "steel"], "likeCount": 3 }
  ],
  "updatedAt": "2026-09-22T06:11:04.882Z"
}
```

**Stable response fields**

| Field | Type | Description |
|---|---|---|
| `format` | "Coconut" | Always the literal string Coconut. |
| `window` | "all" \| "30d" \| "7d" | The window that was applied. |
| `card` | {cardId, name, inks, type, cost, set} | The CANONICAL card the request resolved to — request a reprint id and this is the merged printing the numbers belong to. Same shape as the card rows of /api/stats/coconut. |
| `thresholds` | object | The same thresholds the whole-format payload echoes; they explain the omissions below. |
| `decks.decks` | number | Published decks running at least one copy, in the window. |
| `decks.potentialDecks` | number | Published decks that could legally run it — those sharing at least one ink with it. |
| `decks.inclusionPct` | number | decks / potentialDecks, format-wide. This is the baseline every synergy below is measured against. |
| `decks.avgCopies` | number | Mean copies among the decks that run it. |
| `decks.coconuts[]` | object[] | How each Coconut uses the card, most decks first. ONLY coconuts with at least thresholds.minDecksPerCoconut published decks appear, and only those whose card list actually reached the card — an absent coconut is a privacy floor or a card below thresholds.minDecksPerCoconutCard there, never a zero. |
| `decks.coconuts[].decks` | number | Decks built around that coconut which run the card. |
| `decks.coconuts[].coconutDecks` | number | All published decks built around that coconut — the denominator of inclusionPct. |
| `decks.coconuts[].inclusionPct` | number | decks / coconutDecks. Identical to the number in that coconut’s cards[] row of /api/stats/coconut. |
| `decks.coconuts[].synergy` | number | inclusionPct here minus decks.inclusionPct above, in percentage points — EDHREC’s synergy, the reason to sort this list. |
| `games.playPct` | number \| null | The card’s games.cards[].playPct from the whole-format payload; null when that list has no row for it (below the seat or player floors). No raw counts, by design — see games.cards[]. |
| `games.inclusionPct` | number \| null | As games.cards[].inclusionPct; null likewise. |
| `games.winRate` | number \| null | As games.cards[].winRate, whole percent; null below thresholds.minSeatsForCardStats decided seats. In 3- and 4-seat games the neutral baseline is 33 and 25, not 50. |
| `publicDecks[]` | {deckId, name, coconutId, inks, likeCount} | Up to 20 decks running the card, most liked first, then by name. These are decks their owners PUBLISHED to the community page — open one at https://duels.ink/decks/{deckId}/view. There is no author, no owner id and no timestamp: the link is to the list, never to a person. coconutId is null when the deck is built on a created (workshop) coconut. |
| `updatedAt` | ISO 8601 | When the underlying aggregates were computed — the same value /api/stats/coconut reports for this window. |

**Example**

```bash
# One card's Coconut page, revalidated with the ETag from the last fetch
curl -s "https://duels.ink/api/stats/coconut/card/1-1?window=all" \
  -H 'If-None-Match: "<etag-from-last-response>"'
```

**Endpoint-specific errors**

- `400` — window is present but is not one of all, 30d, 7d.
- `404` — The id does not resolve to a real catalog card (unknown id, a workshop card, a coconut id).
- `429` — More than 120 requests in a minute from one IP.
- `503` — The underlying aggregates could not be computed and no earlier copy is available — retry after the Retry-After delay.

> Fetch /api/stats/coconut once, then call this endpoint only for the cards you actually render — everything but publicDecks is already derivable from that payload.
>
> Every response carries an ETag and Access-Control-Allow-Origin: *, exactly like /api/stats/coconut.
>
> publicDecks is the ONLY deck-level data in this API, and it is data the deck owners already made public. It never carries an author, and there is no endpoint that turns a deckId back into a person.
>
> A card nobody has published yet answers 200 with zeroes and empty lists, not 404. A 404 means the id is not a real card at all.

## Match history row reference

Every format of GET /api/me/match-history emits these fields, one row per game. CSV columns appear in this order.

| Field | Type | Description |
|---|---|---|
| `game_id` | string | Unique game identifier. Use with /g/{game_id} and bulk-gamelogs. |
| `match_id` | string \| null | Best-of-N match this game belongs to, if any. |
| `match_format` | string \| null | Match format (e.g. bo3) when part of a match. |
| `match_game_number` | number \| null | 1-based game number within the match. |
| `mode` | 'matchmaking' \| 'private' \| 'bot' | How the game was created. |
| `queue_id` | string \| null | Matchmaking queue id (null for private/bot games). |
| `queue_name` | string \| null | Human-readable queue name. |
| `ranked` | boolean | Whether the queue was ranked. |
| `season_id` | string \| null | Season the game was played in, for ranked queues. |
| `season_name` | string \| null | Human-readable season name. |
| `started_at` | ISO 8601 | Game start time (UTC). |
| `ended_at` | ISO 8601 | Game end time (UTC). |
| `duration_seconds` | number \| null | Wall-clock game duration. |
| `turns` | number \| null | Number of turns played. |
| `result` | 'win' \| 'loss' \| 'draw' \| 'abandoned' \| null | Outcome from your perspective. |
| `end_reason` | 'lore' \| 'concede' \| 'abandoned' \| 'unknown' \| null | How the game ended. |
| `your_player` | 1 \| 2 | Which seat you occupied. |
| `went_first` | boolean \| null | Whether you took the first turn. |
| `your_lore` | number | Your final lore total. |
| `opp_lore` | number | Opponent’s final lore total. |
| `mmr_before` | number \| null | Your rating before the game (ranked only). |
| `mmr_after` | number \| null | Your rating after the game (ranked only). |
| `mmr_delta` | number \| null | Rating change from this game. |
| `is_placement` | boolean | Whether the game was a placement game. |
| `placement_number` | number \| null | Which placement game (1-based), when applicable. |
| `your_user_id` | string | Your user id (constant across all rows). |
| `your_deck_id` | string \| null | Id of the deck you played, if it still exists. |
| `your_deck_colors` | string \| null | Ink colors of your deck (e.g. "amber/steel"). |
| `your_decklist` | {cardId, count}[] \| null | Your aggregated decklist, sorted by cardId. JSON-encoded string inside CSV cells; structured array in JSON/JSONL. |
| `opp_display_name` | string | Opponent’s display name at the time of the game. |
| `opp_guest` | boolean | Whether the opponent was an anonymous guest. |
| `opp_is_bot` | boolean | Whether the opponent was a bot. |
| `opp_deck_colors` | string \| null | Opponent’s deck colors (public during play). The opponent’s decklist is never included. |
| `opp_mmr_before` | number \| null | Opponent’s rating before the game (ranked only). null for bots, guests, and opponents still in placement at the time (fewer than 10 ranked games that season). |
| `replay_id` | string \| null | Replay identifier, when a replay exists. Use with /r/{replay_id} and bulk-replays. |
| `replay_filename` | string \| null | Suggested filename for the replay blob. |
| `replay_url` | string \| null | Absolute download URL for the replay (.replay.gz). |
| `gamelog_id` | string | Gamelog identifier (equals game_id). |
| `gamelog_filename` | string | Suggested filename for the gamelog blob. |
| `gamelog_url` | string | Absolute download URL for the gamelog (.logs.gz). |

## Recipes

### Export your full match history

Follow next_cursor until it is null. With limit=250 a 10,000-game history completes in 40 sequential requests, comfortably inside the 20 req/min limit.

```bash
TOKEN="<your-token>"
BASE="https://duels.ink"
CURSOR=""
: > history.jsonl
while :; do
  URL="$BASE/api/me/match-history?format=json&limit=250${CURSOR:+&cursor=$CURSOR}"
  PAGE=$(curl -sf -H "Authorization: Bearer $TOKEN" "$URL")
  echo "$PAGE" | jq -c '.games[]' >> history.jsonl
  CURSOR=$(echo "$PAGE" | jq -r '.next_cursor // empty')
  [ -z "$CURSOR" ] && break
done
wc -l history.jsonl
```

### Download every replay

Enumerate replay ids from match history, exchange them for URLs via the bulk manifest, then fetch each file (keep parallelism ≤ 3 to stay under the concurrency cap).

```bash
# 1. Collect replay ids (after the export loop above)
jq -r 'select(.replay_id != null) | .replay_id' history.jsonl > replay-ids.txt

# 2. Exchange ids for download URLs, 1000 per call
mkdir -p replays
split -l 1000 replay-ids.txt chunk_
for f in chunk_*; do
  IDS=$(jq -R . "$f" | jq -sc .)
  curl -sf -X POST "https://duels.ink/api/me/bulk-replays" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"ids\": $IDS}" \
  | jq -r '.files[] | [.filename, .url] | @tsv' \
  | while IFS=$'\t' read -r NAME URL; do
      curl -sfL -H "Authorization: Bearer $TOKEN" -o "replays/$NAME" "$URL"
    done
done
```

### Load match history into pandas

The CSV format is designed for direct DataFrame ingestion; the your_decklist column holds a JSON-encoded array inside each CSV cell.

```python
import io, json, requests, pandas as pd

BASE = "https://duels.ink"
HEADERS = {"Authorization": "Bearer <your-token>"}

frames, url = [], f"{BASE}/api/me/match-history?format=csv&limit=250"
while url:
    r = requests.get(url, headers=HEADERS, timeout=30)
    r.raise_for_status()
    frames.append(pd.read_csv(io.StringIO(r.text)))
    url = r.links.get("next", {}).get("url")  # Link: <…>; rel="next"

df = pd.concat(frames, ignore_index=True)
df["your_decklist"] = df["your_decklist"].map(
    lambda v: json.loads(v) if isinstance(v, str) and v else None
)
print(len(df), "games,", df["result"].value_counts().to_dict())
```

### Run a tournament match

Create a seat-locked table for two entrants, hand them the link, then poll until the game exists. The organizer holds a spectator chair, so the same account can watch live at /spectate/{gameId}.

```bash
TOKEN="<your-token>"
BASE="https://duels.ink"

# 1. Create the table: seats locked to the two entrants, entrant 1 on the play.
#    Registered decklists ("deck") are optional — with them, each entrant's list
#    is locked to their seat: they review it at the table but cannot change it.
TABLE=$(curl -sf -X POST "$BASE/api/table/create" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "asSpectator": true,
    "players": [
      { "player": "AMBER-DRAGON-1234", "deck": "4 Tipo - Growing Son\n4 Pawpsicle\n…" },
      { "player": "FROZEN-OWL-5678",   "deck": "4 Elsa - Spirit of Winter\n…" }
    ],
    "firstPlayer": "AMBER-DRAGON-1234",
    "timerPreset": "standard"
  }')
TABLE_ID=$(echo "$TABLE" | jq -r .tableId)
echo "Join link: $(echo "$TABLE" | jq -r .url)"   # send this to both entrants

# 2. Poll until the host-side start hands off to a game (10 s cadence is plenty).
while :; do
  VIEW=$(curl -sf "$BASE/api/table/$TABLE_ID/view" | jq .view)
  STATUS=$(echo "$VIEW" | jq -r .status)
  [ "$STATUS" = "completed" ] && { echo "Game: $BASE/spectate/$(echo "$VIEW" | jq -r .gameId)"; break; }
  [ "$STATUS" = "cancelled" ] && { echo "Table was cancelled"; break; }
  sleep 10
done

# 3. After the game ends, both entrants' own /api/me/match-history rows carry
#    the result and replay/gamelog URLs for this game_id.
```

### Build a play/draw matchup table

One anonymous request per queue per day is enough. Each matchup row is written from side A’s perspective, so derive the on-the-draw numbers by subtraction and mirror the row to get side B’s view.

```python
import requests

BASE = "https://duels.ink"
r = requests.get(f"{BASE}/api/stats/meta",
                 params={"queue": "core-bo1", "era": "set-13"}, timeout=30)
r.raise_for_status()
data = r.json()
print("data as of", data["updatedAt"], "-", data["activity"]["totalGames"], "games")

def pct(wins, games):
    return round(100 * wins / games, 2) if games else None

table = {}  # (deck, opponent) -> stats from deck's point of view
for m in data["matchups"]:
    a, b = "/".join(m["colorsA"]), "/".join(m["colorsB"])
    games, wins_a, play_games = m["games"], m["winsA"], m["firstPlayerGames"]
    play_wins = round((m["firstPlayerWinRate"] or 0) / 100 * play_games)
    draw_games, draw_wins = games - play_games, wins_a - play_wins
    table[(a, b)] = {
        "games": games, "win_rate": m["winRate"],
        "on_play": (play_games, pct(play_wins, play_games)),
        "on_draw": (draw_games, pct(draw_wins, draw_games)),
    }
    if a != b:  # side B's view: B is on the play exactly when A is on the draw
        # (treats the rare drawn game as a B win — negligible at these volumes)
        table[(b, a)] = {
            "games": games, "win_rate": pct(games - wins_a, games),
            "on_play": (draw_games, pct(draw_games - draw_wins, draw_games)),
            "on_draw": (play_games, pct(play_games - play_wins, play_games)),
        }

print(table[("amber/emerald", "amber/amethyst")])
```

### Build a coconut page like EDHREC

One request gives you the whole format. Pick a coconut, sort its cards by synergy (what this coconut specifically wants) rather than by inclusion (what everyone plays anyway), group them by card type the way a decklist reads, and use the per-card endpoint only for the cards you render — it is what carries the links to real published decks.

```python
import requests

BASE = "https://duels.ink"
s = requests.Session()

data = s.get(f"{BASE}/api/stats/coconut", params={"window": "all"}, timeout=30).json()
print("as of", data["updatedAt"], "-", data["decks"]["totalDecks"], "published decks")

# 1. Pick a coconut. They arrive ranked by deck count already.
coconut = data["decks"]["coconuts"][0]
print(f'#{coconut["rank"]} {coconut["name"]} - {coconut["decks"]} decks ({coconut["decksPct"]}%)')

if not coconut["cards"]:
    raise SystemExit("card list withheld: fewer decks than thresholds.minDecksPerCoconut")

# 2. Sort by synergy, group by type — the EDHREC card-page layout.
by_type = {}
for card in sorted(coconut["cards"], key=lambda c: -c["synergy"]):
    by_type.setdefault(card["type"], []).append(card)

for card_type, cards in by_type.items():
    print(f"\n== {card_type} ==")
    for c in cards[:10]:
        print(f'  {c["name"]:<45} {c["inclusionPct"]:>5}% of eligible decks  synergy {c["synergy"]:+.1f}')

# 3. Ink split and curve come straight off the coconut row.
print("\ninks:", [(i["inks"], i["decksPct"]) for i in coconut["inkCombos"]])
print("curve:", coconut["costCurve"])  # index = cost, 10 = "10+"
print("similar coconuts:", [(c["name"], c["overlapPct"]) for c in coconut["similar"]])

# 4. For a card you actually render, the card endpoint adds published decks.
top = by_type[next(iter(by_type))][0]
detail = s.get(f'{BASE}/api/stats/coconut/card/{top["cardId"]}', timeout=30).json()
print(f'\n{detail["card"]["name"]}: {detail["decks"]["inclusionPct"]}% of eligible decks')
for deck in detail["publicDecks"][:5]:
    print(f'  {BASE}/decks/{deck["deckId"]}/view  {deck["name"]} ({deck["likeCount"]} likes)')
```

## Errors

Errors are JSON objects with an error message string: {"error": "..."}. The OAuth token endpoint (POST /api/oauth/token) instead uses the standard OAuth shape {"error": "<code>", "error_description": "..."} — see Sign in with duels.ink. Status codes:

| Status | Meaning |
|---|---|
| 400 | Malformed request — invalid JSON body, missing or out-of-range parameter. The error message says which. |
| 401 | Not authenticated — missing, invalid, expired or revoked token (and no valid session cookie). |
| 403 | Cross-origin request attempted cookie-only authentication. Send a Bearer token instead. |
| 404 | Resource not found — including resources you are not allowed to see (no existence hint is given). |
| 409 | Conflict — e.g. creating an 11th token when the per-user cap is 10. |
| 429 | Rate limit or concurrency cap hit. See Rate limits for the exact shapes. |
| 500 | Internal error. Safe to retry with backoff. |
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="api-docs.md" />
  <meta property="og:description" content="One daily markdown page: api-docs.md" />
  <meta property="og:url" content="https://api-docs.md" />
  <meta name="twitter:card" content="summary" />
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='12' fill='%23000'%3E%3C/rect%3E%3Ctext x='50%25' y='58%25' text-anchor='middle' font-size='36' font-family='monospace' fill='%23fff'%3Emd%3C/text%3E%3C/svg%3E" />
  <title>api-docs.md</title>
  <style>
:root { color-scheme: light dark; }
body {
  font: 16px/1.6 "IBM Plex Mono", "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  max-width: 72ch;
  margin: 4vh auto 5vh;
  padding: 0 1.5rem;
  background: var(--bg, #f8f8f5);
  color: var(--fg, #111);
  -webkit-font-smoothing: antialiased;
}
@media (prefers-color-scheme: dark) {
  :root { --bg: #0c0c0c; --fg: #e6e6e6; }
}
@media (prefers-color-scheme: light) {
  :root { --bg: #f8f8f5; --fg: #111; }
}
pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
}
footer {
  margin-top: 2.5rem;
  font-size: 12px;
  letter-spacing: 0.02em;
  opacity: 0.7;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
footer a {
  color: inherit;
  text-decoration: none;
}
.strong-italic {
  font-style: italic;
  font-weight: 600;
}
em { font-style: italic; }
strong { font-weight: 700; }
footer span, footer a { white-space: nowrap; }
@media (max-width: 340px) {
  footer { flex-direction: column; align-items: flex-start; }
}
}</style>
</head>
<body>
  <pre># The Quiet Work of APIs

## What an API Really Is

An API is not code. It is a promise. When one system speaks to another, it says, “Here is what I can do, exactly how I will answer, and when I will stay silent.” That promise is written in the dark so other programs can work without fear. The documentation we write is simply the careful translation of that promise into human words.

On a cool October morning in 2026 I sat with an old notebook and realized most of the software I depend on every day rests on thousands of these invisible agreements. They rarely make headlines, yet they hold the world together.

## The Bridge Between Minds

An API is a bridge built between two different ways of thinking. One side may speak in JSON, the other in objects or events or plain text. The bridge does not try to make them the same. It only makes sure they can meet safely in the middle. Good documentation is the handrail on that bridge, something steady you can hold while you cross.

I have watched junior developers grow confident the moment they realize the API is not judging them. It is simply waiting, patient and consistent, ready to respond the same way every single time. That reliability feels almost kind.

## A Small Story of Trust

Last spring a friend rebuilt an old internal tool that had been failing for years. The only thing that worked without complaint was the API layer written a decade earlier. No one remembered the original author, yet the system still answered every call with the same calm honesty. My friend said it felt like receiving a letter from someone who had never broken a promise. He kept the documentation open in a separate window for weeks, not because it was complicated, but because it felt trustworthy.

<em>*In the end, the best APIs teach us that clarity itself can be an act of care.*</em></pre>
  <footer>
    <span>Generated on 2026-10-15</span>
    <a href="https://steipete.me">a @steipete project</a>
  </footer>
</body>
</html>