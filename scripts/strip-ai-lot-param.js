/* ==========================================================================
   Strip stray "lots=N" base params from the AI search widget
   --------------------------------------------------------------------------
   The homepage renders the AI Search CTA widget with a leftover
   data-base-params="lots=1447" (set in the Umbraco widget macro params).
   ai-search-cta.js buildTargetUrl() copies that attribute verbatim into the
   destination, so every AI search navigates to "/search-assistant?lots=1447"
   and gets locked to a single test lot.

   This script deletes any "lots" param from every widget's data-base-params
   BEFORE the submit handler reads it (it is read on submit, so running on
   DOMContentLoaded / after inject works). Attributes are re-set via dataset
   so the change is picked up by the widget's own code.
   ========================================================================== */
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