#!/usr/bin/env node
/* self-tests — Memory Palace. SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0 · (c) 2026 Dr Sohil Momin
 * Done-means: ten items in a room are recalled in the order placed; a wrong answer is shown back in its own
 * room; an eleventh in a room holding ten is refused or names what it displaced; the palace survives a
 * reload. */
"use strict";
var fs = require("fs"), path = require("path");
var ROOT = path.join(__dirname, "..");
var P = require(path.join(ROOT, "docs", "play", "palace-core.js"));
var passed = 0, failed = [], group = "";
function section(n) { group = n; }
function ok(n, c, d) { if (c) { passed++; return; } failed.push(group + " :: " + n + (d ? " — " + d : "")); }
function eq(n, a, b) { ok(n, a === b, "expected " + JSON.stringify(b) + ", got " + JSON.stringify(a)); }
function read(f) { return fs.readFileSync(path.join(ROOT, f), "utf8"); }
function strip(s) { return s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\*.*$/gm, ""); }

var TEN = ["keys", "letter", "apple", "book", "cup", "scarf", "pen", "coin", "photo", "stone"];
function fullRoom() {
  var p = P.emptyPalace();
  TEN.forEach(function (t) { p = P.place(p, { thing: t, spot: "table" }).palace; });
  return p;
}

section("done means — ten items are recalled in the order they were placed");
var pal = fullRoom();
eq("ten are placed", pal.items.length, 10);
eq("the walk is the order", P.walk(pal).map(function (i) { return i.thing; }).join(","), TEN.join(","));
var good = P.test(pal, TEN);
eq("all ten come back in order", good.correct, 10);
eq("out of ten", good.total, 10);
ok("and the app says the walk held", /The walk held/.test(good.says), good.says);

section("done means — a wrong answer is shown back in its own room");
var answers = TEN.slice();
answers[2] = "orange";
var bad = P.test(pal, answers);
eq("nine are right", bad.correct, 9);
eq("one is missed", bad.missed.length, 1);
ok("the miss names the room", /At the table/.test(bad.missed[0].says), bad.missed[0].says);
ok("and the thing that should have been there", /apple/.test(bad.missed[0].says), bad.missed[0].says);
eq("it carries the spot too", bad.missed[0].spot, "table");
eq("an empty answer counts as missed", P.test(pal, ["keys"]).missed.length, 9);
ok("the app points at the rooms", /shown in their own rooms/.test(P.test(pal, answers).says), P.test(pal, answers).says);

section("done means — an eleventh in a room holding ten is refused and names the displaced item");
var eleven = P.place(pal, { thing: "eleventh", spot: "table" });
eq("it is refused", eleven.ok, false);
eq("it is marked full", eleven.full, true);
eq("it names what it would have displaced", eleven.wouldDisplace.thing, "keys");
ok("and says so in words", /would displace \u201ckeys\u201d/.test(eleven.reason), eleven.reason);
eq("nothing was dropped", pal.items.length, 10);
eq("and no palace is returned to save", eleven.palace, undefined);
eq("the cap is ten", P.ROOM_CAP, 10);
var otherRoom = P.place(pal, { thing: "eleventh", spot: "door" });
eq("another room still takes it", otherRoom.ok, true);

section("done means — the palace survives a reload");
var back = P.parseState(P.serialize(pal));
eq("it parses", back.ok, true);
eq("with all ten", back.palace.items.length, 10);
eq("in the same order", P.walk(back.palace).map(function (i) { return i.thing; }).join(","), TEN.join(","));
eq("and recalls the same", P.test(back.palace, TEN).correct, 10);
ok("no network code anywhere", !/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/.test(read("docs/play/palace-core.js") + read("docs/play/app.js")));
ok("the page forbids connections", /connect-src 'none'/.test(read("docs/play/index.html")));

section("must-not — it must not become a flashcard app with a spaced-repetition score");
var core = strip(read("docs/play/palace-core.js"));
ok("no interval, ease or due schedule", !/\b(interval|ease|easeFactor|dueAt|nextReview|srs)\s*[:=]/i.test(core));
ok("no score, grade or streak field", !/\b(score|grade|streak|points)\s*[:=]/i.test(core));
ok("the test reports right and wrong, not a rating", !/rating/i.test(core));
/* the sentence wraps across lines in the HTML, so match on whitespace rather than a space */
ok("the page says the palace is the method",
  /the palace is the\s+method and the score is not the point/.test(read("docs/play/index.html")));

section("bad input");
eq("an item with no name is refused", P.place(P.emptyPalace(), { spot: "table" }).field, "thing");
eq("a spot that is not in the room is refused", P.place(P.emptyPalace(), { thing: "x", spot: "moon" }).field, "spot");
eq("the same thing twice is refused", P.place(fullRoom(), { thing: "KEYS", spot: "door" }).field, "thing");
eq("removing something that is not there is refused", P.remove(pal, "nope").ok, false);
eq("an empty palace cannot be tested", P.test(P.emptyPalace(), []).ok, false);
var removed = P.remove(pal, pal.items[0].id);
eq("removing renumbers the walk", P.walk(removed.palace)[0].order, 1);
eq("and the first is now the second thing", P.walk(removed.palace)[0].thing, "letter");

section("storage");
var broken = P.parseState("{ broken palace");
eq("a broken palace is reported", broken.ok, false);
eq("it is marked unreadable", broken.unreadable, true);
ok("it was not replaced with an empty one", /NOT replaced with an empty one/.test(broken.reason), broken.reason);
ok("and says why an empty palace is worse", /never built/.test(broken.reason), broken.reason);
eq("an empty palace on a fresh device is distinguished", P.parseState("").empty, true);
var thrown = P.exportFile("palace", { palace: pal }, { when: "26/11/2026" }, function () { var e = new Error("q"); e.name = "QuotaExceededError"; throw e; });
eq("a failed write is reported", thrown.ok, false);

section("shape — every script the page loads exists beside it");
var page = read("docs/play/index.html");
var srcs = (page.match(/<script[^>]+src="([^"]+)"/g) || []).map(function (t) { return t.replace(/.*src="([^"]+)"/, "$1"); });
srcs.forEach(function (x) { ok("script src resolves: " + x, fs.existsSync(path.join(ROOT, "docs", "play", x.replace(/^\.\//, "")))); });
ok("the landing page exists", fs.existsSync(path.join(ROOT, "docs", "index.html")));
ok("the page manifest exists", fs.existsSync(path.join(ROOT, "PAGES.json")));
ok("the web manifest exists", fs.existsSync(path.join(ROOT, "docs", "play", "manifest.webmanifest")));

var total = passed + failed.length;
if (!total) { console.error("self-tests: 0 assertions ran."); process.exit(1); }
if (failed.length) { console.error("self-tests: " + passed + "/" + total + " passed, " + failed.length + " FAILED"); failed.slice(0, 12).forEach(function (f) { console.error("  FAIL " + f); }); process.exit(1); }
console.log("self-tests: " + passed + "/" + total + " assertions passed");
