(function () {
  // The hero macro renders duplicate id="topSearchForm" elements (an outer
  // shell div that holds the tabs + AI widget + the orphan Search button,
  // and an inner div with the actual filter selects + visible Search button).
  // The site's own script binds $('#topSearchForm').find('.SearchButton')
  // to the FIRST #topSearchForm (the shell), so the visible button is left
  // with no handler. Rebind the visible button replicating that navigation.

  function isBlank(v) {
    return v == null || /^\s*$/.test(String(v));
  }

  function buildQS(form) {
    var map = {};
    form.querySelectorAll("input,select,textarea").forEach(function (el) {
      if (!el.name || isBlank(el.value)) return;
      var name = el.name.toLowerCase();
      if (map[name] !== undefined && map[name] !== "") map[name] += "," + el.value;
      else map[name] = el.value;
    });
    var qs = [];
    for (var key in map) {
      if (map[key] !== "") qs.push(key + "=" + encodeURIComponent(map[key]));
    }
    return qs.join("&");
  }

  function bindAll() {
    var buttons = document.querySelectorAll(".collapse.home-hero-search #topSearchForm .SearchButton");
    buttons.forEach(function (btn) {
      if (btn.dataset.searchFixBound) return;
      btn.dataset.searchFixBound = "1";
      var form = btn.closest("#topSearchForm");
      btn.addEventListener("click", function (e) {
        if (e.defaultPrevented) return;
        e.preventDefault();
        var qs = buildQS(form || btn.closest("#topSearchForm"));
        window.location = "/rv-search?s=true" + (qs ? "&" + qs : "");
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindAll);
  } else {
    bindAll();
  }
  var timer = setInterval(bindAll, 2000);
  setTimeout(function () { clearInterval(timer); }, 60000);
})();