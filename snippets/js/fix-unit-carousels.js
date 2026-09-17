(function () {
  // On the listing page the site's own ready handler crashes on an unnamed
  // form control before it reaches its Cycle2 init, so every unit's
  // .cycle-slideshow stays uninitialized and the .unit-media images render
  // stacked vertically instead of as a carousel. Re-run the init ourselves
  // (Cycle2 reads its config from the element's data-cycle-* attributes).
  try {
    function initCarousels() {
      var $ = window.jQuery;
      if (!$ || !$.fn || !$.fn.cycle) return;

      document.querySelectorAll(".cycle-slideshow").forEach(function (el) {
        if (el.querySelector(".cycle-slide-active")) return;
        if ($(el).data("cycle.opts")) return;
        try { $(el).cycle(); } catch (e) {}
      });
    }

    initCarousels();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initCarousels);
    }
    window.addEventListener("load", initCarousels);
    var t = setInterval(initCarousels, 400);
    setTimeout(function () { clearInterval(t); }, 10000);
  } catch (e) {}
})();