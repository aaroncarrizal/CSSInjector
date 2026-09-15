/* /snippets/js/default-filters-tab */
/* =============================================
    Make the Filters tab the default AI-search mode
    Paste inside a <script> tag in the page <head> (before the
    ai-search-cta.js bundle, if possible) or anywhere on the page.

    Guarantees the Filters tab is active on every load:
      - forces AISearchConfig.defaultSearchMode to 'filters'
      - clears any previously-persisted tab choice (stale 'ai' picks cannot
        re-apply on the next load)
      - re-applies Filters after the bundle boots (DOMContentLoaded/load/
        pageshow/bfcache)

    Trade-off: the persisted tab choice is cleared on every page load, so an
    explicitly-selected AI tab does not carry over to the next page in the
    same session. Remove the two sessionStorage.removeItem lines to re-enable
    cross-page persistence.
=============================================== */
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