#!/usr/bin/env node
/* ui-tests — the Memory Palace page in a real DOM (jsdom). SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0 · (c) 2026 Dr Sohil Momin */
"use strict";
var fs = require("fs"), path = require("path"), { JSDOM } = require("jsdom");
var ROOT = path.join(__dirname, ".."), PLAY = path.join(ROOT, "docs", "play");
var passed = 0, failed = [];
function ok(n, c, d) { if (c) { passed++; return; } failed.push(n + (d ? " — " + d : "")); }
function eq(n, a, b) { ok(n, a === b, "expected " + JSON.stringify(b) + ", got " + JSON.stringify(a)); }
function build(seed) {
  var dom = new JSDOM(fs.readFileSync(path.join(PLAY, "index.html"), "utf8"), { url: "https://example.test/play/index.html", runScripts: "outside-only", pretendToBeVisual: true });
  var w = dom.window;
  if (seed) Object.keys(seed).forEach(function (k) { w.localStorage.setItem(k, seed[k]); });
  w.URL.createObjectURL = function () { return "blob:x"; }; w.URL.revokeObjectURL = function () {};
  w.HTMLAnchorElement.prototype.click = function () {};
  ["web-kit.js", "export-kit.js", "palace-core.js", "app.js"].forEach(function (f) { w.eval(fs.readFileSync(path.join(PLAY, f), "utf8")); });
  return dom;
}
var dom = build(null), w = dom.window, d = w.document, $ = function (id) { return d.getElementById(id); };
ok("the engine loaded", !!w.PalaceCore);
eq("eleven spots are offered", d.querySelectorAll("#spot option").length, 11);
eq("the walk starts empty", d.querySelectorAll("#walkList li").length, 1);

function place(thing, spot) {
  $("thing").value = thing;
  $("spot").value = spot;
  $("placeBtn").click();
}
var TEN = ["keys", "letter", "apple", "book", "cup", "scarf", "pen", "coin", "photo", "stone"];
TEN.forEach(function (t) { place(t, "table"); });
eq("ten are on the walk", d.querySelectorAll("#walkList li").length, 10);
ok("in the order placed", /1\. keys/.test($("walkList").textContent), $("walkList").textContent);
eq("ten answer boxes are offered", d.querySelectorAll(".ans").length, 10);

place("eleventh", "table");
ok("an eleventh in a full room is refused", /would displace/.test($("status").textContent), $("status").textContent);
ok("and names what it displaced", /keys/.test($("status").textContent));
eq("nothing was dropped", d.querySelectorAll("#walkList li").length, 10);

var boxes = d.querySelectorAll(".ans");
TEN.forEach(function (t, i) { boxes[i].value = t; });
$("testBtn").click();
ok("the walk is checked", /10 of 10 in order/.test($("testSays").textContent), $("testSays").textContent);

boxes[2].value = "orange";
$("testBtn").click();
ok("one miss is reported", /9 of 10/.test($("testSays").textContent), $("testSays").textContent);
ok("and shown in its own room", /At the table you should have had/.test($("missList").textContent), $("missList").textContent);

$("exportBtn").click();
ok("the palace exports", /Wrote palace-\d{4}-\d\d-\d\d\.json/.test($("ioNote").textContent), $("ioNote").textContent);
var saved = w.localStorage.getItem("palace:state");
var dom2 = build({ "palace:state": saved });
var d2 = dom2.window.document;
eq("the reload keeps all ten", d2.querySelectorAll("#walkList li").length, 10);

var dom3 = build({ "palace:state": "{ broken palace" });
var d3 = dom3.window.document;
ok("a broken palace is reported", /cannot be read/.test(d3.getElementById("status").textContent));
ok("and not replaced with an empty one", /NOT replaced with an empty one/.test(d3.getElementById("status").textContent));

var dom4 = build(null), w4 = dom4.window, d4 = dom4.window.document;
Object.defineProperty(w4, "localStorage", { configurable: true, get: function () {
  return { getItem: function () { return null; }, setItem: function () { var e = new Error("q"); e.name = "QuotaExceededError"; throw e; }, removeItem: function () {}, clear: function () {} }; } });
d4.getElementById("thing").value = "x"; d4.getElementById("placeBtn").click();
ok("a failed save says NOT SAVED", /NOT SAVED:/.test(d4.getElementById("status").textContent), d4.getElementById("status").textContent);

var total = passed + failed.length;
if (!total) { console.error("ui-tests: 0 assertions ran."); process.exit(1); }
if (failed.length) { console.error("ui-tests: " + passed + "/" + total + " passed, " + failed.length + " FAILED"); failed.forEach(function (f) { console.error("  FAIL " + f); }); process.exit(1); }
console.log("ui-tests: " + passed + "/" + total + " assertions passed");
