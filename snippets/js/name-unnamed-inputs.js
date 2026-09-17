(function () {
  // The site's own scripts call .attr("name").toLowerCase() over :input
  // collections (hero tab sync, submit handler, ready URL-parsing). A form
  // control rendered without a `name` attribute makes that predicate throw,
  // aborting the rest of the jQuery 1.8.3 ready batch - which includes the
  // static-unit Cycle2 carousel init on the listing page (unit-media images
  // end up stacked). Layers of protection:
  //
  //   1) getAttribute("name") read guard (installed at document start, so it
  //      applies to every element before ANY page script can read a name).
  //      For form controls lacking a name it returns "" instead of null, so
  //      .attr("name").toLowerCase() can never throw (matches the HTML .name
  //      property semantics). This is timing-independent - no race with the
  //      page's script order, DOM rewrites, or same-task submits.
  //   2) A MutationObserver + immediate scan that actually sets the name=""
  //      attribute as controls enter the DOM (keeps serialization/querying
  //      consistent for the rest of the page's code).
  //   3) A $.fn.attr("name") hook for any path that bypasses getAttribute
  //      (jQuery caches/uses attributes internally; belt-and-suspenders since
  //      jQuery may load after this script runs).
  try {
    function nameElement(e) {
      if (e && e.nodeType === 1 && e.matches && e.matches("input,select,textarea,button") && !e.hasAttribute("name")) {
        e.setAttribute("name", "");
      }
    }

    function fix(n) {
      if (!n || n.nodeType !== 1) return;
      nameElement(n);
      if (n.querySelectorAll) {
        n.querySelectorAll("input,select,textarea,button").forEach(nameElement);
      }
    }

    var origGetAttribute = Element.prototype.getAttribute;
    Element.prototype.getAttribute = function (name) {
      if (name === "name" && this.nodeType === 1 &&
          (this.matches && this.matches("input,select,textarea,button")) &&
          !this.hasAttribute("name")) {
        return "";
      }
      return origGetAttribute.call(this, name);
    };

    if (document.documentElement) fix(document.documentElement);

    new MutationObserver(function (ms) {
      ms.forEach(function (m) { m.addedNodes.forEach(fix); });
    }).observe(document, { childList: true, subtree: true });

    function installAttrHook() {
      if (window.jQuery && jQuery.fn && jQuery.fn.attr && !jQuery.fn.attr.__nameGuarded) {
        var origAttr = jQuery.fn.attr;
        function guardedAttr() {
          if (arguments.length === 1 && typeof arguments[0] === "string" && arguments[0] === "name") {
            [].slice.call(this).forEach(nameElement);
          }
          return origAttr.apply(this, arguments);
        }
        guardedAttr.__nameGuarded = true;
        jQuery.fn.attr = guardedAttr;
      }
    }

    installAttrHook();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", installAttrHook);
    }
    window.addEventListener("load", installAttrHook);
    var t = setInterval(installAttrHook, 200);
    setTimeout(function () { clearInterval(t); }, 15000);
  } catch (e) {}
})();