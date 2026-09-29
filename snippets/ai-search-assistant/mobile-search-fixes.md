# Mobile Search Panel Fixes

Common CSS fixes to make the header **Search** button open the mobile search panel on every page, including `/rv-search` and `/search-assistant`, once a dealer has the AI search widget.

## Markup this assumes

The header button targets `.top-search-mobile` inside `#top-search-container`:

```html
<button type="button" class="btn btn-primary pull-right" data-toggle="collapse"
    data-target="#top-search-container .top-search-mobile">
    <span class="sr-only">RV Search</span><i class="fa fa-search" role="presentation"></i> Search
</button>

<div id="top-search-container" class="subpage-search" role="search">
    <div class="container">
        <div class="collapse top-search-mobile">
            <span class="h2 heading">RV Search</span>
            <div role="form" id="topSearchFormMobile" class="SearchPanel form-inline">…</div>
        </div>
    </div>
</div>
```

`.top-search-mobile` must also have the `collapse` class. Without it, Bootstrap's toggle adds and removes `.in`, but the panel is never hidden in the first place.

## 1. Style `.top-search-mobile` like the old `.top-search`

The mobile form is styled through the dealer's own `.top-search` rules (in their theme CSS, or `styles/` in this repo). Once the panel's class is `.top-search-mobile`, those rules no longer apply, so the form loses its styling.

Copy that dealer's `.top-search` rules that apply below 992px, and change the selector from `.top-search` to `.top-search-mobile`. Keep the declarations exactly as the dealer has them. Don't carry over another dealer's values. Leave the original `.top-search` rules in place, because desktop still uses them.

To find them, search the dealer's CSS for `top-search`, or run `npm run dbg -- rules ".top-search select"` on a page where the old `.top-search` markup is still present. The `origin` of each rule shows which file it comes from.

## 2. Make the panel open on `/search-assistant`

On `/`, `/rv-search` and other normal pages, the button works as soon as the markup above is in place. `/search-assistant` is different: the page ships its own embedded `<style>` that hides the whole container:

```css
#top-search-container, .header-search:has(+ .sa-container) { display: none }
```

So the button opens the panel inside a hidden box, and nothing appears. The fix shows the container while the panel is open, but only below 992px:

```css
@media (max-width: 991px) {
    #top-search-container:has(.top-search-mobile.in, .top-search-mobile.collapsing) {
        display: block;
    }
}
```

- **`.collapsing` is required, not optional.** While the panel animates, Bootstrap gives it `.collapsing`, not `.in`. If the selector only matches `.in`, the container is still hidden when Bootstrap measures the panel's height. Bootstrap reads 0px, so the panel stays at 0 height for about 350ms and then pops open, with no animation. With `.collapsing` included, opening and closing animate the same way as on the home page.
- **Background:** if the panel looks different on `/search-assistant` than on the home page, check `npm run dbg -- rules "#top-search-container"` on both. The theme may set the container's background only under `.homepage`, and `/search-assistant` has no `.homepage` class. If so, copy that dealer's value into this rule.
- **No `!important` is needed.** An ID plus `:has()` is more specific than the page's own `#top-search-container` rule.
- **Below 992px only**, so desktop keeps the container hidden, the same as the rest of the site (`.subpage-search { display: none !important }` at 992px and up).

## Checking it

Run this on each page (`/`, `/rv-search`, `/search-assistant`) at a phone or tablet width (`npm run dbg -- bp xs`, or `bp sm`):

```
npm run dbg -- batch <<'EOF'
select "[data-target*=top-search-mobile]"
why "#top-search-container" display
eval "(()=>{const c=document.querySelector('#top-search-container');const s=[];document.querySelector('[data-target*=top-search-mobile]').click();const t0=performance.now();return new Promise(r=>{(function f(){s.push(Math.round(performance.now()-t0)+':'+Math.round(c.getBoundingClientRect().height));if(performance.now()-t0<500)requestAnimationFrame(f);else r(s.filter((x,i)=>i%5==0))})()})})()"
screenshot
EOF
```

The `eval` clicks the button and samples the container height over 500ms. It should rise gradually from 0 to the panel's full height. If it stays at 0 and then jumps, the `.collapsing` part of the selector is missing.
