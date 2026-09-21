# AI Search (Filters / AI modes) — integration guide

How the IRV **AI Search** home-hero works, and the CSS/JS needed to drop it
into a new client. The copy-paste CSS lives in
[`snippets/css/ai-search-modes.css`](css/ai-search-modes.css).

## 1. What it is

The home hero search is a macro that renders three things side by side in one
wrapper, `.search-toggle-wrapper`:

| Part | Element | What it does |
|------|---------|--------------|
| Mode tabs | `.ai-search-mode-tabs` | "Filters" / "AI Search `New!`" buttons (`data-ai-search-mode="filters"|"ai"`) |
| Filter form | `.home-hero-search > #topSearchForm` | The classic Year / Type / Features / Length / Stock selects + `Find My Rv` |
| AI widget | `.ai-search-cta-widget` | Free-text "Describe your ideal RV …" form + suggestion chips |

Optionally a standalone promo button, `.ai-search-cta-go`, links to the
`/search-assistant` page.

### Markup (Umbraco macrora)

The wrapper is composed from the site's snippet macros — see
[`snippets/html/ai-widget.html`](../html/ai-widget.html) and
[`snippets/html/old_search.html`](../html/old_search.html):

- **Snippet 527811** — AI search mode tabs (`.ai-search-mode-tabs`)
- **`RvSearch` macro** — renders the filter form with `SearchId="topSearchForm"`
- **Snippet 527812** — AI CTA widget (`.ai-search-cta-widget`)

There is usually already a bare `#topSearchForm` shell on the page (the old
search placeholder). The macro renders **inside** it, which is the source of
the "duplicate `#topSearchForm`" behaviour described below.

### Assistant CTA markup (`/search-assistant`)

```html
<a class="ai-search-cta-go" href="/search-assistant">
  <span class="ai-search-cta-go-label">
    <svg viewBox="0 0 100 100" class="sparkles">…</svg>
    AI Search Assistant
    <span class="ai-search-cta-go-badge">New!</span>
  </span>
</a>
```

## 2. How mode switching works

- The site's `ai-search-cta.js` toggles classes on **`<html>`**:
  `search-mode-ai` **or** `search-mode-filters`.
- `ai-search-cta.css` then does (roughly):
  - `html:not(.search-mode-ai) .ai-search-cta-widget { display:none }`
    → the AI widget only shows in AI mode.
  - `html.search-mode-ai #topSearchForm { display:none }`
    → the filter form only shows in Filters mode.
- The active tab is resolved from `sessionStorage`
  (`aiSearchCta.searchMode` + `aiSearchCta.searchModeUserSet`) falling back to
  `window.AISearchConfig.defaultSearchMode` (default `filters`).
- [`default-filters-tab.js`](../js/default-filters-tab.js) forces **Filters**
  as the default on every load. See its trade-off note (it clears the
  persisted choice, so AI does not carry across pages).

The **header Search button** on mobile
(`<button data-toggle="collapse" data-target=".top-search">`) is *not* an AI
tab — it is a plain Bootstrap collapse that only shows/hides the `.top-search`
panel. It does **not** change the filters/AI mode; it reveals whatever mode is
active. (Verified: `<html>` class and active tab are unchanged by clicking it.)

## 3. The duplicate-`#topSearchForm` gotcha

Because the macro nests `.search-toggle-wrapper` **inside** the page's existing
`#topSearchForm`, there are two elements with that id:

```
.top-search
└─ #topSearchForm                ← outer shell (the old placeholder)
   ├─ .search-toggle-wrapper
   │  ├─ .ai-search-mode-tabs    ← tabs
   │  ├─ .home-hero-search
   │  │  └─ #topSearchForm       ← inner form, the real filter selects
   │  └─ .ai-search-cta-widget   ← AI widget
   └─ button.SearchButton        ← duplicate "Find My Rv"
```

Two bugs follow, both fixed by section 1 of `ai-search-modes.css`:

1. **AI never renders.** `html.search-mode-ai #topSearchForm { display:none }`
   hides *both* forms — including the outer shell that contains the AI widget,
   so switching to AI shows an empty panel. Fix: keep the outer shell visible
   and hide only the inner form.
2. **Squeezed layout.** If the outer shell is `display:flex`, the wrapper and
   the duplicate `.SearchButton` sit on one row. Fix: make the outer shell
   stack and hide its duplicate button.

## 4. Mobile behaviour (header Search → filters)

On phones/tablets the `.top-search` panel is collapsed by default and opened
by the header **Search** button. Desired behaviour:

- Panel opens showing the **filter form** only.
- The mode tabs and AI widget are hidden (`≤1199px` in the snippet).
- The **AI Search Assistant CTA** is the mobile AI entry point — it is hidden
  on desktop (`≥1200px`) and shown on mobile/tablet.

