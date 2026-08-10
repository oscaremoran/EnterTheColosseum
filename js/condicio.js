// Condicio — what state a man is actually in when he walks out
//
// A price at the Sponsio desk used to be read off a man's rank, his arms and
// his form, and those are the three things about him that do not change. So
// every card was the same card: the same names, the same weights, the same
// answer. The only thing moving was the jitter, and a jitter you cannot see is
// indistinguishable from a coin.
//
// This is the part that moves for reasons. A gladiator was an animal kept at
// weight by a school that had money in him, and the school's own worries are
// the ones worth pricing: how lately he has fought, how heavy the kit is that
// he fought in, whether the last man opened him up, and what he has been eating
// since. None of it is secret — the desk posts all four numbers on the board,
// because the desk is not selling you ignorance. It is selling you the odds it
// derived from them, and the chance that you read them better than it did.
//
// Three stats and one weight behind them. The names in this file are the Latin
// the school would have used; the board posts them in plain English, because a
// punter reading a price should not have to translate it first.
//   vires  → not printed as a figure. His wind: bouts fought recently, each one
//                      decaying day by day, each multiplied by what he carried
//                      at the time. It is the largest term in the verdict, and
//                      the board says it in words on the line under him rather
//                      than as a percentage — "twice on the sand in five days"
//                      is the same fact and tells a punter more.
//   vulnus → "wounds"  what is still open. Taken on the sand, closes a little
//                      each day.
//   cibus  → "fed"     the ration. Barley and beans; the famous eat at a better
//                      table, and nobody eats the same week twice.
//   pondus → "load"    the weight his armatura puts on him. Fixed for the man,
//                      and the reason two men who fought the same number of
//                      bouts are not in the same state afterwards.
//
// A day passes when the games are fought — a card settled, a new one bought, a
// rung contested. A card left to time out with nobody's money on it is the same
// afternoon standing, so waiting at the board does not rest anybody.
//
// Where this is read: the desk prices it (fighterWeight), and a duel builds a
// man's body out of it (makeDuellist). Ladder bouts do NOT read it — the man
// above you fights the same on Tuesday as he did on Monday — but they do write
// to it, so putting Hermes down on the ladder is why he is quoted long at the
// desk the following afternoon.
//
// Loaded as a plain script before the engine, so index.html still opens by
// double-clicking it. It holds state, and the state is on the disk.
(() => {
  "use strict";
  const C = (window.COLOSSEUM = window.COLOSSEUM || {});
  const { LADDER, LADDER_BY_ID, armOf } = C;

  // The book belongs to one career, so it is stored under whoever is holding
  // the tessera. progress.js owns that scoping and loads after this file, so
  // the question is asked at call time rather than at load — by which point
  // PROGRESS is there. If it somehow is not, the bare name is a safe fallback.
  const KEY = "dodger_condicio";
  function key() {
    return (C.PROGRESS && C.PROGRESS.scopedKey) ? C.PROGRESS.scopedKey(KEY) : KEY;
  }

  // What each armatura weighs on the man wearing it. A provocator is the only
  // one in a breastplate and a murmillo carries a tower shield and a helmet with
  // a fish on it; a retiarius fights in a shoulder-guard and a loincloth. Two
  // bouts cost them very different weeks.
  const PONDUS = {
    provocator: 1.35, murmillo: 1.30, andabata: 1.20, secutor: 1.15, scissor: 1.15,
    hoplomachus: 1.05, bestiarius: 1.05, thraex: 1.00, dimachaerus: 0.95,
    sagittarius: 0.85, eques: 0.80, retiarius: 0.75,
  };
  function pondus(f) { return PONDUS[f.arm] || 1; }
  // A multiplier on a board is not a fact anybody can use, so the load is also
  // said in words. What the number means: each bout he fights costs him this
  // much of his wind instead of one bout's worth, and he is that much longer
  // getting it back.
  function pondusWord(f) {
    const p = pondus(f);
    if (p <= 0.85) return "light";
    if (p < 1.10) return "fair";
    if (p < 1.25) return "heavy";
    return "iron";
  }

  // How much of a bout is still in his legs after n days. Two days off takes
  // most of it; a week takes nearly all of it.
  const FADE = 0.62;
  const BOUT_COST = 0.34;      // fatigue one bout lays on him, before the load
  const LOG_DAYS = 8;          // how far back the school's book is kept
  const WOUND_HEAL = 0.14;     // what closes overnight
  const WOUND_LOST = 0.42;     // what being put down opens
  const WOUND_WON = 0.13;      // and what winning costs anyway

  // ---- The book ----
  // { day, men: { id: { log: [dayNumbers], wnd, fed } } }. Written defensively,
  // same as everything else that touches the disk: a book this cannot parse is
  // a book it starts again.
  let book = null;

  function blank() { return { day: 0, men: {} }; }
  function load() {
    if (book) return book;
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(key()) || "null"); } catch (e) { raw = null; }
    book = blank();
    if (raw && typeof raw === "object") {
      if (Number.isFinite(raw.day) && raw.day >= 0) book.day = Math.min(raw.day | 0, 1e6);
      if (raw.men && typeof raw.men === "object") {
        for (const f of LADDER) {
          const m = raw.men[f.id];
          if (!m || typeof m !== "object") continue;
          book.men[f.id] = {
            log: Array.isArray(m.log) ? m.log.filter(Number.isFinite).slice(-LOG_DAYS) : [],
            wnd: clamp01(Number(m.wnd) || 0),
            fed: clamp01(Number(m.fed) || 0.7),
          };
        }
      }
    }
    return book;
  }
  function save() {
    try { localStorage.setItem(key(), JSON.stringify(book)); } catch (e) { /* full disk, no career */ }
  }
  function clamp01(v) { return Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0)); }

  // A man the book has never heard of did not appear this morning out of
  // nothing — he has a week behind him like everybody else, so he is seeded
  // with one rather than with a clean sheet nobody in this building has.
  function stateOf(f) {
    const b = load();
    let m = b.men[f.id];
    if (!m) {
      const log = [];
      const n = Math.random() < 0.45 ? 1 : (Math.random() < 0.7 ? 2 : 0);
      for (let i = 0; i < n; i++) log.push(b.day - Math.floor(Math.random() * 5));
      m = b.men[f.id] = { log: log, wnd: Math.random() < 0.3 ? Math.random() * 0.3 : 0, fed: ration(f) };
      save();
    }
    return m;
  }

  // What he has been eating. The school fed everybody barley — they were called
  // the hordearii, the barley men, for it — but a name Martial writes poems
  // about is not on the same table as a man four fights into his career, and no
  // week is quite the last one.
  function ration(f) {
    const rank = LADDER.findIndex((l) => l.id === f.id);
    const base = 0.68 + (rank / Math.max(1, LADDER.length - 1)) * 0.24;
    return clamp01(base + (Math.random() - 0.5) * 0.30);
  }

  // ---- The three numbers ----
  function vires(f) {
    const b = load(), m = stateOf(f), kit = pondus(f);
    let fat = 0;
    for (const d of m.log) {
      const age = Math.max(0, b.day - d);
      fat += BOUT_COST * kit * Math.pow(FADE, age);
    }
    return clamp01(1 - fat);
  }
  function vulnus(f) { return clamp01(1 - stateOf(f).wnd); }
  function cibus(f) { return clamp01(stateOf(f).fed); }

  // The one number the desk actually uses, and the one the board prints large.
  // Weighted the way a lanista would weight them: wind first, because it is the
  // thing that runs out inside the bout, and then what is open, and then what
  // he has had to build any of it out of.
  function habitudo(f) {
    return clamp01(0.42 * vires(f) + 0.28 * vulnus(f) + 0.30 * cibus(f));
  }

  // What the board calls it. The card does not print these words any more — it
  // prints a bar filled to `habitudo`, and this table is what colours it, with
  // the word itself kept on hover. A duel is not lost on condition alone, so
  // even the bottom of the scale is a man who came out; it is only the desk
  // saying it would not have sent him.
  // Five steps and five colours, chosen to be told apart at a glance AND to be
  // dark enough to read a parchment-coloured word off: gold, aegean, weathered
  // stone, ember, blood. Parchment itself sat in the middle of this list for a
  // while and had to go — the label rides inside the fill, and a near-white bar
  // is the one thing you cannot print parchment on.
  const VERDICTS = [
    [0.93, "AT HIS WEIGHT", "gold"],
    [0.84, "SOUND", "safe"],
    [0.71, "SERVICEABLE", "muted"],
    [0.57, "HEAVY-LEGGED", "ember"],
    [0.00, "IN NO STATE", "danger"],
  ];
  function verdict(f) {
    const h = habitudo(f);
    for (const [lo, name, tone] of VERDICTS) if (h >= lo) return { name, tone, h };
    return { name: "IN NO STATE", tone: "danger", h };
  }

  // Whichever of the three is doing the most damage, said the way the school
  // would say it — because a number on a board is not a reason, and a punter
  // arguing with the price deserves to know what he is arguing with.
  function reason(f) {
    const b = load(), m = stateOf(f);
    const v = vires(f), w = vulnus(f), c = cibus(f);
    const recent = m.log.filter((d) => b.day - d <= 5).length;
    const worst = Math.min(v, w, c);
    if (worst > 0.82) {
      return recent === 0 ? "Rested, fed and unmarked." : "Fought lately and looks none the worse.";
    }
    if (worst === w) {
      return w < 0.55 ? "Still carrying the last one. It has not closed."
                      : "Marked from his last bout, though he walks on it well enough.";
    }
    if (worst === v) {
      const kit = pondus(f) >= 1.15 ? ` in ${armOf(f.arm).name.toLowerCase()}'s weight of iron` : "";
      if (recent >= 3) return `Three bouts inside the week${kit}, and it shows.`;
      if (recent === 2) return `Twice on the sand in five days${kit}.`;
      if (recent === 1) return `Out again on short rest${kit}.`;
      return "Never really got his wind back.";
    }
    if (c < 0.50) return "On the thin end of the barley ration.";
    if (c < 0.72) return "Eating whatever the school can spare him.";
    return "Fed like a man they have money in.";
  }

  // Everything the board needs about one man, in one call.
  function readOut(f) {
    const v = verdict(f);
    return {
      vires: vires(f), vulnus: vulnus(f), cibus: cibus(f),
      pondus: pondus(f), pondusWord: pondusWord(f), habitudo: v.h,
      verdict: v.name, tone: v.tone, reason: reason(f),
    };
  }

  // ---- What it is worth ----
  // The desk's hand on the scale. Centred so that an ordinary man in ordinary
  // shape prices at roughly what he always did: this is a spread around the old
  // number, not a discount off it.
  // Centred on an ordinary man in ordinary shape — habitudo lands around 0.80
  // for somebody rested and fed, and 0.80 here comes out at exactly 1. So this
  // term does not quietly mark the whole board up or down; it only says which
  // way this particular man has moved off it.
  //
  // Widened alongside the sand, and for the desk's own protection rather than
  // yours. If condition decides bouts and the price only half admits it, then
  // backing the fitter man is free money forever and there is no reading left
  // to do. The desk quotes what it believes; what it cannot see is still the
  // jitter in pricePair, and that is where the argument lives.
  function priceFactor(f) { return 0.58 + habitudo(f) * 0.525; }
  // And what he brings onto the sand. All three of these are centred so that a
  // rested, fed, unmarked man — habitudo around 0.80 — comes out at 1 and
  // fights exactly as he always did. Condition is not a bonus on top of the old
  // duel; it is a spread around it.
  //
  // Health: the body he has to spend.
  function bodyFactor(f) { return 0.58 + habitudo(f) * 0.52; }
  // Tempo: how fast he moves and how fast he throws.
  function tempoFactor(f) { return 0.80 + habitudo(f) * 0.25; }
  // And the one that is actually felt. The duel AI carries a `skill` term it has
  // never once used — it widens how far ahead a man looks, how steady his read
  // is, and how long he takes to commit to a dodge. That is what being tired
  // costs you in a real fight: not strength, but seeing it late and going the
  // wrong way. Asymmetric on purpose — being in poor shape takes more off you
  // than being at your very best puts on.
  function skillFactor(f) {
    return Math.max(-0.32, Math.min(0.16, (habitudo(f) - 0.80) * 0.75));
  }

  // ---- What the day does to it ----
  // A bout has been fought. Both men are in the book for today whatever the
  // result; the loser is the one who is opened up.
  function fought(winner, loser, both) {
    const b = load();
    for (const f of [winner, loser]) {
      if (!f || !LADDER_BY_ID[f.id]) continue;
      const m = stateOf(f);
      m.log.push(b.day);
      if (m.log.length > LOG_DAYS) m.log = m.log.slice(-LOG_DAYS);
    }
    if (both) {
      // Nobody stood. They opened each other.
      for (const f of [winner, loser]) {
        if (f && LADDER_BY_ID[f.id]) {
          const m = stateOf(f);
          m.wnd = clamp01(m.wnd + WOUND_LOST * (0.8 + Math.random() * 0.4));
        }
      }
    } else {
      if (winner && LADDER_BY_ID[winner.id]) {
        const m = stateOf(winner);
        m.wnd = clamp01(m.wnd + WOUND_WON * (0.5 + Math.random()));
      }
      if (loser && LADDER_BY_ID[loser.id]) {
        const m = stateOf(loser);
        m.wnd = clamp01(m.wnd + WOUND_LOST * (0.7 + Math.random() * 0.6));
      }
    }
    save();
  }

  // A prolusio, which is the same men fighting properly with nothing on it. It
  // costs him the afternoon and it costs him his wind, and it costs him nothing
  // else — which is the whole of what a friendly is.
  function sparred(f) {
    if (!f || !LADDER_BY_ID[f.id]) return;
    const b = load(), m = stateOf(f);
    m.log.push(b.day);
    if (m.log.length > LOG_DAYS) m.log = m.log.slice(-LOG_DAYS);
    save();
  }

  // The games move on. Wounds close by a little, the week's bouts fade on their
  // own out of the log, and everybody eats again — the new ration pulled toward
  // the old one, so a man on a bad run stays on a bad run for a while.
  function advanceDay() {
    const b = load();
    b.day += 1;
    for (const f of LADDER) {
      const m = stateOf(f);
      m.wnd = clamp01(m.wnd - WOUND_HEAL);
      m.fed = clamp01(m.fed * 0.6 + ration(f) * 0.4);
      m.log = m.log.filter((d) => b.day - d <= LOG_DAYS);
    }
    save();
    return b.day;
  }

  function day() { return load().day; }
  function wipe() { book = null; try { localStorage.removeItem(key()); } catch (e) { /* nothing to clear */ } }
  // Drop the copy in memory without touching the disk. What you call when the
  // tessera changes hands: the book on the shelf is still his, but it is no
  // longer the book this desk should be quoting from.
  function forget() { book = null; }

  C.CONDICIO = {
    readOut, habitudo, verdict, reason, pondus, pondusWord,
    vires, vulnus, cibus,
    priceFactor, bodyFactor, tempoFactor, skillFactor,
    fought, sparred, advanceDay, day, wipe, forget, KEY,
  };
})();
