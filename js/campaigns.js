// The two campaigns, and every attack pattern in the game
//
// Vulcan and his opposite, seven stages each. PATTERNS is flattened out of
// them so the custom boss builder can offer every form without a second list.
//
// Loaded as a plain script before the engine, so index.html still opens by
// double-clicking it — ES modules are blocked over file://. Everything here is
// content: no engine state, nothing that reads the canvas or the DOM.
(() => {
  "use strict";
  const C = (window.COLOSSEUM = window.COLOSSEUM || {});

  // ---- Campaigns ----
  // Two separate bosses, each with its own seven stages and its own final form.
  // hp = damage you must deal (via the blue zone) to clear the stage.
  const CAMPAIGNS = {
    inferno: {
      name: "Vulcan",
      sub: "the forge-god and his seven trials",
      accent: "#ff5a2b",
      stages: [
        { name: "Venator", key: "pursuer", hp: 45, desc: "stalks you, jabs & fans" },
        { name: "Vesuvius",key: "nova",    hp: 60, desc: "blooming rings with escape gaps" },
        { name: "Taurus",  key: "charger", hp: 55, desc: "telegraphs, then dashes" },
        { name: "Vortex",  key: "spiral",  hp: 50, desc: "a whirlwind that reverses its spin" },
        { name: "Ballista",key: "gatling", hp: 50, desc: "orbits, then locks on & focus-fires" },
        { name: "Testudo", key: "lattice", hp: 62, desc: "spinning ranks of darts" },
        // `crown` is what makes this man Vulcan rather than the hades pattern.
        // The pattern is lent out all over the building — Verus fights it on the
        // ladder, a Library level can chain it — and none of those men are the
        // forge-god, so none of them get his card at the gate. See raiseGate.
        { name: "Vulcan",  key: "hades",   hp: 84, desc: "final boss: curling forge-flames + volleys", final: true, crown: "hades" },
      ],
    },
    void: {
      name: "Nox",
      sub: "the goddess of night, closing in",
      accent: "#7b5cff",
      stages: [
        { name: "Parca",   key: "weaver",  hp: 45, desc: "sways across the top, firing paired shots" },
        { name: "Gemini",  key: "mirror",  hp: 55, desc: "shoots from itself and its reflection" },
        { name: "Sol",     key: "pulsar",  hp: 55, desc: "sits dead center, pulsing gapped rings" },
        { name: "Serpens", key: "serpent", hp: 55, desc: "a snaking stream that whips side to side" },
        { name: "Crux",    key: "cross",   hp: 55, desc: "two counter-rotating cross beams" },
        { name: "Legio",   key: "swarm",   hp: 60, desc: "light fire, but minions flood in" },
        { name: "Nox",     key: "void",    hp: 82, desc: "final boss: the arena implodes inward", final: true, crown: "void" },
      ],
    },
  };

  // Every attack pattern the engine knows, for the custom boss builder.
  const PATTERNS = [];
  for (const c of Object.values(CAMPAIGNS)) {
    for (const s of c.stages) PATTERNS.push({ key: s.key, name: s.name, desc: s.desc });
  }
  const PATTERN_BY_KEY = Object.fromEntries(PATTERNS.map((p) => [p.key, p]));

  Object.assign(C, { CAMPAIGNS, PATTERNS, PATTERN_BY_KEY });
})();
