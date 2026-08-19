// The day's card, and what it costs to get out of one
//
// A gladiator did not browse. He was told what he was fighting and when, and
// the whole of his day was somebody else's arrangement — so that is what the
// building hands you now: a plan, dealt once, fought through, and replaced by
// the next one only when the last is finished.
//
// This file holds the prices and nothing else. What goes ON a plan needs the
// unlock rules, the ladder board and every list in the game, all of which live
// in the engine, so the dealing is done there; the numbers live here where they
// can be argued about without reading any of it.
//
// Loaded as a plain script before the engine, so index.html still opens by
// double-clicking it — ES modules are blocked over file://. Everything here is
// content: no engine state, nothing that reads the canvas or the DOM.
(() => {
  "use strict";
  const C = (window.COLOSSEUM = window.COLOSSEUM || {});

  // ---- Buying your way out of a bout ----
  // There is no longer any such thing. A bout on the card was once something a
  // purse could have struck off it, priced by peril; that is gone, and with it
  // the idea that the day's work is a toll. What you owe the day is fought or
  // it is left unfought — see dayWork in the engine, which asks for the rung
  // and a share of the rest and does not care about your money.

  // ---- What a bout pays, by how bad it is ----
  // On top of the contract multiplier, and in every mode. Peril was already
  // worth more because the purse is struck from the rating; this bends the
  // curve so the top of the scale is worth crossing the sand for rather than
  // worth five denarii more than the bottom.
  const PERIL_PAY = [1, 1.2, 1.5, 2, 3];
  function perilPay(rating) {
    const r = Math.max(1, Math.min(PERIL_PAY.length, Math.round(rating || 1)));
    return PERIL_PAY[r - 1];
  }

  // ---- Walking off with marks you never used ----
  // The surgeon's spare marks are the one thing you can carry out of a bout, and
  // a spare carried out is a bout you were never really in danger in. The
  // magistrate pays for that, by peril: nobody is impressed by an untouched
  // Tiro bout, and everybody is impressed by an untouched Primus Palus.
  const SPARE_PAY = [2, 5, 7, 12, 20];
  function sparePay(rating) {
    const r = Math.max(1, Math.min(SPARE_PAY.length, Math.round(rating || 1)));
    return SPARE_PAY[r - 1];
  }
  // Two or more and the crowd loses its head: the whole purse doubles, and the
  // stands come down on the sand. Once, not once per spare — a bonus that
  // compounds is a bonus somebody farms.
  const SPARE_OVATION = 2;

  // ---- The day's shape ----
  // One ladder bout, one out of the Library, one munus, and the next man down
  // ONE campaign path — Vulcan's run until it is finished, then Nox's. Anybody
  // above you who has asked for a bout is added on top of this.
  const PLAN = { library: 1, munera: 1, ladder: 1, campaign: 1 };

  // ---- Knowing when to stop ----
  // Three days is a long sitting. The building says so once, and if you stay it
  // stops paying you — not a lock, not a lecture twice, just the purse closing.
  const DAYS_PER_SITTING = 3;

  Object.assign(C, { PERIL_PAY, perilPay,
                     SPARE_PAY, sparePay, SPARE_OVATION, PLAN, DAYS_PER_SITTING });
})();
