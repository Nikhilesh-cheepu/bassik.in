/**
 * Bassik venue chat — sheet popup for external outlet websites.
 *
 * Usage on Firefly (or any outlet site):
 *
 *   <script>
 *     window.BassikChatConfig = {
 *       brandId: "firefly",
 *       baseUrl: "https://bassik.in",
 *       accentColor: "#D97706",
 *       topGap: 5,
 *     };
 *   </script>
 *   <script src="https://bassik.in/embed/bassik-chat.js" defer></script>
 */
(function () {
  "use strict";

  var CLOSE_MESSAGE = "bassik-chat-close";
  var DEFAULT_TOP_GAP = 5;

  var cfg = window.BassikChatConfig || {};
  var brandId = cfg.brandId || "firefly";
  var baseUrl = (cfg.baseUrl || "https://bassik.in").replace(/\/$/, "");
  var accentColor = cfg.accentColor || "#D97706";
  var topGap = typeof cfg.topGap === "number" ? cfg.topGap : DEFAULT_TOP_GAP;
  var label = cfg.label || "Chat with us";

  var open = false;
  var overlay = null;
  var iframe = null;
  var onMessage = null;
  var onKeydown = null;

  function lockScroll() {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }

  function unlockScroll() {
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  }

  function embedUrl() {
    var params = new URLSearchParams();
    params.set("utm_source", cfg.utmSource || "embed");
    params.set("utm_medium", cfg.utmMedium || "website");
    if (cfg.utmCampaign) params.set("utm_campaign", cfg.utmCampaign);
    return baseUrl + "/" + brandId + "/chat/embed?" + params.toString();
  }

  function closeChat() {
    if (!open) return;
    open = false;
    unlockScroll();
    if (onMessage) window.removeEventListener("message", onMessage);
    if (onKeydown) window.removeEventListener("keydown", onKeydown);
    onMessage = null;
    onKeydown = null;
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    overlay = null;
    iframe = null;
  }

  function openChat() {
    if (open) return;
    open = true;
    lockScroll();

    overlay = document.createElement("div");
    overlay.id = "bassik-chat-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", label);
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:2147483000;pointer-events:auto;";

    var peek = document.createElement("button");
    peek.type = "button";
    peek.setAttribute("aria-label", "Close chat and return to site");
    peek.title = "Close chat";
    peek.style.cssText =
      "position:absolute;top:0;left:0;right:0;height:" +
      topGap +
      "px;margin:0;padding:0;border:0;background:transparent;cursor:pointer;z-index:2;";
    peek.addEventListener("click", closeChat);

    var sheet = document.createElement("div");
    sheet.style.cssText =
      "position:absolute;left:0;right:0;bottom:0;top:" +
      topGap +
      "px;overflow:hidden;border-radius:18px 18px 0 0;" +
      "box-shadow:0 -12px 48px rgba(0,0,0,0.55);background:#040408;" +
      "transform:translateY(100%);transition:transform 320ms cubic-bezier(0.22,1,0.36,1);";

    iframe = document.createElement("iframe");
    iframe.src = embedUrl();
    iframe.title = label;
    iframe.allow = "clipboard-write";
    iframe.style.cssText = "width:100%;height:100%;border:0;display:block;background:#040408;";

    sheet.appendChild(iframe);
    overlay.appendChild(peek);
    overlay.appendChild(sheet);
    document.body.appendChild(overlay);

    requestAnimationFrame(function () {
      sheet.style.transform = "translateY(0)";
    });

    onMessage = function (event) {
      if (!event.data || event.data.type !== CLOSE_MESSAGE) return;
      closeChat();
    };
    window.addEventListener("message", onMessage);

    onKeydown = function (event) {
      if (event.key === "Escape") closeChat();
    };
    window.addEventListener("keydown", onKeydown);
  }

  function mountFab() {
    if (document.getElementById("bassik-chat-fab")) return;

    var wrap = document.createElement("div");
    wrap.id = "bassik-chat-fab";
    wrap.style.cssText =
      "position:fixed;right:max(1rem,env(safe-area-inset-right));" +
      "bottom:calc(1.25rem + env(safe-area-inset-bottom));z-index:2147482000;";

    var btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("aria-label", label);
    btn.style.cssText =
      "width:56px;height:56px;border-radius:9999px;border:0;cursor:pointer;" +
      "display:flex;align-items:center;justify-content:center;color:#fff;" +
      "background:linear-gradient(135deg," +
      accentColor +
      ",#111827);" +
      "box-shadow:0 0 20px " +
      accentColor +
      "66,0 10px 32px rgba(0,0,0,0.45);";
    btn.innerHTML =
      '<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">' +
      '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>' +
      "</svg>";
    btn.addEventListener("click", openChat);

    wrap.appendChild(btn);
    document.body.appendChild(wrap);
  }

  window.BassikChat = {
    open: openChat,
    close: closeChat,
    mount: mountFab,
  };

  if (cfg.autoMount !== false) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", mountFab);
    } else {
      mountFab();
    }
  }
})();