The snippet also wraps the filter rows (`flex-wrap: wrap` + half/third widths)
so the desktop one-line form does not get crushed into unusable selects.

### Assistant CTA placement

- Placed inside the nav "Search RVs" dropdown and/or inside `#rv-types` on the
  homepage.
- `#rv-types::before` is `position:absolute; top:83px` with an opaque
  background and paints over static children — the snippet gives the CTA
  `position: relative; z-index: 2` so it is not cut off.

## 5. Button / accent colouring

One variable drives everything: **`--ai-search-bg-color`**.

| Target | Source |
|--------|--------|
| AI Search submit button | `ai-search-cta.css` → `var(--ai-search-bg-color, var(--primary-bg-color, #333))` |
| AI input border | same var |
| Sparkles icon | same var (`color`, SVG uses `fill="currentColor"`) |
| Mode tabs (text, active underline, badge) | section 3 of the snippet |
| Filters `Find My Rv` button | section 4 of the snippet (`#topSearchForm .SearchButton`) |
| Assistant CTA border | section 5 of the snippet (`.ai-search-cta-go`) |

Set `--ai-search-bg-color` (and a darker `--ai-search-hover-color`) once in
`:root`. Without it, the AI button/input/sparkles fall back to `#333`.

## 6. Breakpoints used

| Width | Tabs | AI widget | Filter form | Assistant CTA |
|-------|------|-----------|-------------|---------------|
| `< 768` | hidden | hidden | 2 per row, full-width button | shown |
| `768 – 1199` | hidden | hidden | 3 per row, full-width button | shown |
| `≥ 1200` | shown | per mode | one line (`hero-filters-search.css`) | hidden |

Adjust the `1199/1200` pair to move the mobile/desktop boundary.

## 7. New-client checklist

1. Copy [`snippets/css/ai-search-modes.css`](css/ai-search-modes.css) into the
   client `styles/` file and set `--ai-search-bg-color` /
   `--ai-search-hover-color` to the brand accent.
2. Copy [`default-filters-tab.js`](../js/default-filters-tab.js) and, if the
   AI widget leaks a `lots=NNNN` param, [`strip-ai-lot-param.js`](../js/strip-ai-lot-param.js)
   into `scripts/`.
3. If the hero uses the one-line search, also copy
   [`hero-filters-search.css`](hero-filters-search.css) (the snippet's mobile
   wrap rules counter it).
4. Keep the `.ai-search-cta-go` markup where the client wants the mobile AI
   entry (nav dropdown and/or `#rv-types`) — the CSS targets the class, not a
   position.
5. Verify with the CDP client (see below).

## 8. Verification recipes (CDP)

```bash
# mode + display of each part
npm run cdp -- eval "(()=>{const q=s=>document.querySelector(s),d=s=>{const e=q(s);return e?getComputedStyle(e).display:'MISSING'};return {mode:document.documentElement.className.split(' ').find(c=>c.startsWith('search-mode')),wrapper:d('.search-toggle-wrapper'),tabs:d('.ai-search-mode-tabs'),ai:d('.ai-search-cta-widget'),cta:d('.ai-search-cta-go'),panel:getComputedStyle(q('.top-search')).height}})()"

# who is actually on top of the CTA (catches #rv-types::before clipping)
npm run cdp -- eval "(()=>{const e=document.querySelector('.ai-search-cta-go'),b=e.getBoundingClientRect(),t=document.elementFromPoint(b.left+b.width/2,b.bottom-4);return {onTop:t.tagName.toLowerCase()+'.'+t.className,inCta:e.contains(t)}})()"
```

- Check at `390 / 768 / 1024 / 1199` (tags hidden, filters shown) and
  `1200 / 1440` (tags shown, CTA hidden).
- In AI mode both `#topSearchForm`s must be inspected: the outer must stay
  visible, the inner hidden.

## 9. Gotchas

- **Two `#topSearchForm` elements share an id.** `#topSearchForm` selectors hit
  both. Use `.top-search > #topSearchForm` (outer) vs
  `.search-toggle-wrapper #topSearchForm` (inner) to disambiguate.
- **`!important` is required** — `ai-search-cta.css` and the bundled theme both
  set `display` with `!important`.
- The mode is stored in `sessionStorage`, so a stale `ai` pick can re-apply;
  `default-filters-tab.js` clears it on load.
- The AI submit/input/sparkles fall back to `#333` when
  `--ai-search-bg-color` is undefined — that is the tell-tale if the accent
  "didn't take".
- `#rv-types::before` (and similar full-bleed section pseudo-elements) paint
  over static content; give anything placed inside them
  `position: relative; z-index: ≥1`.
- `color-mix()` is used in the snippet for translucent accent tints; if a
  target Chrome is older, replace those with explicit `rgba()` values.
