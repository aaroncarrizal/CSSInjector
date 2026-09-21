# AI Search Assistant (Filters / AI modes) — integration guide

How the IRV **AI Search** home-hero works, and the CSS/JS needed to drop it
into a new client. The copy-paste CSS lives in
[`ai-search-modes.css`](ai-search-modes.css) (it also contains the desktop
one-line filter-form layout).

> **Read §1 first.** With the canonical markup below the integration is a small,
> build-agnostic CSS file. Most of the historical pain came from the AI bundle
> being dropped into a legacy `#topSearchForm` shell and reusing
> `.home-hero-search` — both are avoided by the markup contract.

## 1. Canonical markup (the contract)

The bundle is `.search-toggle-wrapper` (tabs + filter form + AI widget) placed
inside a shell. There are **two shells** — one per breakpoint — and exactly
**one** `#topSearchForm`:

```html
<!-- Desktop hero shell -->
<div class="ai-search-shell" id="topSearchFormDesktop">
  <div class="search-toggle-wrapper">

    <!-- Snippet 527811 — mode tabs -->
    <div class="ai-search-mode-tabs">
      <button data-ai-search-mode="filters" class="ai-search-mode-tabs__btn is-active">Filters</button>
      <button data-ai-search-mode="ai" class="ai-search-mode-tabs__btn">AI Search <span class="ai-search-mode-tabs__badge">New!</span></button>
    </div>

    <!-- Wrap the RvSearch macro in .ai-search-filters (NOT .home-hero-search) -->
    <div class="ai-search-filters">
      <div id="topSearchForm" class="SearchPanel form-inline">…selects… <button class="SearchButton">Search</button></div>
    </div>

    <!-- Snippet 527812 — AI widget -->
    <div class="ai-search-cta-widget">…prompt form + suggestions…</div>
  </div>
</div>

<!-- Mobile header shell (toggled by the header Search button) -->
<div id="top-search-container">
  <div class="collapse top-search">
    <div id="topSearchFormMobile" class="SearchPanel form-inline">
      <!-- same .search-toggle-wrapper bundle as above -->
    </div>
  </div>
</div>
```

The reference markup is in [`html/ai-widget.html`](html/ai-widget.html); the
standalone Assistant button is in
[`html/mobile-ai-button.html`](html/mobile-ai-button.html).

### Rules

| # | Rule | Why |
|---|------|-----|
| 1 | The **shell** must never use `id="topSearchForm"` (use `ai-search-shell` / `#topSearchFormDesktop` / `#topSearchFormMobile`). | `ai-search-cta.css` hides `#topSearchForm` in AI mode; if the shell shares that id it hides the AI widget's own ancestor and AI mode renders empty. |
| 2 | The filter container is **`.ai-search-filters`**, never `.home-hero-search`. | Themes style/hide `.home-hero-search` for the hero (e.g. `display:none`), which hid the whole filter form. |
| 3 | Only the form's `.SearchButton` exists — the shell has none. | A stray button renders as a second/duplicate search button. |
| 4 | Keep the mobile shell in `.collapse.top-search` with a unique id (`#topSearchFormMobile`). | The header Search button toggles `.collapse.top-search`; this is the mobile "nav filters" hook. |
| 5 | `.ai-search-cta-go` is a normal sibling (nav dropdown / page), not inside a full-bleed section pseudo. | `#rv-types::before` etc. paint over static content; the CSS lifts it, but don't nest it if avoidable. |

## 2. What it is

| Part | Element | What it does |
|------|---------|--------------|
| Mode tabs | `.ai-search-mode-tabs` | "Filters" / "AI Search `New!`" (`data-ai-search-mode="filters"|"ai"`) |
| Filter form | `.ai-search-filters > #topSearchForm` | Year / Type / Features / Length / Stock selects + `Find My Rv` |
| AI widget | `.ai-search-cta-widget` | Free-text "Describe your ideal RV …" + suggestion chips |
| Assistant CTA | `.ai-search-cta-go` | Links to `/search-assistant` (mobile/tablet AI entry) |

## 3. How mode switching works

- The site's `ai-search-cta.js` toggles classes on **`<html>`**: `search-mode-ai`
  **or** `search-mode-filters`.
- `ai-search-cta.css` then does (roughly):
  - `html:not(.search-mode-ai) .ai-search-cta-widget { display:none }` → AI widget only in AI mode.
  - `html.search-mode-ai #topSearchForm { display:none }` → filter form only in Filters mode.
- The active tab comes from `sessionStorage`
  (`aiSearchCta.searchMode` + `aiSearchCta.searchModeUserSet`) falling back to
  `window.AISearchConfig.defaultSearchMode` (default `filters`).
- [`../js/default-filters-tab.js`](../js/default-filters-tab.js) forces
  **Filters** as the default each load (see its trade-off note).

The **header Search button**
(`<button data-toggle="collapse" data-target=".top-search">`) is *not* an AI
tab — it is a plain Bootstrap collapse that only shows/hides the mobile
`.top-search` panel. It does **not** change filters/AI mode; it reveals the
currently-active mode.

## 4. Mobile behaviour (header Search → filters)

On phones/tablets:

