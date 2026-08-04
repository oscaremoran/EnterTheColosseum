// What the arena remembers
//
// Every piece of the game that survives a reload: the forms you have put down,
// the levels you have cleared and how fast, your standing on both ladder boards,
// your purse, the codes you have bought and redeemed, and the levels you built
// yourself. All of it goes through localStorage under one prefix, and all of it
// is written defensively — a save this file cannot parse is a save it rebuilds
// from scratch rather than one that costs you your Library.
//
// Loaded as a plain script before the engine, so index.html still opens by
// double-clicking it — ES modules are blocked over file://.
//
// Like audio.js and unlike the content files, this one holds state; unlike
// audio.js, the state is not its own — it is yours, and it lives on the disk.
// Nothing here reads the canvas, the DOM, or any variable belonging to a fight
// in progress. It needs exactly two things from the engine, and both are pushed
// in rather than reached for:
//
//   setContract(key)  — which contract you are fighting under, because Sine
//                       Missione keeps a separate ladder board from the
//                       sanctioned one and must never write to the other.
//   loadMine/saveMine — the levels you built are passed by value in and out,
//                       so the engine keeps ownership of its own array.
(() => {
  "use strict";
  const C = (window.COLOSSEUM = window.COLOSSEUM || {});
  const { LADDER, LADDER_BY_ID, UNRANKED, BATTLES, CAMPAIGNS, PATTERN_BY_KEY } = C;

  // ---- Storage keys ----
  // Everything that survives a reload, under one prefix.
  const CLEARED_KEY = "dodger_levels_cleared";
  // Forms you've beaten inside a boss run — that's what unlocks the single battle.
  const FORMS_KEY = "dodger_forms_beaten";
  // Vault codes you've already redeemed.
  const CODES_KEY = "dodger_codes";
  // Purse and the codes you've bought out of the Horreum but may not have typed in yet.
  const DEN_KEY = "dodger_denarii";
  const BOUGHT_KEY = "dodger_purchased";
  // Levels you build yourself, kept next to the built-in ones.
  const MINE_KEY = "dodger_my_levels";
  const TIMES_KEY = "dodger_level_times";

  // Which contract is being fought under. The engine pushes this in whenever it
  // changes; only the ladder cares, but it cares a great deal — see onSine().
  let contract = "normal";
  // The Ludus is the training school: wooden swords, so nothing that happens
  // there is written down. Every recording function below opens by asking this.
  // Derived rather than pushed in, because "practice" was never independent of
  // the contract — it is simply the name of the one contract with no blood in it.
  function onLudus() { return contract === "ludus"; }

  // ---- Library ----
  function readJSON(key, fallback) {
    try {
      const v = JSON.parse(localStorage.getItem(key) || "null");
      return v == null ? fallback : v;
    } catch (e) {
      return fallback;      // corrupt storage shouldn't cost you the Library
    }
  }
  // Handed back as a fresh array rather than assigned into one the engine holds
  // — a level that no longer names a real pattern is dropped on the way out, so
  // a save written against an older roster can't put a broken level on the shelf.
  function loadMine() {
    const raw = readJSON(MINE_KEY, []);
    return Array.isArray(raw) ? raw.filter(validLevel) : [];
  }
  function validLevel(l) {
    return l && typeof l.name === "string" && Array.isArray(l.stages) && l.stages.length > 0
      && l.stages.every((s) => PATTERN_BY_KEY[s.key]);
  }
  function saveMine(levels) { localStorage.setItem(MINE_KEY, JSON.stringify(levels)); }

  // Best clear time per level — no score, just how fast you did it.
  function bestTimes() { return readJSON(TIMES_KEY, {}) || {}; }
  function recordTime(id, secs) {
    if (onLudus()) return null;
    const times = bestTimes();
    const prev = times[id];
    if (prev == null || secs < prev) {
      times[id] = Number(secs.toFixed(1));
      localStorage.setItem(TIMES_KEY, JSON.stringify(times));
      return { best: true, prev };
    }
    return { best: false, prev };
  }

  function loadCleared() {
    try {
      const raw = JSON.parse(localStorage.getItem(CLEARED_KEY) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch (e) {
      return [];   // corrupt storage shouldn't cost you the Library
    }
  }
  function markCleared(id) {
    if (onLudus()) return;
    const done = loadCleared();
    if (done.includes(id)) return;
    done.push(id);
    localStorage.setItem(CLEARED_KEY, JSON.stringify(done));
  }

  // ---- Which forms you've earned the right to fight on their own ----
  // A form stays locked until you've put it down inside its boss's run. Practice
  // runs don't count, same as everywhere else.
  function loadForms() {
    try {
      const raw = JSON.parse(localStorage.getItem(FORMS_KEY) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch (e) {
      return [];
    }
  }
  function markFormBeaten(campKey, idx) {
    if (onLudus()) return;
    const s = CAMPAIGNS[campKey] && CAMPAIGNS[campKey].stages[idx];
    if (!s) return;
    const id = "battle:" + campKey + ":" + s.key + ":" + idx;
    const done = loadForms();
    if (done.includes(id)) return;
    done.push(id);
    localStorage.setItem(FORMS_KEY, JSON.stringify(done));
  }
  // Battles are a chain, not a reward for the boss run. The first form of each
  // boss is always open, and every one after it opens when you put the previous
  // one down — so the intended way in is to learn the forms one at a time and
  // only then fight the run end to end.
  function formUnlocked(b) {
    if (b.stageIdx === 0) return true;
    const prev = BATTLES.find((x) => x.campaign === b.campaign && x.stageIdx === b.stageIdx - 1);
    return !prev || loadForms().includes(prev.id);
  }
  // Have you actually beaten this one, as opposed to merely being allowed to try?
  function formBeaten(b) { return loadForms().includes(b.id); }
  function markFormId(id) {
    if (onLudus()) return;
    const done = loadForms();
    if (done.includes(id)) return;
    done.push(id);
    localStorage.setItem(FORMS_KEY, JSON.stringify(done));
  }
  // How far along a boss's chain of forms you are.
  function formsKnown(campKey) {
    return BATTLES.filter((b) => b.campaign === campKey && formBeaten(b)).length;
  }
  // ---- Ladder standing ----
  // Where everyone is on the board, and where you are. Stored as { rank, board },
  // where board maps a fighter's id to the rung they currently hold. Anything the
  // save doesn't recognise is rebuilt from LADDER, so editing the roster later
  // can't corrupt an existing standing.
  // Sine Missione keeps its own board. Two separate careers: the sanctioned one,
  // and the one where every bout is to the death. The Ludus settles nothing, so it
  // just looks at the sanctioned board without ever writing to it.
  const LADDER_KEY = "dodger_ladder";
  const LADDER_SINE_KEY = "dodger_ladder_sine";
  const RECORD_KEY = "dodger_record";
  const RUDIS_KEY = "dodger_rudis";
  const RUDIS_SINE_KEY = "dodger_rudis_sine";
  // Which board the contract you're on plays for.
  function onSine() { return contract === "sine"; }
  function ladderKey() { return onSine() ? LADDER_SINE_KEY : LADDER_KEY; }
  function rudisKey() { return onSine() ? RUDIS_SINE_KEY : RUDIS_KEY; }
  // How many straight losses to the same fighter costs you an extra rung.
  const TILT = 3;

  // The board has one more rung than it has fighters, and you are always standing
  // on one of them. That's what makes every result a clean swap: win and you trade
  // rungs with the man above, lose and you trade with the man below.
  function defaultBoard() {
    // Index 0 is the bottom of the roster, so it holds the highest rank number.
    const board = {};
    LADDER.forEach((f, i) => { board[f.id] = LADDER.length - i; });
    return board;   // fighters fill 1..LADDER.length; you start on UNRANKED
  }
  function loadLadder() {
    const raw = readJSON(ladderKey(), null);
    let board = defaultBoard();
    let rank = UNRANKED;
    // Who you've been losing to, and how many times running.
    let tiltId = null, tilt = 0;
    // Who you've beaten ON THIS BOARD. Kept per-board rather than on your career
    // record: the two ladders are separate climbs, so beating Cerinthus under the
    // sanctioned contract must not cross him off the Sine Missione board, or give
    // away how he fights there.
    let felled = [];
    // A man above you who has asked for a friendly. Held on the board rather than
    // in memory so the invitation is still there when you come back, and so it
    // cannot be re-rolled by closing and reopening the ladder until a name you
    // like comes up.
    let invite = null;
    if (raw && typeof raw === "object") {
      if (typeof raw.invite === "string" && LADDER_BY_ID[raw.invite]) invite = raw.invite;
      if (Number.isInteger(raw.rank) && raw.rank >= 1 && raw.rank <= UNRANKED) rank = raw.rank;
      if (typeof raw.tiltId === "string" && LADDER_BY_ID[raw.tiltId]) {
        tiltId = raw.tiltId;
        tilt = Number.isInteger(raw.tilt) && raw.tilt > 0 ? Math.min(raw.tilt, 99) : 0;
      }
      if (Array.isArray(raw.felled)) {
        felled = raw.felled.filter((id, i, a) => LADDER_BY_ID[id] && a.indexOf(id) === i);
      }
      if (raw.board && typeof raw.board === "object") {
        // Trust only the rungs that are still valid, unclaimed, and not the one
        // you're standing on; then repair whatever's left. Editing the roster
        // later can shuffle people around but can never corrupt the board.
        const next = {};
        const taken = { [rank]: true };
        for (const f of LADDER) {
          const r = raw.board[f.id];
          if (Number.isInteger(r) && r >= 1 && r <= UNRANKED && !taken[r]) {
            next[f.id] = r;
            taken[r] = true;
          } else {
            next[f.id] = null;
          }
        }
        const free = [];
        for (let r = 1; r <= UNRANKED; r++) if (!taken[r]) free.push(r);
        for (const f of LADDER) if (next[f.id] == null) next[f.id] = free.shift();
        board = next;
      }
    }
    if (invite && (board[invite] == null || board[invite] >= rank)) invite = null;
    return { rank, board, tiltId, tilt, felled, invite };
  }
  function saveLadder(st) {
    localStorage.setItem(ladderKey(), JSON.stringify({
      rank: st.rank, board: st.board, tiltId: st.tiltId, tilt: st.tilt, felled: st.felled,
      invite: st.invite || null,
    }));
  }
  // Sine Missione has no memory. Lose once and the whole climb is gone — which is
  // what "without reprieve" means when it's applied to a career and not a bout.
  function wipeSineLadder() {
    localStorage.removeItem(LADDER_SINE_KEY);
    localStorage.removeItem(RUDIS_SINE_KEY);
  }
  // Move the player down `steps` rungs, one swap at a time so the board stays
  // whole. Returns the fighters who stepped over you, in order.
  function dropPlayer(st, steps) {
    const passed = [];
    for (let i = 0; i < steps && st.rank < UNRANKED; i++) {
      const below = fighterAt(st.rank + 1, st);
      if (!below) break;
      st.board[below.id] = st.rank;
      st.rank++;
      passed.push(below);
    }
    return passed;
  }
  // Your own fight record, the numbers that end up cut into your stone.
  function loadRecord() {
    const r = readJSON(RECORD_KEY, null);
    return {
      pugn: (r && r.pugn) | 0,     // fights taken
      vic: (r && r.vic) | 0,       // fights won
      miss: (r && r.miss) | 0,     // times you were beaten and walked off anyway
      felled: (r && Array.isArray(r.felled)) ? r.felled : [],
    };
  }
  function saveRecord(r) { localStorage.setItem(RECORD_KEY, JSON.stringify(r)); }
  function hasRudis() { return localStorage.getItem(rudisKey()) === "yes"; }
  // The wooden sword, granted once and never taken back — and granted per board,
  // so a discharge earned under the sanctioned contract leaves you still owned on
  // the Sine Missione one. There is no matching revoke: only wipeProgress clears it.
  function grantRudis() { localStorage.setItem(rudisKey(), "yes"); }

  // The fighter standing on a given rung.
  function fighterAt(rank, st) {
    return LADDER.find((f) => st.board[f.id] === rank) || null;
  }
  // The only fighter you may call out for your rung: the one directly above you.
  function challengeable(st) {
    return st.rank <= 1 ? null : fighterAt(st.rank - 1, st);
  }

  // ---- Prolusio: the friendly ----
  // Before the killing began, the crowd was warmed up with a prolusio — the same
  // men, fighting properly, with nothing on it. It is the one bout on the ladder
  // that cannot cost you anything, which is exactly why it cannot earn you a rung
  // either: you may call out anybody standing below you, as often as you like,
  // and the board will not move an inch for it. What it is good for is finding
  // out how a man fights before the day it matters.
  function friendlyable(st, f) {
    const r = st.board[f.id];
    return r != null && r > st.rank;
  }

  // ...and now and then somebody above you asks for one. A man on a higher rung
  // has nothing to gain from you and knows it, so he is doing you a favour — and
  // showing off to a crowd who came early. Rolled once per real bout, never while
  // one is already standing, and only from the rungs near enough above you to
  // have heard your name.
  function rollInvite(st) {
    if (st.invite || st.rank <= 1) return st;
    if (Math.random() > 0.34) return st;
    const near = [];
    for (let r = Math.max(1, st.rank - 6); r < st.rank; r++) {
      const f = fighterAt(r, st);
      if (f) near.push(f);
    }
    if (!near.length) return st;
    st.invite = near[Math.floor(Math.random() * near.length)].id;
    return st;
  }

  // A pattern key is "known" once you've beaten that form in its boss's run —
  // every key belongs to exactly one form, so the id's key segment is enough.
  function keyBeaten(key) {
    return loadForms().some((id) => id.split(":")[2] === key);
  }
  // A built-in level opens only when every form it chains is known.
  function levelUnlocked(lv) {
    return lv.stages.every((s) => keyBeaten(s.key));
  }
  // The builder is earned: clear Vulcan's run end to end (or buy your way in
  // with a vault code).
  function campaignCleared(key) {
    const done = loadForms();
    return CAMPAIGNS[key].stages.every((s, i) =>
      done.includes("battle:" + key + ":" + s.key + ":" + i));
  }
  function editorUnlocked() {
    return campaignCleared("inferno");
  }

  // ---- Vault ----
  // Codes you type in the Vault tab. Each prize applies once and is remembered.
  function claimedCodes() {
    try {
      const raw = JSON.parse(localStorage.getItem(CODES_KEY) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch (e) {
      return [];
    }
  }
  function unlockAllForms() {
    localStorage.setItem(FORMS_KEY, JSON.stringify(BATTLES.map((b) => b.id)));
  }
  const CODES = {
    // A dev key, not something the Horreum sells.
    "1234": {
      name: "Keys to the Colosseum",
      desc: "Every fight in the game, unsealed.",
      apply: unlockAllForms,
    },
  };
  const SHOP = [];   // nothing on the shelf yet

  // ---- Denarii ----
  // Won on the sand, spent in the Horreum. Practice pays nothing.
  function denarii() {
    return Math.max(0, Number(localStorage.getItem(DEN_KEY)) || 0);
  }
  function addDenarii(n) {
    localStorage.setItem(DEN_KEY, String(denarii() + n));
  }
  // Money leaving the purse — a stake laid, a bribe paid, a card bought. Floors
  // at nothing, because there is no credit in this arena: whatever the caller
  // thinks it is spending, the purse never goes below empty.
  function spendDenarii(n) {
    localStorage.setItem(DEN_KEY, String(Math.max(0, denarii() - n)));
  }
  function boughtCodes() {
    try {
      const raw = JSON.parse(localStorage.getItem(BOUGHT_KEY) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch (e) {
      return [];
    }
  }
  // Buying doesn't hand you the prize — it hands you the code. You still type it in.
  function buy(code) {
    const prize = CODES[code];
    if (!prize) return { ok: false, msg: "The shelf is empty." };
    if (boughtCodes().includes(code)) return { ok: false, msg: "Already bought." };
    if (denarii() < prize.price) {
      return { ok: false, msg: `${prize.price - denarii()} more denarii needed.` };
    }
    localStorage.setItem(DEN_KEY, String(denarii() - prize.price));
    const bought = boughtCodes();
    bought.push(code);
    localStorage.setItem(BOUGHT_KEY, JSON.stringify(bought));
    return { ok: true, msg: `Bought ${prize.name}. Your code is ${code} — redeem it in the Vault.` };
  }
  function redeem(raw) {
    const code = String(raw || "").trim().toUpperCase();
    if (!code) return { ok: false, msg: "Type a code first." };
    const prize = CODES[code];
    if (!prize) return { ok: false, msg: "The vault doesn't know that one." };
    const claimed = claimedCodes();
    if (claimed.includes(code)) return { ok: false, msg: `Already claimed: ${prize.name}.` };
    prize.apply();
    claimed.push(code);
    localStorage.setItem(CODES_KEY, JSON.stringify(claimed));
    return { ok: true, msg: `${prize.name} — ${prize.desc}` };
  }
  // Everything you've earned, gone. Levels you built are yours and survive.
  function wipeProgress() {
    [CLEARED_KEY, TIMES_KEY, FORMS_KEY, CODES_KEY, DEN_KEY, BOUGHT_KEY,
     LADDER_KEY, LADDER_SINE_KEY, RECORD_KEY, RUDIS_KEY, RUDIS_SINE_KEY]
      .forEach((k) => localStorage.removeItem(k));
  }

  // ---- What the engine may ask for ----
  // The whole of the game's memory, and nothing else. Exported flat so the call
  // sites read as they always did: denarii(), markCleared(id), loadLadder().
  const PROGRESS = {
    // The one thing pushed in rather than read out.
    setContract(key) { contract = key; },

    // Levels you built. Passed by value both ways — the engine owns the array.
    loadMine, saveMine, validLevel,

    // Clears, times, forms.
    bestTimes, recordTime, loadCleared, markCleared,
    loadForms, markFormBeaten, markFormId, formUnlocked, formBeaten, formsKnown,

    // Ladder standing, on whichever board the contract plays for. onSine and
    // TILT go out too: the Ladder tab has to say which board you are looking at
    // and how close to the drop you are, and both are this file's rules to state.
    loadLadder, saveLadder, wipeSineLadder, dropPlayer,
    loadRecord, saveRecord, hasRudis, grantRudis,
    fighterAt, challengeable, friendlyable, rollInvite,
    onSine, TILT,

    // What is open to you.
    keyBeaten, levelUnlocked, campaignCleared, editorUnlocked,

    // Purse, shelf and vault.
    denarii, addDenarii, spendDenarii, boughtCodes, buy, redeem, claimedCodes, CODES, SHOP,

    wipeProgress,
  };

  Object.assign(C, { PROGRESS });
})();
