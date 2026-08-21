// The Ludus — the school's four lessons
//
// The training school is walked in order: move, then the items, then how you
// actually deal damage, then the man himself. Each lesson names what it wants,
// and will not let you past until you have done it.
//
// Loaded as a plain script before the engine, so index.html still opens by
// double-clicking it — ES modules are blocked over file://. Everything here is
// content: no engine state, nothing that reads the canvas or the DOM.
//
// The catch is that a lesson has to ask questions about a fight in progress —
// how long you have lasted, what you have picked up, how much of him is left.
// It does not reach out for that. The engine hands every predicate a plain
// snapshot `g` and this file reads only what is on it:
//
//   t        — seconds survived in this lesson, not counting time spent reading
//   got      — which item kinds have been picked up, keyed by type
//   moved    — distance travelled, for the card that waits until you have moved
//   hurt     — whether a life has been lost yet
//   bullets  — how many of his shots are in the air
//   player, boss, zone, hotZone, powerups — positions and sizes, read-only
//
// Each part carries its own goal: `test` is asked every frame once the cards are
// done, `goal` is the line the sand shows about how far along you are, and
// `close` is what waits on the other side of it.
//
// A card is: what raised it (`at`), what it says, and what on the sand it is
// about (`focus`, ringed in gold behind the popup). `seq` cards come in order
// and wait their turn; the others are interruptions that fire whenever their
// moment arrives, because getting hit does not schedule itself.
(() => {
  "use strict";
  const C = (window.COLOSSEUM = window.COLOSSEUM || {});
  const { PU_KEYS } = C;          // sparsiones.js loads before this one

  const TUT_SURVIVE = 20;    // seconds of the first lesson
  const TUT_DRAIN = 0.5;     // how far down the third lesson takes him

  // An item of a given kind lying on the sand, for the cards that point at one.
  function hasPu(g, kind) { return g.powerups.some((p) => p.type === kind); }
  function puFocus(g, kind) {
    const p = g.powerups.find((x) => x.type === kind);
    return p ? { x: p.x, y: p.y, r: 40 } : null;
  }
  // How much of him is left, as a fraction. Guarded, because a lesson can be
  // asked its goal on the frame before a stage has built its man.
  function hpFrac(g) { return g.boss.maxhp ? g.boss.hp / g.boss.maxhp : 1; }

  const LUDUS = [
    {
      n: 1, roman: "I", name: "Move and Dodge",
      sub: "stay alive for 20 seconds",
      goal: (g) => `stay alive · ${Math.max(0, TUT_SURVIVE - g.t).toFixed(1)}s`,
      test: (g) => g.t >= TUT_SURVIVE,
      close: "You stayed alive for 20 seconds. That is the first lesson — don't get hit. Next: the items that drop during a fight.",
      steps: [
        {
          id: "move", seq: true,
          kicker: "THE LUDUS · PART I", head: "MOVE AND DODGE",
          body: "This is training. You get three lives. Nothing you do here pays you or gets recorded — but you can still lose, and if you do, you retake this lesson.\n\nArrow keys to move. On a phone, hold a thumb anywhere on the screen and drag.\n\nStay alive for 20 seconds to pass.",
          focus: (g) => ({ x: g.player.x, y: g.player.y, r: 46 }),
          at: (g) => true,
        },
        {
          id: "danger", seq: true,
          kicker: "YOUR OPPONENT", head: "RED HURTS YOU",
          body: "That is Venator. He chases you and shoots at you.\n\nAnything red costs you a life if it touches you — his shots, and Venator himself. Nothing else on screen can hurt you.\n\nYou have no weapon and no shield. Moving is your only option.",
          focus: (g) => ({ x: g.boss.x, y: g.boss.y, r: g.boss.r + 22 }),
          at: (g) => g.moved > 190 && g.bullets >= 2,
        },
        {
          // Not in the queue. A wound happens when it happens, and it is the one
          // thing on this floor that has to be felt rather than described.
          id: "wound",
          kicker: "YOU GOT HIT", head: "THAT COST YOU A LIFE",
          body: "You lost one of the three lives shown at the bottom of the screen.\n\nYou are briefly invincible right now, so use it to get clear.\n\nLose all three and this lesson starts over.",
          focus: (g) => ({ x: g.player.x, y: g.player.y, r: 44 }),
          at: (g) => g.hurt,
        },
      ],
    },
    {
      n: 2, roman: "II", name: "Collect Powerups",
      sub: "pick up one of each item",
      goal: (g) => {
        const got = PU_KEYS.filter((k) => g.got[k]).length;
        return `items · ${got} of ${PU_KEYS.length}`;
      },
      test: (g) => PU_KEYS.every((k) => g.got[k]),
      close: "You picked up all three. None of them made you hit harder — they help you get where you need to be. You have not been shown where that is yet. That is the next lesson.",
      steps: [
        {
          id: "drops", seq: true,
          kicker: "THE LUDUS · PART II", head: "PICK UP THE ITEMS",
          body: "Items drop onto the sand during a fight. There are three kinds.\n\nPick up one of each to pass this lesson.\n\nThey disappear after a few seconds, so go and get them.",
          focus: (g) => (g.powerups[0] ? { x: g.powerups[0].x, y: g.powerups[0].y, r: 40 } : null),
          at: (g) => g.powerups.length > 0,
        },
        {
          id: "medicus", seq: true,
          kicker: "GREEN", head: "GIVES A LIFE BACK",
          body: "Green gives you back a life you lost.\n\nIf you are already on full lives, it gives you a spare one on top instead. You can hold up to three spares.",
          focus: (g) => puFocus(g, "medicus"),
          at: (g) => !!g.got.medicus || hasPu(g, "medicus"),
        },
        {
          id: "purple", seq: true,
          kicker: "PURPLE AND WHITE", head: "SLOW AND SPEED",
          body: "Purple slows everything red on screen for 5 seconds.\n\nWhite makes you move faster for 7 seconds.\n\nNeither one lets you deal more damage. They just help you get somewhere in time.",
          focus: (g) => puFocus(g, "slow") || puFocus(g, "swift"),
          at: (g) => !!g.got.slow || !!g.got.swift || hasPu(g, "slow") || hasPu(g, "swift"),
        },
        {
          id: "wound2",
          kicker: "YOU GOT HIT", head: "THAT COST YOU A LIFE",
          body: "You lost a life, and you are briefly invincible. A green item will give it back, if one drops.",
          focus: (g) => ({ x: g.player.x, y: g.player.y, r: 44 }),
          at: (g) => g.hurt,
        },
      ],
    },
    {
      n: 3, roman: "III", name: "Attack",
      sub: "take him down to 50%",
      goal: (g) => `his life · ${Math.round(hpFrac(g) * 100)}%`,
      test: (g) => !!g.boss.maxhp && g.boss.hp <= g.boss.maxhp * TUT_DRAIN,
      close: "You took him to half without ever touching him. That is how this works — you do not hit your opponent, you stand where the emperor is looking. He is still up. Last lesson: finish him.",
      steps: [
        {
          id: "g.zone", seq: true,
          kicker: "THE LUDUS · PART III", head: "STAND IN THE BLUE CIRCLE",
          body: "This is how you attack. You still have no weapon.\n\nThe emperor watches one patch of sand at a time — that is the blue circle. Stand inside it and Venator loses health. That is the whole of it.\n\nTake him down to 50% to pass.",
          focus: (g) => ({ x: g.zone.x, y: g.zone.y, r: g.zone.r + 12 }),
          at: (g) => true,
        },
        {
          id: "zonemove", seq: true,
          kicker: "THE CIRCLE MOVES", head: "DON'T IGNORE IT",
          body: "Every few seconds the circle moves somewhere else. It turns yellow just before it goes.\n\nIf you never stood in it, Venator heals some health back.\n\nHiding in a safe corner is the one thing that actively costs you.",
          focus: (g) => ({ x: g.zone.x, y: g.zone.y, r: g.zone.r + 12 }),
          at: (g) => g.boss.hp < g.boss.maxhp - 5,
        },
        {
          id: "hot", seq: true,
          kicker: "THE SMALL CIRCLE", head: "TRIPLE DAMAGE",
          body: "A second, smaller circle orbits Venator.\n\nThe ring around it fills up while nothing is hitting you, and getting hit empties it. Once it is full it lights up and drains him three times as fast — and nothing he does can put it out.\n\nIt orbits the man shooting at you, so it is never safe ground. That is the trade.",
          focus: (g) => ({ x: g.hotZone.x, y: g.hotZone.y, r: g.hotZone.r + 10 }),
          at: (g) => g.hotZone.on,
        },
      ],
    },
    {
      n: 4, roman: "IV", name: "The Venator",
      sub: "beat him",
      goal: (g) => `put him down · ${Math.round(hpFrac(g) * 100)}%`,
      test: (g) => false,          // this one ends the way every real bout ends
      close: "Training does not pay you and does not get recorded. Everything from here does.",
      steps: [
        {
          id: "final", seq: true,
          kicker: "THE LUDUS · PART IV", head: "THE REAL FIGHT",
          body: "Same opponent, no more instructions.\n\nDodge his shots, grab the items, stand in the blue circle. Nobody is going to stop the fight to tell you which one to do.\n\nBeat Venator and the rest of the game opens up.",
          focus: (g) => ({ x: g.boss.x, y: g.boss.y, r: g.boss.r + 22 }),
          at: (g) => true,
        },
        {
          id: "finish", seq: true,
          kicker: "ALMOST DOWN", head: "FINISH HIM",
          body: "Stay in the circle and it is over.\n\nAfter this: 24 fighters to climb past, a library of built fights, and a desk that will take bets on other people's bouts.",
          focus: (g) => ({ x: g.boss.x, y: g.boss.y, r: g.boss.r + 22 }),
          at: (g) => g.boss.hp <= g.boss.maxhp * 0.34,
        },
      ],
    },
  ];
  const LUDUS_BY_N = Object.fromEntries(LUDUS.map((p) => [p.n, p]));

  Object.assign(C, { LUDUS, LUDUS_BY_N, TUT_SURVIVE, TUT_DRAIN });
})();
