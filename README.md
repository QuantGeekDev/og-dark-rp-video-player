# OG Dark RP Site And TV Kiosk

<!-- Last redeploy bump: 2026-04-30 — rotate DISCORD_CLIENT_SECRET, retry /linkdiscord -->

This Next.js app now has three public jobs:

- `/` is the default OG Dark RP landing page.
- `/join-server` is the permanent chat/share link for opening the live server in s&box.
- `/embed/youtube` is the hosted YouTube kiosk wrapper for OG Dark RP televisions.
- `/link-discord` plus `/api/link-discord/*` is the Discord OAuth verifier that backs the in-game `/linkdiscord` reward command.

See [docs/landing-and-video-kiosk.md](docs/landing-and-video-kiosk.md) for the site shift, route contract, and video player architecture.

## TV Kiosk

The game sends only normalized queue state:

```text
/embed/youtube?videoId=dQw4w9WgXcQ&start=42&volume=65&revision=7
```

The page loads that one video through the official YouTube IFrame Player API, blocks playlist/raw URL parameters, stops on ended, and stops if the player drifts to any video ID other than the queued one.

## Development

```bash
npm run dev
```

Open [http://localhost:3000/](http://localhost:3000/) for the landing page.

Open [http://localhost:3000/embed/youtube?videoId=dQw4w9WgXcQ](http://localhost:3000/embed/youtube?videoId=dQw4w9WgXcQ).

## Checks

```bash
npm run lint
npm run test
npm run build
```

## Deployment

Deploy this repo to Vercel. The site root is public-facing, and OG Dark RP should keep using the `/embed/youtube` route as the TV kiosk base URL on the production or preview origin.

Use a referrer policy that preserves the origin for cross-origin requests. YouTube Error 153 means the embed request did not include a referrer or equivalent client identity.

## Discord link reward

Backs the gamemode's one-time `+$12,000` reward for joining our Discord. See
[`plans/April 29th - Discord Link Reward Plan.md`](../WIP-Dark-RP/plans/April%2029th%20-%20Discord%20Link%20Reward%20Plan.md)
in the gamemode repo for the full design.

Routes:

Public origin: `https://ogdarkrp.com` (production) and the Vercel preview origins.

- `POST /api/link-discord/issue` — gamemode → web. Issues a pairing code keyed
  to a Steam ID. Requires the `x-link-secret` header.
- `GET /link-discord?code=...` — landing page the player opens in a browser.
- `GET /api/link-discord/oauth/start?code=...` — redirects the player to
  Discord OAuth with an HMAC-signed `state`.
- `GET /api/link-discord/oauth/callback` — Discord OAuth completion. Verifies
  guild membership, atomically claims the per-Discord-id reward ledger.
- `GET /api/link-discord/status?code=...` — gamemode poll endpoint. Requires
  the `x-link-secret` header. Use `&consume=1` after the gamemode has banked
  the reward.

Setup:

1. Create a Discord developer app at <https://discord.com/developers/applications>.
   Add OAuth2 redirect URIs for both production and `http://localhost:3000`.
2. Capture our Discord guild ID. Enable Developer Mode in Discord, then
   right-click the server icon → **Copy Server ID**.
3. Install the **Upstash for Redis** integration from the Vercel Marketplace
   into this project. It auto-injects `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
4. Set the rest of the env vars listed in [`.env.example`](./.env.example).
   Generate `LINK_SHARED_SECRET` with `openssl rand -hex 32` and paste the same
   value into the gamemode's `drp.discord_link_shared_secret` ConVar.
5. Pull env vars locally for dev:

   ```bash
   npx vercel link
   npx vercel env pull .env.development.local
   ```

Troubleshooting:

- **`token_exchange_failed`** — redirect URI mismatch. The value in
  `DISCORD_REDIRECT_URI` must exactly match one of the URIs registered in
  the Discord developer portal, including scheme and trailing slash.
- **`not_in_guild`** — the player isn't a member of `DISCORD_REQUIRED_GUILD_ID`
  yet. Ask them to use the invite first, then retry.
- **`invalid_state` / 401 from gamemode** — `LINK_SHARED_SECRET` mismatch.
  Compare the Vercel env var against the gamemode's
  `drp.discord_link_shared_secret` ConVar.
- **`kv_unavailable`** — Upstash provisioning incomplete. Confirm
  `KV_REST_API_URL` and `KV_REST_API_TOKEN` exist in the Vercel project env
  for the relevant scope (Production / Preview / Development).

## Notes

- Do not add arbitrary web browsing here.
- Do not add playlist support unless the game server queue model explicitly supports it.
- Do not put private signing secrets in shipped S&box gamemode code.
