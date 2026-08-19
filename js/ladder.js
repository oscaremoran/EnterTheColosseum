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
    // The one man on the board handed less pressure than his rung earns, and the
    // trouble was never the net. It is the rope.
    //
    // A serpent changes SHAPE at depth rather than merely getting faster. Two
    // strands shallow — one whipping line with holes you aim for, the pattern
    // you learn on. At sdeep 0.4 the head coils and it becomes four; at 0.75 it
    // becomes six, offset so the holes in one strand sit on the beads of the
    // next. Six is Serpens, the fourth thing Nox sends, and it is a different
    // animal to the thing at two.
    //
    // Rank IX hands out depth 4, which is sdeep 0.80 — over both thresholds. So
    // the ninth man on the board was throwing the full braid, the same rope the
    // top of the board throws, and no amount of tempo was going to fix a bullet
    // count three times what the rung is for. `rate` least of all: the spacing
    // of a whipping stream is its interval times its speed and BOTH carry the
    // tempo, so the tempo cancels and the beads stay 51px apart however slow he
    // is made. All it was ever buying was fewer shots a second.
    //
    // So he is handed depth 2, which is sdeep 0.40 — the coil, and nothing past
    // it. Four strands instead of six, and no strike, which took him from
    // twenty-two bullets a second to fourteen. Everything else on the board
    // still reads its own rung.
    //
    // Fourteen was still too many. `rate` at 0.62 takes the rest: it divides
    // every cooldown he has, so the four strands arrive a third slower than they
    // did and he walks the top of the sand slower with them. It does NOT widen
    // the beads — the spacing of a whipping stream is its interval times its
    // speed and both carry the tempo, so the tempo cancels and they stay 52px
    // apart however slow he is made. What it buys is fewer of them in the air,
    // which is the thing that was killing people.
    //
    // And his health comes down with it, 58 to 42, because a rope you can read
    // is still a rope you have to stand in front of for as long as he lasts.
    // `priceHp` is what stops that being an exploit: health is the one handicap
    // that does nothing in a duel, since both men there are given the same body,
    // so a man marked down to 42 would be quoted as the weaker man at the desk
    // while fighting a duel exactly as he always did. He keeps his old price.
    //
    // All three are the ladder bout alone. What he is worth at the desk is
    // priced apart, in DUEL_NERF.
    { id: "triumphus", name: "Triumphus", arm: "retiarius", key: "serpent",
      hp: 42, priceHp: 58, rate: 0.62, depth: 2,
      blurb: "Net first, trident second. Cut the net loose or you don't get to dodge.",
      pugn: 19, vic: 13, miss: 3 },
    { id: "hermes", name: "Hermes", arm: "andabata", key: "pulsar", hp: 64,
      blurb: "Martial wrote three poems about him. \"The grief and terror of his age.\"",
      pugn: 24, vic: 19, miss: 2 },
    { id: "crescens", name: "Crescens", arm: "secutor", key: "pursuer", hp: 60,
      blurb: "Pompeii's walls call him \"lord of the girls.\" He fights like it's owed to him.",
      pugn: 22, vic: 16, miss: 3 },
    // ---- Secundus Palus, ranks II to VI ----
    // The five men below the top, and they were fought like five more crowns.
    // Each of them carries a late-run form at close to a boss's health, at a
    // depth their rung hands them for free, and the board reached them long
    // before a career has the tools for that. Every one of them now carries a
    // `rate` handicap — the same lever Triumphus is on, and for the same reason:
    // it widens the gaps in what he throws rather than just thinning the wall,
    // and it is the only handicap that does. Health comes down with it, because
    // a rung near the top was also simply a longer fight than the one below it.
    // Ladder bouts only; what they are worth at the Sponsio desk is priced apart.
    { id: "pugnax", name: "Pugnax", arm: "scissor", key: "cross", hp: 60, rate: 0.9,
      blurb: "Nero's man out of the Neronian school. Three fights on the board, three wins.",
      pugn: 21, vic: 17, miss: 1 },
    { id: "carpophorus", name: "Carpophorus", arm: "bestiarius", key: "swarm", hp: 62, rate: 0.86,
      blurb: "Killed twenty beasts in one morning. The sand has never fully dried out.",
      pugn: 26, vic: 21, miss: 2 },
    { id: "tetraites", name: "Tetraites", arm: "thraex", key: "spiral", hp: 62, rate: 0.9,
      blurb: "Famous enough that they sell cups with his fight painted on them in Gaul.",
      pugn: 27, vic: 22, miss: 3 },
    { id: "verus", name: "Verus", arm: "murmillo", key: "hades", hp: 68, rate: 0.85,
      blurb: "Fought Priscus at the opening of this building until neither could lift a shield.",
      pugn: 30, vic: 24, miss: 5 },
    // The longest fight in the building, and it was not supposed to be — the
    // crown is. A murmillo carries a body modifier of 1.2, so seventy on this
    // line was eighty-four on the sand, against Flamma's seventy: the man one
    // rung below the top took a fifth longer to put down than the top itself,
    // while throwing the Void at a rung that hands out depth 6. Fifty-six here
    // is sixty-seven out there, which puts him just under the crown where a
    // second stake belongs.
    //
    // `priceHp` keeps the Sponsio desk quoting him at his old weight. Health is
    // the one handicap that does nothing in a duel, since both men there are
    // given the same body — so a man marked down for his ladder bout would
    // otherwise be sold as the weaker man while fighting duels exactly as he
    // always did. His tempo handicap is unchanged, and what he is worth at the
    // desk is priced apart again in DUEL_NERF.
    { id: "priscus", name: "Priscus", arm: "murmillo", key: "void",
      hp: 56, priceHp: 70, rate: 0.85,
      blurb: "The other man in that fight. Titus freed them both rather than choose.",
      pugn: 30, vic: 24, miss: 5 },
    // rank 1 — the top of the ladder.
    // He is the last fight in the building and he should feel like it, but he
    // was ninety-two health of forge-fire behind a secutor's tempo at the
    // deepest pressure the board can hand a man, and that is not a hard fight,
    // it is a wall. Slowed and shortened; still the longest afternoon on the
    // board, and still the only man who gets you the rudis.
    { id: "flamma", name: "Flamma", arm: "secutor", key: "hades", hp: 78, rate: 0.8,
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

  // The same standing, said as a peril from I to V — which is the scale the
  // day's card prices and bills a bout on.
  //
  // It has to come from the table above and not from arithmetic on the rank,
  // and here is why it used to: the card worked its own peril out by cutting
  // twenty-four rungs into five even blocks, ceil((24 - rank + 1) / 5). The
  // TIERS above are not even blocks and were never meant to be — Primus Palus
  // is ONE man, because the first stake of the school is a post with one name on
  // it, and the tiers below it widen as the board gets more crowded. Two scales
  // wearing the same five titles disagreed on nine rungs out of twenty-four:
  // Priscus and Verus stand at Secundus Palus and were billed Primus Palus,
  // Triumphus stands at Veteranus and was billed Secundus Palus, and so on down.
  // A man's rung and the peril of fighting him are the same fact, so they are
  // now the same number.
  function tierRating(rank) {
    for (let i = 0; i < TIERS.length; i++) {
      if (rank >= TIERS[i][0] && rank <= TIERS[i][1]) return TIERS.length - i;
    }
    return 1;
  }

  Object.assign(C, { LADDER, LADDER_BY_ID, UNRANKED, TIERS, tierOf, tierRating });
})();