- The header **Search** button opens `.collapse.top-search` (the mobile shell).
- The panel shows the **filter form only** — the tabs and AI widget are hidden
  (`≤1199px` in the CSS).
- The **Assistant CTA** is the mobile AI entry: shown on mobile/tablet, hidden
  on desktop (`≥1200px`).
- Filter rows wrap (2 per row on phones, 3 on tablets) so the desktop one-line
  form isn't crushed.

If the tabs sit on a light mobile panel, uncomment §5 of
`ai-search-modes.css` to recolour them with the accent.

## 5. Button / accent colouring

One variable: **`--ai-search-bg-color`**.

| Target | Source |
|--------|--------|
| AI Search submit button | `ai-search-cta.css` → `var(--ai-search-bg-color, var(--primary-bg-color, #333))` |
| AI input border | same var |
| Sparkles icon | same var (`color`; SVG uses `fill="currentColor"`) |
| Filters `Find My Rv` button | §3 of the CSS (`#topSearchForm .SearchButton`) |
| Mode tabs (light-panel option) | §5 of the CSS |
| Assistant CTA border | §6 of the CSS (`.ai-search-cta-go`) |

Set `--ai-search-bg-color` / `--ai-search-hover-color` once. If the AI
button/input/sparkles stay `#333`, the variable never took (the theme also
defines `--primary-bg-color`, which is the next fallback).

## 6. Breakpoints used

| Width | Tabs | AI widget | Filter form | Assistant CTA |
|-------|------|-----------|-------------|---------------|
| `< 768` | hidden | hidden | 2 per row, full-width button | shown |
| `768 – 1199` | hidden | hidden | 3 per row, full-width button | shown |
| `≥ 1200` | shown | per mode | one line | hidden |

Adjust the `1199/1200` pair to move the mobile/desktop boundary.

## 7. New-client checklist

1. Make sure the CMS markup matches **§1** (single `#topSearchForm`, shells
   `ai-search-shell` / `#topSearchFormMobile`, container `.ai-search-filters`,
   no duplicate `.SearchButton`).
2. Copy [`ai-search-modes.css`](ai-search-modes.css) into the client `styles/`
   file; set `--ai-search-bg-color` / `--ai-search-hover-color`. Drop the
   sections the client doesn't use.
3. Copy [`default-filters-tab.js`](../js/default-filters-tab.js) and, if the AI
   widget leaks a `lots=NNNN`, [`strip-ai-lot-param.js`](../js/strip-ai-lot-param.js)
   into `scripts/`.
4. Place the `.ai-search-cta-go` markup ([`html/mobile-ai-button.html`](html/mobile-ai-button.html))
   where the client wants the mobile AI entry (nav dropdown and/or a hero CTA).
5. Verify with the CDP client (see below).

## 8. Verification recipes (CDP)

```bash
# mode + display of each part
npm run cdp -- eval "(()=>{const q=s=>document.querySelector(s),d=s=>{const e=q(s);return e?getComputedStyle(e).display:'MISSING'};return {mode:document.documentElement.className.split(' ').find(c=>c.startsWith('search-mode')),shell:d('.ai-search-shell'),tabs:d('.ai-search-mode-tabs'),filters:d('.ai-search-filters #topSearchForm'),ai:d('.ai-search-cta-widget'),cta:d('.ai-search-cta-go')}})()"

# in AI mode both must hold: the shell stays visible, the filter form is hidden
npm run cdp -- eval "(()=>({shell:getComputedStyle(document.querySelector('.ai-search-shell')).display,form:getComputedStyle(document.querySelector('.search-toggle-wrapper #topSearchForm')).display}))()"

# who is on top of the CTA (catches full-bleed pseudo clipping)
npm run cdp -- eval "(()=>{const e=document.querySelector('.ai-search-cta-go'),b=e.getBoundingClientRect(),t=document.elementFromPoint(b.left+b.width/2,b.bottom-4);return {onTop:t.tagName.toLowerCase()+'.'+t.className,inCta:e.contains(t)}})()"
```

- Check `390 / 768 / 1024 / 1199` (tabs hidden, filters shown) and `1200 / 1440`
  (tabs shown, CTA hidden).

## 9. Gotchas / legacy notes

- **Legacy shells reused `#topSearchForm`.** If a build still nests the bundle
  in a `#topSearchForm` shell (two elements with that id), AI mode will hide the
  AI widget's ancestor. Temporary fix: keep the shell visible with
  `html.search-mode-ai #topSearchForm:has(> .search-toggle-wrapper) { display:block !important }`.
  Better: fix the markup to §1.
- **Legacy filter containers used `.home-hero-search`.** Themes that do
  `.home-hero-search { display:none }` hid the filter form. Temporary fix:
  `.search-toggle-wrapper .home-hero-search { display:block !important }`.
  Better: rename to `.ai-search-filters`.
- **`!important` is required** — `ai-search-cta.css` and bundled themes set
  `display` with `!important`.
- The mode is stored in `sessionStorage`; a stale `ai` pick can re-apply —
  `default-filters-tab.js` clears it.
- Full-bleed section pseudo-elements (`#rv-types::before`) paint over static
  content; give anything inside them `position: relative; z-index: ≥1`.
- `color-mix()` is used for translucent accent tints; replace with `rgba()` on
  older Chrome.
