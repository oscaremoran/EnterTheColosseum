// Palette and lettering
//
// Every colour the canvas draws with, the face it sets type in, and the
// Roman numerals the counters are cut in.
//
// Loaded as a plain script before the engine, so index.html still opens by
// double-clicking it — ES modules are blocked over file://. Everything here is
// content: no engine state, nothing that reads the canvas or the DOM.
(() => {
  "use strict";
  const C = (window.COLOSSEUM = window.COLOSSEUM || {});

  const COLORS = {
    safe: "#4dd7ff",
    danger: "#e0301f",          // blood
    warn: "#f0b429",            // torchlight
    dangerSoft: "rgba(224,48,31,0.22)",
    grid: "#241c12",            // joint lines between paving stones
    sand: "#2b2114",            // arena floor
    sandLit: "#3a2c1a",
    stone: "#1a140d",           // the wall ringing the sand
    bronze: "#6b4f2a",
    gold: "#d9a441",
    // The two sides of a duel. Which man is which is decided by your money and
    // nothing else: the one you backed takes the blue, whoever he is fighting
    // takes the orange, and every shot on the sand is the colour of the man who
    // threw it. With two fighters both throwing, telling whose fire is whose is
    // the whole of watching — so it is carried by hue and not by shape.
    mine: "#3d8bff",
    mineSoft: "rgba(61,139,255,0.22)",
    theirs: "#ff8a3d",
    theirsSoft: "rgba(255,138,61,0.22)",
  };
  // Serif everywhere on the canvas too, to match the chrome.
  const FONT = 'Optima, "Palatino Linotype", Palatino, Georgia, serif';

  // ---- Numerals ----
  // Counts are shown the way they'd be cut into stone. Nothing in this game
  // counts high enough to need more than a few thousand.
  const NUMERALS = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
    [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  function roman(n) {
    n = Math.max(0, Math.round(Number(n) || 0));
    if (!n) return "NVLLA";        // the Romans had no zero; they had a word for "none"
    let out = "";
    for (const [v, glyph] of NUMERALS) {
      while (n >= v) { out += glyph; n -= v; }
    }
    return out;
  }


  Object.assign(C, { COLORS, FONT, roman });
})();
