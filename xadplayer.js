(function () {
  "use strict";

  const CDN = {
    videojs: "https://cdn.jsdelivr.net/npm/video.js@8/dist/video.min.js",
    videojsCss: "https://cdn.jsdelivr.net/npm/video.js@8/dist/video-js.min.css",
    contribAds: "https://cdn.jsdelivr.net/npm/videojs-contrib-ads@6.9.0/dist/videojs-contrib-ads.min.js",
    contribAdsCss: "https://cdn.jsdelivr.net/npm/videojs-contrib-ads@6.9.0/dist/videojs-contrib-ads.css",
    ima: "https://cdn.jsdelivr.net/npm/videojs-ima@1.10.3/dist/videojs.ima.min.js",
    imaCss: "https://cdn.jsdelivr.net/npm/videojs-ima@1.10.3/dist/videojs.ima.css",
    // Google IMA SDK
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
    // Thuộc tính cơ bản
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
      return;
    }
    const W = parseInt(container.getAttribute("data-width") || "640", 10);
    const H = parseInt(container.getAttribute("data-height") || "360", 10);
    const sticky = container.getAttribute("data-sticky"); // position string
    const closable = parseBool(container.getAttribute("data-close"), true);

    const wrapper = document.createElement("div");
    wrapper.style.width = W + "px";
    wrapper.style.height = H + "px";
    wrapper.style.maxWidth = "100%";
    wrapper.style.position = "relative";
    wrapper.style.background = "#000";
    wrapper.style.borderRadius = "12px";
    wrapper.style.overflow = "hidden";

    const videoEl = document.createElement("video");
    videoEl.className = "video-js vjs-default-skin";
    videoEl.setAttribute("playsinline", "");
    videoEl.setAttribute("muted", "");
    videoEl.muted = true; // outstream mặc định muted
    videoEl.setAttribute("autoplay", ""); 
    wrapper.appendChild(videoEl);

    if (sticky) {
      makeSticky(wrapper, sticky);
    } else {
      // In-article: chiếm chiều rộng cha
      wrapper.style.width = "100%";
      wrapper.style.height = Math.round((H / W) * 100) + "vw"; 
      wrapper.style.maxHeight = H + "px";
    }

    if (closable) {
      addCloseButton(wrapper, () => {
        try { player.dispose(); } catch (e) {}
        wrapper.remove();
      });
    }

    container.innerHTML = "";
    container.appendChild(wrapper);

    const player = window.videojs(videoEl, {
      fluid: true,
      preload: "auto",
      controls: false, // outstream: không cần controls
      muted: true,
    });

    player.ima({
      adTagUrl: adTag,
      debug: parseBool(container.getAttribute("data-debug"), false),
    });

    const kickoff = once(() => {
      try { player.ima.initializeAdDisplayContainer(); } catch (e) {}
      try { player.ima.requestAds(); } catch (e) {}
      // videojs-ima sẽ phát ad, sau khi xong có thể collapse
    });

    if (document.readyState === "complete") kickoff();
    else window.addEventListener("load", kickoff);

    player.on("ads-ad-ended", () => {
      // collapse sau khi quảng cáo xong
      if (!sticky) {
        wrapper.style.display = "none";
      }
    });

    return player;
  }

  async function mountAll(root = document) {
    await ensureDeps();

    // Instream
    root.querySelectorAll(".xad-video,[data-mode='instream']").forEach(el => {
      try { mountInstream(el); } catch (e) { console.error("[XAD instream]", e); }
    });

    // Outstream
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
