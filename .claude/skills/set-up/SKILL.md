---
name: set-up
description: Set up icc-toolbox for a new dealer. Use when the user gives a dealer name and a build-site link (or types /set-up). Creates a slugged git branch from master, checks it out, and fills in .cssinjector.json so `npm run dev` opens that site.
---

# New Dealer Setup

Input: a **dealer name** and a **build-site URL**, in any format. Examples:

```
/set-up Camp-Site RV Inc https://www.campsiterv.com/
Dealer Name: Bennett's Camping Center & RV Park
Site Link: https://bennetts.interactrv.com
```

If either value is missing, ask for it before doing anything.

## 1. Parse and normalise

- **Dealer name**: trim it.
- **URL**: trim it. If there's no scheme, prefix `https://`. It must parse as a URL (`new URL(...)`) with an `http:` or `https:` scheme and a hostname. If it doesn't, stop and ask.
- **Branch slug** from the dealer name:
  1. Lowercase.
  2. Replace `&` with `and`.
  3. Remove apostrophes (`'` and `’`), so `Bennett's` → `bennetts`.
  4. Strip accents (`é` → `e`), for example with `normalize("NFD").replace(/[̀-ͯ]/g, "")`.
  5. Replace every run of characters that aren't `a-z0-9` with a single `-`.
  6. Trim `-` from both ends.

  Examples: `Camp-Site RV Inc` → `camp-site-rv-inc`, `Bennett's Camping Center & RV Park` → `bennetts-camping-center-and-rv-park`, `Mid-State Camper Sales` → `mid-state-camper-sales`.
- Check the slug with `git check-ref-format --branch <slug>`. If it's empty or invalid, stop and ask the user for a branch name.

## 2. Create the branch

1. Run `git status --porcelain`. If there are uncommitted changes, **stop**: show them and ask whether to commit, stash or discard. Never discard anything without asking.
2. `git checkout master`
3. `git pull --ff-only origin master`. If it fails (offline, or master has diverged), tell the user and ask whether to continue from local master.
4. If a branch named `<slug>` already exists locally (`git rev-parse --verify --quiet <slug>`) or on the remote (`git ls-remote --heads origin <slug>`), **stop and ask**. It may already be set up, and the user may just want `git checkout <slug>`. Never overwrite or reset an existing branch.
5. `git checkout -b <slug>`

## 3. Fill in `.cssinjector.json`

Read the current file (or copy `.cssinjector.example.json` if it's missing), then write it with:

| Key | Value |
|---|---|
| `url` | the normalised build-site URL |
| `stripPatterns` | `[]` (the ones on master belong to another dealer) |
| `username` / `password` | see the auth check below |
| everything else (`dir`, `include`, `exclude`, `headless`, `chromePath`, `scripts`, ...) | leave as it is |

Keep the result valid JSON with 2-space indentation.

**Auth check:** find out whether the site uses HTTP Basic Auth:

```bash
curl -s -o /dev/null -w "%{http_code}" -L --max-time 15 "<url>"
```

- `401` means it's protected. Retry with `-u interactrv:access`. If that returns `2xx`/`3xx`, set `"username": "interactrv"` and `"password": "access"`. If it still returns `401`, set them anyway, but tell the user those default credentials were rejected and ask for the right ones.
- `2xx`/`3xx` means no auth. Set both to `""`.
- Anything else (timeout, `000`, `5xx`): set the `interactrv`/`access` defaults (most build sites use them) and warn the user that the site couldn't be reached, so the URL needs checking.

Make sure the `styles/` directory exists (`mkdir -p styles`). It should already contain `.gitkeep`.

## 4. Commit

Commit the config on the new branch so the setup is saved with it:

```bash
git add .cssinjector.json
git commit -m "chore: set up <Dealer Name>"
```

Don't push unless the user asks.

## 5. Report

Tell the user, in a few lines:
- the branch name, and that it's checked out
- the configured URL
- whether basic auth is on (and the result of the auth check)
- the next step: `npm run dev`
