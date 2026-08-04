// The ladder — twenty-four men holding the board
//
// Real names off the inscriptions, with their real records where one
// survives, plus the tier titles a rank earns.
//
// Loaded as a plain script before the engine, so index.html still opens by
// double-clicking it — ES modules are blocked over file://. Everything here is
// content: no engine state, nothing that reads the canvas or the DOM.
(() => {
  "use strict";
  const C = (window.COLOSSEUM = window.COLOSSEUM || {});

  // ---- The Ladder ----
  // Twenty-four fighters hold the board, rank XXIV at the bottom up to rank I.
  // You may only call out the one standing directly above you. Names are drawn
  // from the surviving inscriptions and graffiti — these were real people, and
  // pugn/vic/miss are their real records where a record survives.
  const LADDER = [
    // rank 24 — bottom of the board
    { id: "rapidus", name: "Rapidus", arm: "eques", key: "pursuer", hp: 40,
      blurb: "First blood of the morning, and he knows it. Rides you down without a plan.",
      pugn: 4, vic: 2, miss: 1 },
    { id: "glauco", name: "Glauco", arm: "thraex", key: "nova", hp: 42,
      blurb: "Mantua's own. Seven fights, and a stone paid for by his wife Aurelia.",
      pugn: 7, vic: 5, miss: 1 },
    { id: "danaos", name: "Danaos", arm: "hoplomachus", key: "weaver", hp: 44,
      blurb: "Keeps the spear between you and him. Patient in a way the crowd hates.",
      pugn: 9, vic: 6, miss: 2 },
    { id: "bato", name: "Bato", arm: "murmillo", key: "charger", hp: 46,
      blurb: "A Dacian, fought three in one day and won the first two. Still young.",
      pugn: 3, vic: 2, miss: 0 },
    { id: "urbicus", name: "Urbicus", arm: "secutor", key: "pursuer", hp: 48,
      blurb: "Thirteen fights out of Florence. Left a daughter, five years old.",
      pugn: 13, vic: 9, miss: 2 },
    { id: "nikephoros", name: "Nikephoros", arm: "dimachaerus", key: "mirror", hp: 50,
      blurb: "\"Victory-bearer\" — a slave name given as a joke that stopped being funny.",
      pugn: 11, vic: 8, miss: 1 },
    { id: "callimorphus", name: "Callimorphus", arm: "thraex", key: "spiral", hp: 52,
      blurb: "Beautiful, and paid to be. Fights like the crowd is the point, because it is.",
      pugn: 14, vic: 10, miss: 3 },
    { id: "aptus", name: "Aptus", arm: "sagittarius", key: "gatling", hp: 52,
      blurb: "Never closes. Never has to. Everything he throws already knows where you are.",
      pugn: 12, vic: 9, miss: 1 },
    { id: "severus", name: "Severus Niger", arm: "provocator", key: "lattice", hp: 58,
      blurb: "In a breastplate, and in no hurry. You will be tired before he is.",
      pugn: 16, vic: 11, miss: 4 },
    { id: "cerinthus", name: "Cerinthus", arm: "bestiarius", key: "swarm", hp: 55,
      blurb: "Comes up out of the hypogeum with whatever came up with him.",
      pugn: 15, vic: 10, miss: 2 },
    { id: "faustus", name: "Faustus", arm: "murmillo", key: "lattice", hp: 60,
      blurb: "\"Lucky.\" Twelve wins says the name is doing some work.",
      pugn: 18, vic: 12, miss: 3 },
    { id: "pardus", name: "Pardus", arm: "scissor", key: "cross", hp: 56,
      blurb: "The Leopard. The blade is welded to his arm; he cannot put it down.",
      pugn: 17, vic: 12, miss: 2 },
    { id: "amazonia", name: "Amazonia", arm: "dimachaerus", key: "mirror", hp: 58,
      blurb: "Fought Achillia at Halicarnassus. Both walked off standing — look two rungs up.",
      pugn: 13, vic: 10, miss: 3 },
    { id: "achillia", name: "Achillia", arm: "murmillo", key: "charger", hp: 60,
      blurb: "The other half of that draw. Neither of them has forgotten it.",
      pugn: 13, vic: 10, miss: 3 },
    { id: "diodorus", name: "Diodorus", arm: "provocator", key: "pulsar", hp: 62,
      blurb: "His stone says he beat Demetrius and the referee gave it away anyway.",
      pugn: 20, vic: 14, miss: 4 },
    // The one man on the board carrying a handicap, and the reason is that his
    // two halves multiply instead of adding. The serpent is a rope of bullets
    // with holes you have to aim for; the net is the thing that takes away your
    // aim. Either alone belongs at rank IX. Together they were being fought at
    // rank II — he played like Priscus, who has eighty-two health and the Void.
    // `rate` slows every cooldown he has at once, which is the only lever that
    // widens the gaps in the rope rather than just thinning it: the spacing of a
    // stream is its interval times its speed, so stretching the interval alone is
    // what turns a wall back into a fence. It slows his nets by the same amount.
    // Ladder bouts only — what he is worth at the Sponsio desk is priced apart,
    // in DUEL_NERF. Tempo and not health for that reason too: the desk reads hp
    // straight off this line, but a duel gives every man the same body, so taking
    // health off him here would mark his price down without costing him anything
    // in the only fight that price is about.
    { id: "triumphus", name: "Triumphus", arm: "retiarius", key: "serpent", hp: 58,
      rate: 0.82,
      blurb: "Net first, trident second. Cut the net loose or you don't get to dodge.",
      pugn: 19, vic: 13, miss: 3 },
    { id: "hermes", name: "Hermes", arm: "andabata", key: "pulsar", hp: 64,
      blurb: "Martial wrote three poems about him. \"The grief and terror of his age.\"",
      pugn: 24, vic: 19, miss: 2 },
    { id: "crescens", name: "Crescens", arm: "secutor", key: "pursuer", hp: 60,
      blurb: "Pompeii's walls call him \"lord of the girls.\" He fights like it's owed to him.",
      pugn: 22, vic: 16, miss: 3 },
    { id: "pugnax", name: "Pugnax", arm: "scissor", key: "cross", hp: 66,
      blurb: "Nero's man out of the Neronian school. Three fights on the board, three wins.",
      pugn: 21, vic: 17, miss: 1 },
    { id: "carpophorus", name: "Carpophorus", arm: "bestiarius", key: "swarm", hp: 70,
      blurb: "Killed twenty beasts in one morning. The sand has never fully dried out.",
      pugn: 26, vic: 21, miss: 2 },
    { id: "tetraites", name: "Tetraites", arm: "thraex", key: "spiral", hp: 68,
      blurb: "Famous enough that they sell cups with his fight painted on them in Gaul.",
      pugn: 27, vic: 22, miss: 3 },
    { id: "verus", name: "Verus", arm: "murmillo", key: "hades", hp: 78,
      blurb: "Fought Priscus at the opening of this building until neither could lift a shield.",
      pugn: 30, vic: 24, miss: 5 },
    { id: "priscus", name: "Priscus", arm: "murmillo", key: "void", hp: 82,
      blurb: "The other man in that fight. Titus freed them both rather than choose.",
      pugn: 30, vic: 24, miss: 5 },
    // rank 1 — the top of the ladder
    { id: "flamma", name: "Flamma", arm: "secutor", key: "hades", hp: 92,
      blurb: "Offered the rudis four times and refused it four times. Died on the sand at thirty, Syrian, and still here.",
      pugn: 34, vic: 21, miss: 9 },
  ];
  const LADDER_BY_ID = Object.fromEntries(LADDER.map((f) => [f.id, f]));
  // Rank 1 is the top, so the array reads bottom-up: index 0 holds rank LADDER.length.
  const UNRANKED = LADDER.length + 1;   // where a newcomer stands: below the board

  // The tier titles a rank earns you. A tiro has never fought; the two palus
  // ranks are the ones that got their names painted on the wall.
  const TIERS = [
    [1, 1, "Primus Palus", "first stake of the school"],
    [2, 6, "Secundus Palus", "second stake — one man above you"],
    [7, 12, "Veteranus", "has outlived the odds"],
    [13, 19, "Gregarius", "one of the crowd of them"],
    [20, LADDER.length, "Tiro", "blooded, barely"],
  ];
  function tierOf(rank) {
    for (const [lo, hi, name, note] of TIERS) {
      if (rank >= lo && rank <= hi) return { name, note };
    }
    return { name: "Tiro", note: "never yet on the sand" };
  }

  Object.assign(C, { LADDER, LADDER_BY_ID, UNRANKED, tierOf });
})();
