/* /snippets/js/strip-ai-lot-param */
/* =============================================
    AI Search Widget - Strip stray "lots=N" base params
    Paste inside a <script> tag anywhere on the page (head or before </body>).
    Removes leftover 'lots=N' filters from every widget's data-base-params
    before ai-search-cta.js bakes them into the /search-assistant URL
    (the homepage ships with data-base-params="lots=1447").
    Safe anywhere: base-params is only read at submit time.
=============================================== */
(function () {
  "use strict";

  function stripStrayLotParam() {
    document.querySelectorAll('[data-ai-search-cta="widget"]').forEach(function (widget) {
      if (!widget.dataset.baseParams) return;

      var params = new URLSearchParams(widget.dataset.baseParams);
      if (params.has("lots")) {
        params.delete("lots");
        widget.dataset.baseParams = params.toString();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", stripStrayLotParam);
  } else {
    stripStrayLotParam();
  }
})();