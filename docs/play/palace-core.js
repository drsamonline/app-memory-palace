/* palace-core — the engine behind Memory Palace.
 * SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
 * (c) 2026 Dr Sohil Momin
 *
 * ONE JOB: teach the method of loci by making you walk a room. You place items at fixed spots, in order,
 * and later you recall them by walking the same path.
 *
 * THE PALACE IS THE METHOD AND THE SCORE IS NOT THE POINT. There is no spaced-repetition schedule, no
 * ease factor, no "due today" — a flashcard app with a memory metaphor bolted on is the thing this must
 * not become. A session gives you your walk back, and a wrong answer is shown IN ITS OWN ROOM rather
 * than only being marked wrong.
 *
 * Pure functions: no DOM, no network, no storage.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.PalaceCore = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var VERSION = "1.0.0";
  var ROOM_CAP = 10;   /* the classic advice: about ten spots per room, or the walk gets vague */

  function clean(s) { return String(s == null ? "" : s).replace(/\s+/g, " ").trim(); }

  var ROOMS = [
    { id: "door", label: "the door" },
    { id: "shoe-rack", label: "the shoe rack" },
    { id: "table", label: "the table" },
    { id: "sofa", label: "the sofa" },
    { id: "window", label: "the window" },
    { id: "shelf", label: "the shelf" },
    { id: "lamp", label: "the lamp" },
    { id: "rug", label: "the rug" },
    { id: "chair", label: "the chair" },
    { id: "clock", label: "the clock" },
    { id: "corner", label: "the far corner" }
  ];

  function spots() { return ROOMS.map(function (r) { return { id: r.id, label: r.label }; }); }
  function spotById(id) { return ROOMS.filter(function (r) { return r.id === id; })[0] || null; }

  function emptyPalace() { return { items: [] }; }

  /* Placing: order is the walk. An eleventh item in a room holding ten is REFUSED and names what it would
   * have displaced — it never silently drops one. */
  function place(palace, input) {
    var spot = clean(input && input.spot);
    var thing = clean(input && input.thing);
    if (!thing) return { ok: false, field: "thing", reason: "an item with no name is refused" };
    var room = spotById(spot);
    if (!room) return { ok: false, field: "spot", reason: "\u201c" + spot + "\u201d is not a spot in this room" };
    var p = clone(palace);
    if (p.items.filter(function (i) { return i.spot === spot; }).length >= ROOM_CAP) {
      var first = p.items.filter(function (i) { return i.spot === spot; })[0];
      return {
        ok: false, field: "spot", full: true, wouldDisplace: first,
        reason: room.label + " already holds " + ROOM_CAP + " items. Placing another would displace \u201c" + first.thing + "\u201d, so it is refused rather than dropped."
      };
    }
    if (p.items.some(function (i) { return i.thing.toLowerCase() === thing.toLowerCase(); })) {
      return { ok: false, field: "thing", reason: "\u201c" + thing + "\u201d is already in the palace. One thing, one spot." };
    }
    p.items.push({ id: "i" + (p.items.length + 1), thing: thing, spot: spot, spotLabel: room.label, order: p.items.length + 1 });
    return { ok: true, palace: p, item: p.items[p.items.length - 1], says: thing + " placed at " + room.label + " (" + p.items.length + " in the walk)." };
  }

  function remove(palace, id) {
    var p = clone(palace);
    var before = p.items.length;
    p.items = p.items.filter(function (i) { return i.id !== id; });
    if (p.items.length === before) return { ok: false, reason: "there is no such item in the palace" };
    p.items.forEach(function (i, n) { i.order = n + 1; });
    return { ok: true, palace: p, says: "Removed. The walk is renumbered." };
  }

  /* The walk: the order the items were placed, which is the order to recall them in. */
  function walk(palace) {
    return (palace && palace.items || []).slice().sort(function (a, b) { return a.order - b.order; })
      .map(function (i) { return { id: i.id, order: i.order, spot: i.spot, spotLabel: i.spotLabel, thing: i.thing }; });
  }

  /* A recall test: give the answers in walk order. A wrong answer is shown back IN ITS OWN ROOM. */
  function test(palace, answers) {
    var w = walk(palace);
    if (!w.length) return { ok: false, reason: "there is nothing in the palace to recall yet" };
    var given = (answers || []).map(function (a) { return clean(a).toLowerCase(); });
    var rows = w.map(function (item, i) {
      var said = given[i] == null ? "" : given[i];
      var right = said !== "" && said === item.thing.toLowerCase();
      return {
        order: item.order, spot: item.spot, spotLabel: item.spotLabel,
        expected: item.thing, said: said || "(nothing)", right: right,
        says: right ? item.thing + " at " + item.spotLabel + "." : "At " + item.spotLabel + " you should have had \u201c" + item.thing + "\u201d."
      };
    });
    var correct = rows.filter(function (r) { return r.right; }).length;
    return {
      ok: true, rows: rows, correct: correct, total: rows.length,
      missed: rows.filter(function (r) { return !r.right; }),
      says: correct + " of " + rows.length + " in order." + (correct === rows.length ? " The walk held." : " The missed ones are shown in their own rooms below.")
    };
  }

  function clone(palace) {
    var p = palace || emptyPalace();
    return { items: (p.items || []).map(function (i) { return { id: i.id, thing: i.thing, spot: i.spot, spotLabel: i.spotLabel, order: i.order }; }) };
  }

  function serialize(palace) { return JSON.stringify({ version: VERSION, format: "palace-1", palace: clone(palace) }, null, 2); }
  function parseState(text) {
    var raw = String(text == null ? "" : text);
    if (!raw.trim()) return { ok: false, empty: true, reason: "the palace is empty on this device", raw: raw };
    var data;
    try { data = JSON.parse(raw); }
    catch (e) { return { ok: false, unreadable: true, reason: "The saved palace cannot be read. It was NOT replaced with an empty one \u2014 an empty palace looks like a palace you never built. Export it to keep it.", raw: raw }; }
    if (!data || !data.palace || !Array.isArray(data.palace.items)) return { ok: false, unreadable: true, reason: "The saved file holds no palace. Nothing was started over it; export it to keep it.", raw: raw };
    return { ok: true, palace: clone(data.palace), raw: raw };
  }
  function stamp(when) { var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(when || "")); return m ? m[3] + "-" + m[2] + "-" + m[1] : "undated"; }
  function exportFile(what, payload, meta, writer) {
    meta = meta || {};
    if (typeof writer !== "function") return { ok: false, reason: "the file was not written: no writer is available in this browser" };
    var name, body, mime = "application/json";
    if (what === "palace") { name = "palace-" + stamp(meta.when) + ".json"; body = serialize(payload.palace); }
    else if (what === "raw") { name = "palace-unreadable-" + stamp(meta.when) + ".txt"; body = String(payload.raw || ""); mime = "text/plain;charset=utf-8"; }
    else return { ok: false, reason: "nothing was written: unknown export \u201c" + what + "\u201d" };
    try {
      var wrote = writer(name, body, mime);
      if (wrote === false) return { ok: false, filename: name, reason: "the file was not written: the browser refused the save" };
      return { ok: true, filename: name, bytes: body.length };
    } catch (e) {
      var why = e && e.name === "QuotaExceededError" ? "storage is full" : (e && e.message ? e.message : "storage is unavailable");
      return { ok: false, filename: name, reason: "the file was not written: " + why };
    }
  }

  return { version: VERSION, ROOM_CAP: ROOM_CAP, spots: spots, spotById: spotById, emptyPalace: emptyPalace,
    place: place, remove: remove, walk: walk, test: test,
    serialize: serialize, parseState: parseState, exportFile: exportFile };
});
