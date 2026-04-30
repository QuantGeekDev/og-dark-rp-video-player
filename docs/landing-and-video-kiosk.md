# Landing Page And Video Kiosk Architecture

This document records the April 2026 shift for `darkrp-tv-kiosk`: the app is no longer only a television embed wrapper. It also serves the public OG Dark RP landing page at the site root.

## Route Responsibilities

| Route | Audience | Responsibility |
| --- | --- | --- |
| `/` | Players, server visitors, marketing links | The default OG Dark RP landing page. It introduces the server, jobs, economy loops, law systems, vehicles, organizations, and launch notes. |
| `/join-server` | Players, Discord/chat links | Permanent HTTPS join page that attempts to open Steam and falls back to a manual button. |
| `/rules` | Players, staff, server visitors | A searchable rules browser generated from the mirrored `content/server-rules` markdown rulebook. |
| `/embed/youtube` | OG Dark RP `WebPanel` televisions | A fullscreen kiosk route that renders exactly one normalized YouTube queue item from the game. |
| `/api/health` | Deployment checks | Small health response for platform and tunnel checks. |

Keep these responsibilities separate. The landing page can be expressive and public. The kiosk route should stay small, predictable, and locked to the media state sent by the game.

## What Changed

The default home page moved from a placeholder kiosk status screen to a proper OG Dark RP landing page.

The TV system still lives at `/embed/youtube`, so existing game code should not point televisions at `/`. The landing page is for humans in a normal browser. The embed route is for in-game screens.

The root page uses OG Dark RP visual assets:

- `public/og-dark-rp-logo-no-bg.png`
- `public/og-dark-rp-splash.png`

The rules page uses markdown mirrored into `content/server-rules`. Keep the mirrored files current when the gamemode rulebook changes.

The global stylesheet now supports normal page scrolling while keeping `.kiosk` fixed and fullscreen for television playback.

## Video Player Flow

The game remains authoritative. The website does not decide what a TV should play.

```text
Player enters YouTube URL in OG Dark RP
  -> game validates ownership, cooldowns, permissions, range, and media rules
  -> game extracts only the YouTube video ID and start offset
  -> game syncs normalized TV state to clients
  -> client builds /embed/youtube query string
  -> S&box WebPanel loads the hosted kiosk route
  -> kiosk validates the query again
  -> kiosk creates a YouTube IFrame API player
  -> kiosk plays only the queued video and stops on drift or end
```

## Kiosk Query Contract

The kiosk route accepts normalized queue state, not raw user input.

Example:

```text
/embed/youtube?videoId=dQw4w9WgXcQ&start=42&volume=65&revision=7
```

Expected fields:

- `videoId`: the YouTube video ID selected by the game.
- `start`: optional start offset in seconds.
- `volume`: optional clamped player volume.
- `revision`: optional game-side queue revision used to force fresh playback state.

Do not pass playlist URLs, channel URLs, watch URLs, arbitrary iframe HTML, or user-provided browsing destinations into the kiosk. The game should parse and reduce user input before this app sees it.

## Kiosk Safety Rules

The kiosk must continue to:

- load the official YouTube IFrame Player API;
- pass a stable `origin` and `widget_referrer`;
- reject malformed query strings;
- block playlist and raw URL behavior;
- stop playback when the video ends;
- stop playback if YouTube drifts to a video ID other than the queued one;
- avoid general web browsing features;
- avoid storing private game secrets in client-shipped code.

The app-level CSP should continue to allow YouTube iframe/script/media needs while keeping the page locked down.

## OG Dark RP Integration

The active gamemode should configure its TV kiosk base URL to the hosted embed route, not the site root.

Production shape:

```text
https://<site-origin>/embed/youtube
```

Local development shape:

```text
http://localhost:3000/embed/youtube
```

The landing page can use the same production origin:

```text
https://<site-origin>/
```

## Discord And Launch CTAs

The landing page Discord CTA should stay in sync with the permanent invite used by the active gamemode pause menu:

```text
https://discord.gg/b2ursP823g
```

The source of truth in the gamemode is `Code/UI/OgPauseMenu.razor`, where `DiscordInviteUrl` feeds the rich pause-menu link.

For chat messages, use the permanent HTTPS route:

```text
https://ogdarkrp.com/join-server
```

Do not use `www.ogdarkrp.og`; the production domain is `ogdarkrp.com`. The `/join-server` page attempts to open the underlying Steam direct-connect URL and shows a manual button for browsers that block automatic external protocol navigation.

The underlying Steam direct-connect URL is:

```text
steam://connect/79.155.36.215:27016?appid=590830
```

The join route reads `NEXT_PUBLIC_OG_DARKRP_JOIN_URL` first, so Vercel can override the Steam target without a code deploy. Prefer replacing the IP form with a stable Steam server ID once `+net_game_server_token` is configured:

```text
steam://run/590830//+connect%20SERVER_STEAM_ID64/
```

The secondary CTA stays on the package page:

```text
https://sbox.game/artisan/darkrpog
```

That page is expected to expose the s&box package UI and play/server-list flow. The direct website button uses Steam's browser protocol because s&box accepts the `+connect` launch command.

Package modal shape:

```text
steam://run/590830//-rungame%20artisan.darkrpog/
```

Direct server shape:

```text
steam://run/590830//+connect%20<server-id-or-ip:port>/
```

## Development Checks

Use the standard project checks before deploying changes:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

For visual QA, verify:

- `/` at desktop and mobile widths;
- `/embed/youtube?videoId=dQw4w9WgXcQ` still fills the viewport;
- invalid kiosk queries still show the kiosk error state;
- `/api/health` still returns a healthy JSON response.

## Deployment Notes

Deploying the landing page and kiosk together is fine as long as the route split remains stable.

When changing headers in `next.config.ts`, test both surfaces:

- the landing page needs local images, CSS, and normal navigation;
- the kiosk needs YouTube iframe, script, image, connect, and media access.

If YouTube returns Error 153, check referrer/origin behavior first. The production route should preserve enough origin identity for YouTube embeds to recognize the host page.
