// What the man across the sand says
//
// Lines picked by what just happened, then narrowed by armatura. Pure text and
// timing — who is allowed to speak, and drawing it, stays in the engine.
//
// Loaded as a plain script before the engine, so index.html still opens by
// double-clicking it — ES modules are blocked over file://. Everything here is
// content: no engine state, nothing that reads the canvas or the DOM.
(() => {
  "use strict";
  const C = (window.COLOSSEUM = window.COLOSSEUM || {});

  // ---- What they say ----
  //
  // A gladiator was not a silent professional. He worked a crowd of fifty thousand
  // who had paid to be there, and the surviving graffiti is full of men being
  // shouted at by name. So the man across the sand talks: at the gate, when he
  // draws blood, when he is losing, and at the end.
  //
  // Lines are picked by what just happened and then narrowed by his armatura,
  // because a retiarius taunting you about his net is worth more than a generic
  // boast. Nobody says anything twice inside their own cooldown, which is what
  // keeps two men in a duel from talking over each other for the whole bout.
  const LINES = {
    open: [
      "Another one. Stand where I can reach you.",
      "The sand drinks either way.",
      "They paid to watch you die. Try to be worth it.",
      "You will not leave through the Gate of Life.",
      "Let us give them something to remember.",
      "I have buried better.",
    ],
    // He has just wounded the other man.
    drew: [
      "First blood. The rest is easier.",
      "There. Now they are watching.",
      "You felt that one.",
      "Bleed where they can see it.",
      "Hold still. It is quicker.",
    ],
    // He has just been wounded.
    took: [
      "A scratch. My mother hits harder.",
      "Good. Now I am awake.",
      "Is that all you were given?",
      "You will pay for that in a moment.",
      "The crowd saw that. They will see the answer.",
    ],
    // Half his health is gone.
    half: [
      "This is not finished.",
      "I have won from worse ground.",
      "Come closer, then. Finish it.",
      "You are slower than you were.",
    ],
    // He is nearly out.
    low: [
      "Not here. Not to you.",
      "I will not raise the finger.",
      "Missum! — no. No. I fight.",
      "Let them see me standing.",
      "Jupiter, one more.",
    ],
    // He has put the other man down.
    kill: [
      "Habet! He has had it.",
      "That is what you paid for.",
      "Take him out through the Gate of Death.",
      "Next.",
      "I told him where to stand.",
    ],
    // His shield has just been beaten aside.
    guard: [
      "My arm — the arm, not the shield —",
      "It held. It held all afternoon.",
      "Fine. Without it, then.",
      "You cannot keep that up.",
    ],
    // A net has landed on him.
    netted: [
      "Get it off me —",
      "Cheap. Fisherman's work.",
      "A net is not a sword.",
    ],
    // Something useful landed on the sand and he took it.
    gift: [
      "The gods are watching after all.",
      "Mine.",
      "This was owed to me.",
    ],
    // The other man got to it first.
    lost_gift: [
      "Take it. It will not save you.",
      "Cheat.",
    ],
    // Someone has paid the editor to make his afternoon harder.
    bribed: [
      "Who paid for this? WHO PAID FOR THIS?",
      "The editor has been bought. Of course he has.",
      "This is not the bout I was booked for!",
      "Coward's money.",
    ],
    // A long stretch where nothing has touched him.
    taunt: [
      "Is this dancing, or fighting?",
      "The crowd is getting bored. So am I.",
      "Throw something. Anything.",
      "They will start throwing cushions soon.",
    ],
  };

  // What each armatura says instead, where the arms he carries give him something
  // better to say than the general pool.
  const ARM_LINES = {
    retiarius: {
      open: ["Net first. Trident after. That is the order."],
      drew: ["The trident goes where the net has already been."],
      netted: ["You threw MY weapon back at me?"],
    },
    secutor: {
      open: ["I am the chaser. There is nowhere on this sand you can stand."],
      taunt: ["Run. I am paid by the hour."],
    },
    murmillo: {
      open: ["Come to the shield. Everyone does, eventually."],
      took: ["Around the shield. Lucky. Try it twice."],
      guard: ["Nobody beats the scutum aside. Nobody."],
    },
    sagittarius: {
      open: ["Every shaft I have is already aimed at you."],
      drew: ["I do not miss. I only wait."],
    },
    andabata: {
      open: ["I cannot see you. I do not need to."],
      took: ["Where — WHERE —"],
      low: ["Blind, and still standing. What is your excuse?"],
    },
    bestiarius: {
      open: ["The beasts know me. They will not know you."],
      bribed: ["More of them? Fine. They are mine either way."],
    },
    dimachaerus: {
      open: ["Two swords. No shield. Nothing to hide behind — for either of us."],
    },
    provocator: {
      open: ["Breastplate. You will be here a while."],
      half: ["Halfway through the bronze. Keep going."],
    },
    thraex: {
      open: ["The sica bends. Your guard does not."],
    },
    eques: {
      open: ["I open the games. You are the opening."],
    },
    hoplomachus: {
      open: ["Spear's length. That is as close as you get."],
    },
    scissor: {
      open: ["This blade is welded to my arm. I cannot drop it even if you ask."],
    },
  };

  // Seconds a line hangs over a man's head. Long, because it is competing with
  // two men, their bullets and a health bar for your attention — a line you have
  // to catch on the first pass may as well not be there.
  const SPEECH_DUR = 4.6;
  const SPEECH_GAP = 5.4;      // ...and how long before he is allowed another

  Object.assign(C, { LINES, ARM_LINES, SPEECH_DUR, SPEECH_GAP });
})();
