// Armaturae — the twelve fixed patterns of arms
//
// One modifier layered on top of any attack pattern. See the field table
// below for where the engine reads each one.
//
// Loaded as a plain script before the engine, so index.html still opens by
// double-clicking it — ES modules are blocked over file://. Everything here is
// content: no engine state, nothing that reads the canvas or the DOM.
(() => {
  "use strict";
  const C = (window.COLOSSEUM = window.COLOSSEUM || {});

  // ---- Armaturae ----
  // A gladiator was not a generic fighter — he was trained to one specific
  // pattern of arms, and the pairings were fixed. An armatura layers a single
  // modifier on top of any of the 14 attack patterns, so a Murmillo running the
  // "spiral" pattern fights nothing like a Sagittarius running the same one.
  //
  // Every field is optional. The engine reads them at these points:
  //   spd    — multiplies the boss's movement/fire tempo
  //   hp     — multiplies the bout's health
  //   rate   — multiplies every cooldown at once
  //   shield — half-width (radians) of a shield arc that BLOCKS zone drain
  //   curve  — bullets bend, in rad/sec (the curved sica and the crescent blade)
  //   twin   — every shot is doubled, offset by this many radians
  //   volley — this many extra aimed shots follow each attack
  //   net    — seconds between net throws that snare you instead of wounding
  //   beasts — forces minions on and multiplies how fast they arrive
  //   blind  — you fight in the dark, seeing only this far
  const ARMATURAE = {
    eques: {
      name: "Eques", color: "#d8b26a",
      desc: "horseman — opens the games, fast and light",
      spd: 1.3, hp: 0.85,
    },
    thraex: {
      name: "Thraex", color: "#8fbf5a",
      desc: "the curved sica — his shots bend around your dodge",
      curve: 1.5, spd: 1.05,
    },
    murmillo: {
      name: "Murmillo", color: "#c9a227",
      desc: "fish-crest and tower shield — slow, and his shield side gives no damage",
      spd: 0.8, hp: 1.2, shield: 0.9,
    },
    hoplomachus: {
      name: "Hoplomachus", color: "#5ac8bf",
      desc: "spear and small round shield — thrusts from range behind a narrow guard",
      volley: 1, spd: 0.95, shield: 0.5,
    },
    secutor: {
      name: "Secutor", color: "#e07a3f",
      desc: "the chaser — smooth helm, no crest to catch a net, and he never stops",
      spd: 1.25, rate: 1.15, hp: 0.9,
    },
    retiarius: {
      name: "Retiarius", color: "#4f9bd8",
      desc: "net and trident — the net snares your legs instead of drawing blood",
      net: 3.4, trident: true, spd: 1.15, hp: 0.85,
    },
    dimachaerus: {
      name: "Dimachaerus", color: "#b06bff",
      desc: "two swords, no shield — every attack arrives twice",
      twin: 0.22, rate: 1.1,
    },
    provocator: {
      name: "Provocator", color: "#9c9a92",
      desc: "the only one in a breastplate — takes far longer to put down",
      hp: 1.35, spd: 0.9,
    },
    scissor: {
      name: "Scissor", color: "#ff66c4",
      desc: "a crescent blade fixed to the arm — wide, hooking arcs",
      curve: 2.4, rate: 0.85, hp: 1.1,
    },
    sagittarius: {
      name: "Sagittarius", color: "#f0b429",
      desc: "the archer — everything he throws is aimed, and there is always more of it",
      volley: 2, spd: 1.1, rate: 1.2, hp: 0.8,
    },
    bestiarius: {
      name: "Bestiarius", color: "#3ddc84",
      desc: "the beast-fighter — he brings the beasts with him",
      beasts: 1.8, spd: 0.95,
    },
    andabata: {
      name: "Andabata", color: "#6b3f8f",
      desc: "fought blind in a closed helm — so the crowd puts out the lights for you too",
      blind: 210, spd: 0.85, hp: 1.1,
    },
  };
  const DEF_ARM = { name: "Gregarius", color: "#a08f76", desc: "no formal training" };
  function armOf(key) { return ARMATURAE[key] || DEF_ARM; }

  // Prices are no longer measured here. They were, once — a grid of twelve
  // armaturae against twenty-four men over seventeen thousand real fights — but
  // that grid priced a different product: a man you armed yourself, against an
  // opponent, with nobody else on the sand. What the desk sells now is a duel
  // between two ladder men, and the honest thing to do with a number nobody has
  // counted is to stop pretending it was counted. The Sponsio desk says plainly
  // what a price is now, and what it is worth.

  Object.assign(C, { ARMATURAE, armOf });
})();
