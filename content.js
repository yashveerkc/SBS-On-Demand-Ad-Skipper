/*
 * SBS Ad Skipper
 * ---------------------------------------------
 * Detects SBS On Demand ad breaks and temporarily
 * fast-forwards them at 16x speed while muted.
 */

(() => {
  "use strict";

  console.log("[SBS Ad Skipper] active on", location.pathname);

  const MAX_RATE = 16;
  const POLL_MS = 200;
  const MIN_AD_SECONDS = 3;

  let enabled = true;
  let adActive = false;

  let prevMuted = null;
  let prevRate = 1;

  let skipped = 0;

  let adStartedAt = 0;

  /* ---------------- Storage ---------------- */

  try {
    chrome.storage.sync.get(
      {
        enabled: true,
        skipped: 0
      },
      (s) => {
        enabled = s.enabled !== false;
        skipped = s.skipped || 0;
      }
    );

    chrome.storage.onChanged.addListener((changes) => {
      if (changes.enabled) {
        enabled = changes.enabled.newValue !== false;

        if (!enabled && adActive) {
          endAd();
        }
      }
    });

  } catch (_) {}

  /* ---------------- Video Helper ---------------- */

  function getVideo() {
    const videos = [...document.querySelectorAll("video")];

    return (
      videos.find(v => !v.paused && v.videoWidth > 0) ||
      videos.find(v => v.videoWidth > 0) ||
      videos.find(v => v.currentSrc || v.src) ||
      videos[0] ||
      null
    );
  }

  /* ---------------- Ad Detection ---------------- */

  function adIsPlaying() {

    // Signal #1
    const overlays = document.querySelectorAll(
      '[class*="adControls"],[class*="ad-controls"]'
    );

    for (const el of overlays) {

      const cls =
        typeof el.className === "string"
          ? el.className
          : "";

      if (cls.includes("hide"))
        continue;

      const cs = getComputedStyle(el);

      if (
        cs.display === "none" ||
        cs.visibility === "hidden" ||
        cs.opacity === "0"
      ) {
        continue;
      }

      return true;
    }

    // Signal #2
    const adClick = document.querySelector(
      '#adClick,[id*="adClick" i]'
    );

    if (
      adClick &&
      adClick.offsetParent !== null &&
      getComputedStyle(adClick).display !== "none"
    ) {
      return true;
    }

    // Signal #3
    const adTitle = document.querySelector(
      '[class*="ad-controls" i] h2, [class*="adControls" i] h2'
    );

    if (
      adTitle &&
      /advertis/i.test(adTitle.textContent || "") &&
      adTitle.offsetParent !== null
    ) {
      return true;
    }

    return false;
  }

  /* ---------------- Ad Start ---------------- */

  function startAd() {

    const video = getVideo();

    if (!video)
      return;

    adActive = true;

    adStartedAt = Date.now();

    prevMuted = video.muted;
    prevRate = video.playbackRate || 1;

    video.muted = true;

    try {
      video.playbackRate = MAX_RATE;
    } catch (_) {}

    toast("⏩ Skipping ad...");
  }

  /* ---------------- Maintain Fast Forward ---------------- */

  function maintainAd() {

    const video = getVideo();

    if (!video)
      return;

    if (video.playbackRate !== MAX_RATE) {
      try {
        video.playbackRate = MAX_RATE;
      } catch (_) {}
    }

    if (!video.muted) {
      video.muted = true;
    }
  }

  /* ---------------- Ad End ---------------- */

  function endAd() {

    const duration =
      (Date.now() - adStartedAt) / 1000;

    const video = getVideo();

    adActive = false;

    if (video) {

      try {
        video.playbackRate = prevRate || 1;
      } catch (_) {}

      if (prevMuted !== null) {
        video.muted = prevMuted;
      }
    }

    prevMuted = null;

    if (duration >= MIN_AD_SECONDS) {

      skipped++;

      try {
        chrome.storage.sync.set({
          skipped
        });
      } catch (_) {}
    }

    hideToast();
  }

  /* ---------------- Main Polling Loop ---------------- */

  setInterval(() => {

    if (!getVideo())
      return;

    if (!enabled) {

      if (adActive)
        endAd();

      return;
    }

    const playing = adIsPlaying();

    if (playing && !adActive) {

      startAd();

    } else if (playing && adActive) {

      maintainAd();

    } else if (!playing && adActive) {

      endAd();
    }

  }, POLL_MS);

  /* ---------------- Rate Change Protection ---------------- */

  document.addEventListener(
    "ratechange",
    () => {

      if (!adActive)
        return;

      const video = getVideo();

      if (
        video &&
        video.playbackRate !== MAX_RATE
      ) {
        try {
          video.playbackRate = MAX_RATE;
        } catch (_) {}
      }
    },
    true
  );

  /* ---------------- Toast ---------------- */

  let toastEl = null;

  function toast(text) {

    if (!toastEl) {

      toastEl = document.createElement("div");

      toastEl.id = "sbs-ad-skipper-toast";

      Object.assign(toastEl.style, {
        position: "fixed",
        bottom: "84px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: "2147483647",
        background: "rgba(0,0,0,.82)",
        color: "#ffd60a",
        font: "600 14px/1 system-ui,sans-serif",
        padding: "10px 16px",
        borderRadius: "999px",
        pointerEvents: "none",
        letterSpacing: ".2px",
        boxShadow: "0 2px 10px rgba(0,0,0,.4)"
      });

      (document.body || document.documentElement)
        .appendChild(toastEl);
    }

    toastEl.textContent = text;
    toastEl.style.display = "block";
  }

  function hideToast() {

    if (toastEl) {
      toastEl.style.display = "none";
    }
  }

})();