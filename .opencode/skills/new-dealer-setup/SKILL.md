---
name: new-dealer-setup
description: Use when the user provides dealer information (Dealer Name, Site Link, FR Link) or starts with /set-up. Creates a git branch and configures .cssinjector.json with auth defaults.
---

# New Dealer Setup

## Usage

When the user provides text like:
```
Dealer Name: Country Motor Homes
Site Link: https://www.countrymotorhomes.com/
FR Link: 0110957
```

Extract the fields and execute the following steps:

## Workflow

### 1. Extract fields
- **Dealer Name**: The full name (e.g. "Country Motor Homes")
- **Site Link**: The URL (e.g. "https://www.countrymotorhomes.com/")
- **FR Link**: The FR number (e.g. "0110957")

### 2. Create git branch
Convert the dealer name to kebab-case (all lowercase, spaces replaced with hyphens, no special characters):
- "Country Motor Homes" → `country-motor-homes`

Check out a new branch from master:
```
git checkout master
git pull
git checkout -b <dealer-name-kebab>
```

### 3. Configure `.cssinjector.json`
Set the `url` field to the **Site Link** value. Set `username` and `password` for HTTP Basic Auth (leave empty if the site doesn't need auth):
```json
{
  "url": "<site-link>",
  "dir": "./styles",
  "include": "**/*.css",
  "exclude": "",
  "headless": false,
  "stripPatterns": [],
  "username": "interactrv",
  "password": "access"
}
```

### 4. Ensure styles directory exists
Confirm that `./styles` directory exists (create if missing).

## Output
After completing the setup, report to the user:
- The branch name created
- The URL configured in `.cssinjector.json`
