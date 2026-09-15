/* ==========================================================================
   Filters tab as the default AI-search mode
   --------------------------------------------------------------------------
   ai-search-cta.js resolves the active tab from:
     1) sessionStorage (aiSearchCta.searchMode / searchModeUserSet) if a
        shopper previously clicked a tab this session, else
     2) window.AISearchConfig.defaultSearchMode ('ai' or 'filters',
        default 'filters').

   This script guarantees the Filters tab is the default on every load:
     - forces AISearchConfig.defaultSearchMode to 'filters'
     - clears any previously-persisted tab choice (so a stale 'ai' pick
       from testing/earlier sessions cannot re-apply on the next load)
     - re-applies Filters after the bundle boots on DOMContentLoaded/load
       and on pageshow (bfcache/back-forward)

   Trade-off: because the persisted choice is cleared on every page load, an
   explicitly-selected AI tab does NOT carry over to the next page in the same
   session (it persists only while no navigation happens). Remove the two
   sessionStorage.removeItem lines to re-enable cross-page persistence.
   ========================================================================== */
(function () {
  "use strict";

  var MODE_KEY = "aiSearchCta.searchMode";
  var USER_SET_KEY = "aiSearchCta.searchModeUserSet";

  function hasModeTabs() {
    return !!document.querySelector("[data-ai-search-mode]");
  }

  function forceFilters() {
    if (!hasModeTabs()) return;

    window.AISearchConfig = window.AISearchConfig || {};
    window.AISearchConfig.defaultSearchMode = "filters";

    try {
      sessionStorage.removeItem(USER_SET_KEY);
      sessionStorage.removeItem(MODE_KEY);
    } catch (err) {
      /* sessionStorage may be unavailable */
    }

    if (window.AiSearchCta) {
      window.AiSearchCta.setSearchMode("filters", { persist: false });
    }
  }

  forceFilters();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", forceFilters);
  }
  window.addEventListener("load", forceFilters);
  window.addEventListener("pageshow", forceFilters);
})();