# OG Dark RP Site And TV Kiosk

This Next.js app now has two public jobs:

- `/` is the default OG Dark RP landing page.
- `/embed/youtube` is the hosted YouTube kiosk wrapper for WIP-Dark-RP televisions.

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

Deploy this repo to Vercel. The site root is public-facing, and WIP-Dark-RP should keep using the `/embed/youtube` route as the TV kiosk base URL on the production or preview origin.

Use a referrer policy that preserves the origin for cross-origin requests. YouTube Error 153 means the embed request did not include a referrer or equivalent client identity.

## Notes

- Do not add arbitrary web browsing here.
- Do not add playlist support unless the game server queue model explicitly supports it.
- Do not put private signing secrets in shipped S&box gamemode code.
