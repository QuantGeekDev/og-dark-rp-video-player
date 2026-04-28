# Guides Content Pipeline

The website guides section is generated from the OG Dark RP game repo guides.

## Source

- Author player-facing guide markdown in `../WIP-Dark-RP/guides`.
- Each guide should keep the existing frontmatter shape: `id`, `title`, `category`, `order`, `audience`, `updated`, `summary`, `aliases`, and `related`.
- The body should use `## Quick Start`, `## Details`, and `## Gotchas` so the website and in-game guide UI stay aligned.

## Website Snapshot

The deployable website reads from `content/guides`, not directly from the game repo. This keeps Vercel builds self-contained.

To refresh the website snapshot:

```bash
npm run sync:guides
npm run lint
npm run build
```

Commit the generated `content/guides` changes with the website changes when the guides are ready to ship.

## Custom Source Path

If the game repo is not a sibling folder, point the sync script at the guide source:

```bash
OG_DARK_RP_GUIDES_SOURCE=/absolute/path/to/WIP-Dark-RP/guides npm run sync:guides
```

On Windows PowerShell:

```powershell
$env:OG_DARK_RP_GUIDES_SOURCE="C:\path\to\WIP-Dark-RP\guides"; npm run sync:guides
```

