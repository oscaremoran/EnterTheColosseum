// Exitus — how a career ends, and what the man is afterwards
//
// Everything else in this building is about getting up the board. This file is
// about the afternoon you stop. A gladiator's career had an end that was not
// death far more often than the films admit — discharge, a school of his own,
// a job teaching, being quietly sold on to somewhere smaller — and which of
// those a man got was decided by what his record said about him. So that is
// what this is: a list of fates, each with a gate saying which records may
// reach it, and the prose that gets read out when one is taken.
//
// Three things open the door, and none of them is dying:
//   · taking rank I, when the munerarius comes down with the rudis
//   · refusing it, and then refusing it again, which is its own road
//   · walking away, from the Tessera, at whatever rank you happen to hold
// A career that ends is SEALED: the board, the purse and the record freeze as
// they stand and become a monument. The tessera is not struck off — you can
// still read him, and the house still holds him — but he does not fight again.
// Entering a new man is how you carry on.
//
// ---------------------------------------------------------------------------
// WRITING THE FATES
// ---------------------------------------------------------------------------
// The FATES array below is the whole of the content. Add to it, cut from it,
// rename anything. What the engine needs from each entry is the id, the gate,
// and the accent; everything else is words.
//
// All four fates are written. A line that is not yet can be left as a STUB,
// written as W("..."), where the argument is a note to yourself about what the
// line is for rather than text meant to be read in the arena — a stub renders
// on screen in grey with [unwritten] beside it, so nothing is ever silently
// blank and you can see at a glance what is still owed. A plain string renders
// as prose. Adding a fifth fate, stub it and fill it in; that is what it is for.
//
// Two house rules for the prose that replaces them:
//   · Second person. The man across the sand talks to "you" all afternoon and
//     the epilogue does not suddenly start calling you "he".
//   · Tight. Two or three sentences to a paragraph. These are meant to read in
//     one screenful, nearer an inscription than a chapter.
//
// Four fates, deliberately. The gates are drawn so that one of them — Walked
// Off — is open to any career that has fought at all, which is what keeps a man
// halfway up the board from opening this screen and being offered nothing.
//
// A fate has:
//   id      never change one that has been released — the list of endings a
//           player has reached is stored by id, across every tessera they own.
//   name    what the ending is called on the screen and in the collection.
//   sub     one line under the name, in the offer list.
//   kicker  the small caps line over the epilogue. Think "DISCHARGED".
//   accent  the colour the whole epilogue is drawn in.
//   after   what the man is called once he is sealed — his title afterwards,
//           the way "Rudiarius" is a title. Shown on the frozen tessera.
//   gate(c) true if this career may take this fate. See the context below.
//   hidden  true if it must not be listed as a thing to aim at until it has
//           been reached once. It is still offered the moment it is earned.
//   offer   one or two sentences, read while you are choosing. What is being
//           held out, and what it costs.
//   body    the epilogue, as an array of paragraphs. This is the ending.
//   stone   one line, cut into the monument the sealed career becomes.
//
// The context a gate is handed, all of it read off the career at the moment
// the offer is made:
//   c.atTop      standing on rank I with the offer on the table
//   c.rank       the rung held now (1 is the top; UNRANKED is off the board)
//   c.best       the highest rung ever held, which a slide back down cannot undo
//   c.ranked     true once he has ever been on the board at all
//   c.pugn       fights taken
//   c.vic        fights won
//   c.miss       fights lost and walked off from — stans missus
//   c.felled     how many of the twenty-four he has personally put down
//   c.purse      denarii in hand
//   c.day        which day of games the career is on
//   c.refusals   times the rudis has been held out and waved away
//   c.doctore    true if the man who trains the school is still with him
//   c.sine       true if he has ever taken a bout with no reprieve on it
//   c.dropped    true if he has ever been put down a rung
//   c.forms      how many of the fourteen forms he has beaten
//   c.name       what is cut into his tessera
//
// Loaded as a plain script before the engine, so index.html still opens by
// double-clicking it. It is content and gates: no engine state, no DOM, no
// storage. Sealing a career is progress.js's job, and drawing the screen is
// the engine's.
(() => {
  "use strict";
  const C = (window.COLOSSEUM = window.COLOSSEUM || {});

  // A line nobody has written yet. See the note above.
  const W = (hint) => ({ stub: true, hint: String(hint || "") });
  const isStub = (v) => !!(v && typeof v === "object" && v.stub);

  const FATES = [
    // ---- The top of the board ----------------------------------------------
    {
      id: "rudis",
      name: "The Rudis",
      sub: "the wooden sword, and the gate you walk out of",
      kicker: "DISCHARGED",
      accent: "#d9a441",
      after: "Rudiarius",
      // The one the whole climb was pointed at. Nothing else is asked of it.
      gate: (c) => c.atTop,
      offer: "The munerarius holds it out to you — the wooden sword meaning discharge, becoming a free man, and escaping the endless battles",
      body: [
        "You accept, and the crowd roars as you leave through the Gate of Life for the last time.",
        "You will be a free citizen of Rome. All your life you have only known the battles, and you have finally escaped.",
        "Congratulations! You have become a true gladiator, and have won the favor of the crowd, finally obtaining the Rudis!",
      ],
      stone: "cut for a man who reached the top and left",
    },
    {
      id: "flamma",
      name: "Four Times Refused",
      sub: "the rudis offered and refused",
      kicker: "AND STILL HERE",
      accent: "#e0301f",
      after: "Invictus",
      // Flamma was offered it four times and refused it four times, and died on
      // the sand at thirty with the record cut on his stone anyway. You cannot
      // arrive here by accident: it takes four separate afternoons of saying no.
      gate: (c) => c.refusals >= 4,
      offer: "the fourth time you wave it away, and nobody bothers to ask you a fifth",
      body: [
        "You refuse, and become the crowd's favorite. You will stay in the arena for the rest of your days.",
        "The crowd loves you for refusing and you continue to battle with the emperor's favor.",
        "Congratulations! Eventually, you will perish, but you have transcended into myth for refusing the Rudis.",
      ],
      stone: "cut for a man who would rather be the best than escape",
    },

    // ---- The trade a fighting man goes into ---------------------------------
    {
      id: "doctor",
      name: "The Doctore",
      sub: "stay in the school, and teach the next one his first morning",
      kicker: "THE TRAINER",
      accent: "#3ddc84",
      after: "Doctor",
      // The green man who walks a new gladiator round the passage on his first
      // morning is himself a retired fighter. This is only on the table for a
      // career that never sent him away — you do not get to inherit the job
      // from a man you dismissed.
      gate: (c) => c.doctore && c.vic >= 15,
      offer: "the old doctore offers you his job",
      body: [
        "You accept and become the new trainer of the gladiators.",
        "You see many students enter and never come out, but this is your choice.",
        "Congratulations! You become the most famous Doctore in recent times and train the newest generation of fighters.",
      ],
      stone: "cut for a man who stayed and taught",
    },

    // ---- Walking away, at whatever height you got to ------------------------
    {
      id: "missus",
      name: "Walked Off",
      sub: "put the sword down where you are and do not come back",
      kicker: "FINISHED",
      accent: "#a08f76",
      after: "Missus",
      // The floor. Any career that has actually fought can end here, which is
      // the point: quitting halfway up must be a real option with a real ending
      // behind it, not a menu that refuses you.
      gate: (c) => c.pugn >= 1,
      offer: "Leave the arena behind",
      body: [
        "The crowd, the school, the other gladiators, and to some degree yourself are disappointed in you.",
        "Your fate lies on the emperor's will. You are not hopeful, as you didn't even put up a good record.",
        "You are correct. The crowd yells for death to a coward, and you perish only knowing the bitter failure.",
      ],
      stone: "cut for a man who simply stopped",
    },
  ];

  const BY_ID = Object.fromEntries(FATES.map((f) => [f.id, f]));

  // Every fate this career may take, in the order the list declares them.
  // A gate that throws is a gate that says no — a fate with a broken condition
  // must never be able to take the ending screen down with it.
  function offered(c) {
    return FATES.filter((f) => {
      try { return !!f.gate(c); } catch (e) { return false; }
    });
  }

  // What to show in a collection of endings: the ones already reached, plus
  // every fate that was never secret, with the rest left as a blank rung so a
  // player can see there is something there without being told what.
  function catalogue(seen) {
    const got = new Set(seen || []);
    return FATES.map((f) => ({
      fate: f,
      reached: got.has(f.id),
      // A hidden fate nobody has reached shows as an unnamed line.
      veiled: !!f.hidden && !got.has(f.id),
    }));
  }

  Object.assign(C, {
    EXITUS: { FATES, BY_ID, offered, catalogue, isStub, W },
  });
})();
