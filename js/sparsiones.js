// Sparsiones — the gifts flung into the sand
//
// The three pickups, what they cost the arena in tempo, and how often they
// fall. Tuning lives here; the effects themselves are in the engine.
//
// Loaded as a plain script before the engine, so index.html still opens by
// double-clicking it — ES modules are blocked over file://. Everything here is
// content: no engine state, nothing that reads the canvas or the DOM.
(() => {
  "use strict";
  const C = (window.COLOSSEUM = window.COLOSSEUM || {});

  // ---- Powerups ----
  // Colored pickup circles. Never red — red is always lethal.
  // Sparsiones — the gifts the emperor had flung into the sand mid-games. Each
  // has a Roman name for the menus and a plain one for the HUD: mid-fight you
  // need to read the label, not translate it.
  // Deliberately none of these multiply damage. A drain multiplier stacked with the
  // ×3 hot zone and slow-mo at the same time, which came to six times the damage
  // with the whole arena crawling — not a combo, a cheat code. Mobility instead:
  // it helps you reach the dangerous ground rather than paying you more for it.
  const POWERUPS = {
    // The ludus surgeon, sent out with the gifts. He puts a mark back on the
    // board — and if you have not lost one, he gives you a mark you were never
    // entitled to, which lasts until something takes it off you again.
    medicus: { color: "#3ddc84", label: "A MARK",  latin: "Medicus",        dur: 0   },  // a life back
    slow:    { color: "#b06bff", label: "SLOW",   latin: "Filum Parcarum", dur: 5.0 },  // everything red crawls
    swift:   { color: "#dbe6f2", label: "SWIFT",  latin: "Talaria",        dur: 7.0 },  // Mercury's winged sandals
  };
  const SWIFT_MULT = 1.5;   // how much faster the sandals make you
  const PU_KEYS = Object.keys(POWERUPS);
  const PU_SPAWN = 6.5;   // seconds between drops
  const PU_LIFE = 9.0;    // seconds a drop sits there before fading out
  const SLOW_FACTOR = 0.4;

  Object.assign(C, { POWERUPS, SWIFT_MULT, PU_KEYS, PU_SPAWN, PU_LIFE, SLOW_FACTOR });
})();
