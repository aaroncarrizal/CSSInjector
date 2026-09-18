(function () {
  "use strict";

  var FORM_SELECTOR = "form[id^='form-keywordSearch-']";
  var INPUT_SELECTOR = FORM_SELECTOR + " input.keyword-search";

  function getTypeahead(input) {
    var T = window.Typeahead;
    if (!T) return null;
    for (var key in T) {
      if (!Object.prototype.hasOwnProperty.call(T, key) || !T[key] || !T[key].node) continue;
      var node = T[key].node;
      var el = node.jquery ? node[0] : node;
      if (el === input) return T[key];
    }
    return null;
  }

  function uniqValues(a, b) {
    var parts = String(a).split(",").concat(String(b).split(","));
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      if (parts[i] !== "" && out.indexOf(parts[i]) === -1) out.push(parts[i]);
    }
    return out.join(",");
  }

  function buildQuery(input) {
    var qs = {};
    var add = function (item) {
      if (!item || !item.filter || item.filterValues == null) return;
      var filters = String(item.filter).split("~~");
      var values = String(item.filterValues).split("~~");
      for (var i = 0; i < filters.length; i++) {
        var f = filters[i];
        var v = values[i];
        if (qs[f] === undefined) qs[f] = v;
        else qs[f] = uniqValues(qs[f], v);
      }
    };

    var t = getTypeahead(input);
    if (t) {
      if (t.items && t.items.length) t.items.forEach(add);
      if (t.result && t.result.length) {
        var idx = t.hintIndex == null ? 0 : t.hintIndex;
        add(t.result[idx]);
      }
    }

    if (Object.keys(qs).length === 0) {
      var query = (input.value || "").trim();
      if (query) add({ filter: "stocknumber", filterValues: query });
    }

    qs["s"] = "true";
    return qs;
  }

  function param(obj) {
    var parts = [];
    for (var k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) {
        parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(obj[k]));
      }
    }
    return parts.join("&");
  }

  function runSearch(input) {
    location.href = "/rv-search?" + param(buildQuery(input));
  }

  function onEnter(e) {
    if (e.key !== "Enter" && e.keyCode !== 13) return;
    var input = e.target;
    if (!input || !input.matches || !input.matches(INPUT_SELECTOR)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    runSearch(input);
  }

  function onButtonClick(e) {
    var target = e.target;
    if (!target || !target.closest) return;
    var button = target.closest(".typeahead__button");
    if (!button) return;
    var form = button.closest(FORM_SELECTOR);
    if (!form) return;
    var input = form.querySelector("input.keyword-search");
    if (!input) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    runSearch(input);
  }

  document.addEventListener("keydown", onEnter, true);
  document.addEventListener("click", onButtonClick, true);
})();

