(function () {
  "use strict";

  const CDN = {
    videojs: "https://cdn.jsdelivr.net/npm/video.js/dist/video.min.js",
    videojsCss: "https://cdn.jsdelivr.net/npm/video.js/dist/video-js.min.css",
    contribAds: "https://cdn.jsdelivr.net/npm/videojs-contrib-ads/dist/videojs-contrib-ads.min.js",
    contribAdsCss: "https://cdn.jsdelivr.net/npm/videojs-contrib-ads/dist/videojs-contrib-ads.css",
    ima: "https://cdn.jsdelivr.net/npm/videojs-ima/dist/videojs.ima.min.js",
    imaCss: "https://cdn.jsdelivr.net/npm/videojs-ima/dist/videojs.ima.css",
    gima: "https://imasdk.googleapis.com/js/sdkloader/ima3.js",
  };

  const head = document.head || document.getElementsByTagName("head")[0];

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      // tránh load trùng
      if ([...document.scripts].some(s => s.src === src)) return resolve();
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = () => reject(new Error("Failed to load " + src));
      head.appendChild(s);
    });
  }

  function loadCss(href) {
    if ([...document.styleSheets].some(ss => ss.href === href)) return;
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = href;
    head.appendChild(l);
  }

  function canAutoplayMuted() {
    // best-effort: đa số browser cho phép autoplay muted nếu có playsinline
    return true;
  }

  function parseBool(v, def = false) {
    if (v == null) return def;
    const s = String(v).toLowerCase();
    return s === "1" || s === "true" || s === "yes";
  }

  function once(fn) {
    let done = false;
    return (...a) => { if (!done) { done = true; fn(...a); } };
  }

  async function ensureDeps() {
    // CSS trước cho đỡ giật layout
    loadCss(CDN.videojsCss);
    loadCss(CDN.contribAdsCss);
    loadCss(CDN.imaCss);

    // IMA SDK cần trước plugin IMA
    await loadScript(CDN.gima);

    // Video.js core
    if (!window.videojs) {
      await loadScript(CDN.videojs);
    }
    // contrib-ads
    if (!window.videojs?.getPlugin?.("ads")) {
      await loadScript(CDN.contribAds);
    }
    // videojs-ima
    if (!window.videojs?.getPlugin?.("ima")) {
      await loadScript(CDN.ima);
    }
  }

  function makeSticky(wrapper, position) {
    const pos = (position || "bottom-right").toLowerCase();
    wrapper.style.position = "fixed";
    wrapper.style.zIndex = "2147483000";
    wrapper.style.margin = "0";
    wrapper.style.boxShadow = "0 10px 30px rgba(0,0,0,.3)";
    wrapper.style.borderRadius = "12px";
    wrapper.style.overflow = "hidden";
    wrapper.style.background = "#000";

    const margin = "16px";
    const map = {
      "top-left": { top: margin, left: margin },
      "top-right": { top: margin, right: margin },
      "bottom-left": { bottom: margin, left: margin },
      "bottom-right": { bottom: margin, right: margin },
    };
    const m = map[pos] || map["bottom-right"];
    Object.assign(wrapper.style, m);
  }

  function addCloseButton(wrapper, onClose) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("aria-label", "Close");
    btn.style.position = "absolute";
    btn.style.top = "6px";
    btn.style.right = "6px";
    btn.style.width = "28px";
    btn.style.height = "28px";
    btn.style.border = "none";
    btn.style.borderRadius = "14px";
    btn.style.cursor = "pointer";
    btn.style.background = "rgba(0,0,0,.6)";
    btn.style.color = "#fff";
    btn.style.fontSize = "16px";
    btn.style.lineHeight = "28px";
    btn.style.textAlign = "center";
    btn.style.zIndex = "2";
    btn.textContent = "×";
    btn.addEventListener("click", onClose);
    wrapper.appendChild(btn);
  }

  function mountInstream(el) {
    const src = el.getAttribute("data-src");
    const adTag = el.getAttribute("data-adtag");
    if (!adTag) {
      console.error("[XAD] data-adtag is required for instream");
      return;
    }

    let videoEl = el;
    const isVideo = el.tagName.toLowerCase() === "video";
    if (!isVideo) {
      videoEl = document.createElement("video");
      el.appendChild(videoEl);
    }

    videoEl.classList.add("video-js", "vjs-default-skin");
    if (parseBool(el.getAttribute("data-controls"), true)) videoEl.setAttribute("controls", "");
    if (el.getAttribute("data-poster")) videoEl.setAttribute("poster", el.getAttribute("data-poster"));
    videoEl.setAttribute("playsinline", "");
    // Autoplay muted
    if (parseBool(el.getAttribute("data-autoplay"), false) && canAutoplayMuted()) {
      videoEl.muted = true;
      videoEl.setAttribute("muted", "");
      videoEl.setAttribute("autoplay", "");
    }

    if (src) {
      const source = document.createElement("source");
      source.src = src;
      // đoán type
      if (src.endsWith(".m3u8")) source.type = "application/x-mpegURL";
      else if (src.endsWith(".mpd")) source.type = "application/dash+xml";
      else if (src.endsWith(".mp4")) source.type = "video/mp4";
      videoEl.appendChild(source);
    }

    const player = window.videojs(videoEl, {
      fluid: true,
      preload: "auto",
      controls: parseBool(el.getAttribute("data-controls"), true),
    });

    player.ima({
      adTagUrl: adTag,
      debug: parseBool(el.getAttribute("data-debug"), false),
      // Bạn có thể tinh chỉnh thêm: locale, adsRenderingSettings, etc.
    });

    const kickoff = once(() => {
      try { player.ima.initializeAdDisplayContainer(); } catch (e) {}
      try { player.ima.updateOptions({ adTagUrl: adTag }); } catch (e) {}
      try { player.play().catch(()=>{}); } catch (e) {}
    });

    if (videoEl.hasAttribute("autoplay")) {
      kickoff();
    } else {
      player.one("click", kickoff);
      player.one("play", kickoff);
    }

    return player;
  }

  function mountOutstream(container) {
    const adTag = container.getAttribute("data-adtag");
    if (!adTag) {
      console.error("[XAD] data-adtag is required for outstream");
      return null;
    }
  
    const W = parseInt(container.getAttribute("data-width") || "640", 10);
    const H = parseInt(container.getAttribute("data-height") || "360", 10);
    const sticky = container.getAttribute("data-sticky");
    const closable = parseBool(container.getAttribute("data-close"), true);
    const debug = parseBool(container.getAttribute("data-debug"), false);
  
    // wrapper
    const wrapper = document.createElement("div");
    Object.assign(wrapper.style, {
      width: W + "px",
      height: H + "px",
      position: "relative",
      background: "#000",
      borderRadius: "12px",
      overflow: "hidden",
    });
  
    if (sticky) {
      makeSticky(wrapper, sticky);
    }
  
    container.innerHTML = "";
    container.appendChild(wrapper);
  
    // video element
    const videoEl = document.createElement("video");
    videoEl.className = "video-js vjs-default-skin";
    videoEl.setAttribute("playsinline", "");
    videoEl.setAttribute("autoplay", "");
    videoEl.setAttribute("preload", "auto");
    videoEl.setAttribute("muted", "");
    videoEl.setAttribute("crossorigin", "anonymous");
    videoEl.muted = true;
    videoEl.autoplay = true;
    videoEl.width = W;
    videoEl.height = H;
    wrapper.appendChild(videoEl);
  
    const player = window.videojs(videoEl, {
      controls: false,
      preload: "auto",
      fluid: true,
    });
  
    player.src({
      src: "https://cdn.pubabc.com/vietnam/Vietnam-4K-Epic-Roadtrip-Nature-landscapes-c.m3u8",
      type: "application/vnd.apple.mpegurl",
    });
  
    // init IMA only once player is ready
    player.ready(() => {
      player.ima({
        adTagUrl: adTag,
        debug: debug,
      });
  
      const kickoff = () => {
        try { player.ima.initializeAdDisplayContainer(); } catch (e) {}
        player.play().catch(() => {
          player.one("click", () => player.play());
        });
      };
      if (videoEl.autoplay) {
        kickoff();
      } else {
        player.one("play", kickoff);
      }
    });
    if (closable) {
      addCloseButton(wrapper, () => {
        cleanup();
      });
    }
  
    player.on("ads-ad-ended", () => {
      setTimeout(() => {
        cleanup();
      }, 500);
    });

    player.on("adserror", () => {
      console.warn("[XAD] Ad error, fallback to content");
      player.play().catch(() => {});
    });
  
    function cleanup() {
      try { player.dispose(); } catch (e) {}
      wrapper.remove();
    }
  
    return player;
  }

  async function mountAll(root = document) {
    await ensureDeps();

    root.querySelectorAll(".xad-video,[data-mode='instream']").forEach(el => {
      try { mountInstream(el); } catch (e) { console.error("[XAD instream]", e); }
    });

    root.querySelectorAll(".xad-outstream,[data-mode='outstream']").forEach(el => {
      try { mountOutstream(el); } catch (e) { console.error("[XAD outstream]", e); }
    });
  }

  window.XadPlayer = {
    mountAll,
    mountInstream,
    mountOutstream,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => mountAll().catch(console.error));
  } else {
    mountAll().catch(console.error);
  }
})();
