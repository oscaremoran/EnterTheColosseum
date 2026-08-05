// The Library, the single battles, and what a run pays
//
// Hand-built levels the campaigns never assemble, every form flattened into
// a fight of its own, and the payout table both of them are priced from.
//
// Loaded as a plain script before the engine, so index.html still opens by
// double-clicking it — ES modules are blocked over file://. Everything here is
// content: no engine state, nothing that reads the canvas or the DOM.
(() => {
  "use strict";
  const C = (window.COLOSSEUM = window.COLOSSEUM || {});

  const { CAMPAIGNS } = C;

  const LEVEL_COLORS = [
    ["Flamma", "#ff5a2b"], ["Purpura", "#7b5cff"], ["Caeruleum", "#4dd7ff"],
    ["Viridis", "#3ddc84"], ["Aurum", "#f0b429"], ["Rosa", "#ff66c4"],
  ];

  const LEVELS = [
    {
      id: "warmup", name: "Ludus", accent: "#4dd7ff", rating: 1,
      blurb: "Two slow forms and plenty of room. The training school, before the sand.",
      stages: [
        { key: "pursuer", hp: 35, minions: false },
        { key: "nova",    hp: 45, minions: false },
      ],
    },
    {
      id: "geometry", name: "Geometria", accent: "#7b5cff", rating: 2,
      blurb: "Nothing chases you and nothing aims. Four spinning patterns — read them or don't.",
      stages: [
        { key: "lattice", hp: 45, minions: false },
        { key: "cross",   hp: 50, minions: false },
        { key: "spiral",  hp: 45, minions: false },
        { key: "pulsar",  hp: 55, minions: false },
      ],
    },
    {
      id: "orbit", name: "Orbita", accent: "#ffd23b", rating: 3,
      blurb: "Three bosses that shoot while they move. You'll never get a stationary target.",
      stages: [
        { key: "gatling", hp: 50, minions: false },
        { key: "weaver",  hp: 50, minions: false },
        { key: "mirror",  hp: 60, minions: false },
      ],
    },
    {
      id: "infestation", name: "Pestilentia", accent: "#3ddc84", rating: 3,
      blurb: "Minions on every stage, including the ones that never normally have them.",
      stages: [
        { key: "swarm",   hp: 55, minions: true },
        { key: "pursuer", hp: 50, minions: true },
        { key: "lattice", hp: 60, minions: true },
      ],
    },
    {
      id: "whiplash", name: "Flagellum", accent: "#ff66c4", rating: 4,
      blurb: "Streams that never hold still. Stop moving for a second and it finds you.",
      stages: [
        { key: "serpent", hp: 50, minions: false },
        { key: "spiral",  hp: 50, minions: true },
        { key: "serpent", hp: 65, minions: true },
      ],
    },
    {
      id: "crucible", name: "Fornax", accent: "#ff5a2b", rating: 4,
      blurb: "Vulcan's three most aggressive forms with no breathing room between them.",
      stages: [
        { key: "pursuer", hp: 45, minions: false },
        { key: "charger", hp: 50, minions: true },
        { key: "hades",   hp: 80, minions: true },
      ],
    },
    {
      id: "mirrors", name: "Speculum", accent: "#b06bff", rating: 3,
      blurb: "Gemini twice, with Sol between them. Learn to watch two shooters at once.",
      stages: [
        { key: "mirror", hp: 50, minions: false },
        { key: "pulsar", hp: 55, minions: false },
        { key: "mirror", hp: 65, minions: true },
      ],
    },
    {
      id: "closequarters", name: "Comminus", accent: "#ff5a2b", rating: 4,
      blurb: "Three bosses that come to you. Nowhere is far enough away for long.",
      stages: [
        { key: "pursuer", hp: 50, minions: true },
        { key: "charger", hp: 55, minions: true },
        { key: "swarm",   hp: 60, minions: true },
      ],
    },
    {
      id: "bloom", name: "Flora", accent: "#3ddc84", rating: 2,
      blurb: "Nothing but rings and gaps. Practice reading an opening and committing to it.",
      stages: [
        { key: "nova",   hp: 50, minions: false },
        { key: "pulsar", hp: 55, minions: false },
        { key: "nova",   hp: 60, minions: false },
      ],
    },
    {
      id: "clockwork", name: "Horologium", accent: "#ffd23b", rating: 3,
      blurb: "Four patterns on strict timers. Once you hear the rhythm it plays itself.",
      stages: [
        { key: "lattice", hp: 45, minions: false },
        { key: "gatling", hp: 50, minions: false },
        { key: "cross",   hp: 50, minions: false },
        { key: "weaver",  hp: 55, minions: true },
      ],
    },
    {
      id: "twofinals", name: "Duae Coronae", accent: "#ff66c4", rating: 5,
      blurb: "Vulcan and Nox, one after the other, no forms in between to warm up on.",
      stages: [
        { key: "hades", hp: 90, minions: true },
        { key: "void",  hp: 95, minions: true },
      ],
    },
    {
      id: "longnight", name: "Nox Longa", accent: "#8f6bff", rating: 5,
      blurb: "Five closing acts in a row, both bosses, ending where the campaign ends.",
      stages: [
        { key: "nova",   hp: 55, minions: false },
        { key: "pulsar", hp: 60, minions: true },
        { key: "cross",  hp: 60, minions: true },
        { key: "hades",  hp: 85, minions: true },
        { key: "void",   hp: 95, minions: true },
      ],
    },
  ];

  // ---- Battles ----
  // Every form in the game, flattened into one flat list. Each is fought on its
  // own; nothing is locked, and the order is yours.
  const BATTLES = [];
  for (const key of ["inferno", "void"]) {
    CAMPAIGNS[key].stages.forEach((s, i) => {
      BATTLES.push({
        id: "battle:" + key + ":" + s.key + ":" + i,
        campaign: key,
        stageIdx: i,
        stage: s,
        // Roughly how hard the form is on its own: position in its boss's run,
        // with the two crowns pinned to the top.
        rating: s.final ? 5 : Math.max(1, Math.min(4, Math.round(1 + i * 0.7))),
      });
    });
  }

  // ---- What a run is worth ----
  // Every pattern has a value: what that form pays when fought on its own. Any
  // chain of forms — a boss's seven, a Library level, something you built — pays
  // the sum of its forms, doubled, because fighting them back to back on one pool
  // of lives is the hard way to do it and should be the paying way.
  const FORM_VALUE = {};
  for (const b of BATTLES) {
    // A key belongs to exactly one form, so first sighting wins.
    if (FORM_VALUE[b.stage.key] == null) FORM_VALUE[b.stage.key] = b.rating;
  }
  function formValue(key) { return FORM_VALUE[key] || 1; }
  // What a run is worth: every form in it, fought singly, doubled. A stage with
  // a crowd in it is worth every man standing in it — you fought all of them.
  function stageForms(s) {
    return (s.crowd && s.crowd.length) ? s.crowd : [s];
  }
  function chainPayout(stages) {
    return stages.reduce((a, s) => a + stageForms(s).reduce((b, f) => b + formValue(f.key), 0), 0) * 2;
  }

  // ---- Munera: the missions fought against more than one man ----
  //
  // A munus was the whole day's programme, not a single bout, and these are the
  // parts of it nobody survives by taking turns. Every man on the sand throws
  // his full pattern from the opening bell. The emperor watches exactly one of
  // them — that is the one the eye drains and the only one you can hurt — and
  // when he goes down the eye turns to the next. You do not choose the order.
  //
  // Health is deliberately short. The length of one of these is not how long a
  // man takes to put down, it is how long you last with three other patterns in
  // the air while you do it; pricing them like solo bouts would make a four-man
  // mission a two-minute war of attrition nobody finishes.
  const MUNERA = [
    {
      id: "par", name: "Par", accent: "#4dd7ff", rating: 2,
      blurb: "A matched pair — the smallest thing that is not a duel. One chases, one blooms, and only one of them can be answered.",
      stages: [
        { crowd: [
          { key: "pursuer", hp: 32, minions: false },
          { key: "nova",    hp: 32, minions: false },
        ] },
      ],
    },
    {
      id: "umbrae", name: "Tres Umbrae", accent: "#7b5cff", rating: 3,
      blurb: "Three shades, none of them aiming. Nothing here is chasing you — but there is three times as much of it, and two thirds cannot be stopped.",
      stages: [
        { crowd: [
          { key: "lattice", hp: 34, minions: false },
          { key: "spiral",  hp: 34, minions: false },
          { key: "cross",   hp: 34, minions: false },
        ] },
      ],
    },
    {
      id: "grex", name: "Grex", accent: "#3ddc84", rating: 4,
      blurb: "The herd. Four of the cheapest men the school owns, sent out together because that is the only way they are worth watching.",
      stages: [
        { crowd: [
          { key: "pursuer", hp: 26, arm: "eques",  minions: false },
          { key: "charger", hp: 26, arm: "eques",  minions: false },
          { key: "nova",    hp: 26, arm: "thraex", minions: false },
          { key: "weaver",  hp: 26, arm: "thraex", minions: false },
        ] },
      ],
    },
    {
      id: "cohors", name: "Cohors", accent: "#f0b429", rating: 5,
      blurb: "Two armed pairs, then three. The second wave knows what happened to the first and does not care.",
      stages: [
        { crowd: [
          { key: "gatling", hp: 34, arm: "sagittarius", minions: false },
          { key: "mirror",  hp: 34, arm: "dimachaerus", minions: false },
        ] },
        { crowd: [
          { key: "swarm",   hp: 34, arm: "bestiarius",  minions: true },
          { key: "lattice", hp: 40, arm: "provocator",  minions: false },
          { key: "pursuer", hp: 30, arm: "secutor",     minions: false },
        ] },
      ],
    },
    {
      id: "damnatio", name: "Damnatio ad Gladium", accent: "#ff5a2b", rating: 6,
      blurb: "Condemned to the sword. Four armed men, the serpent among them, and an emperor who is watching one of them at a time and enjoying the arithmetic.",
      stages: [
        { crowd: [
          { key: "serpent", hp: 38, arm: "retiarius",   minions: false },
          { key: "hades",   hp: 44, arm: "murmillo",    minions: false },
          { key: "gatling", hp: 34, arm: "sagittarius", minions: false },
          { key: "pulsar",  hp: 34, arm: "andabata",    minions: false },
        ] },
      ],
    },
  ];

  Object.assign(C, { LEVEL_COLORS, LEVELS, BATTLES, MUNERA, formValue, chainPayout, stageForms });
})();
