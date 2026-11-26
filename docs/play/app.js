/* app — the Memory Palace page. SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0 · (c) 2026 Dr Sohil Momin
 * Wiring only: the spots, the cap and the recall test live in palace-core.js. */
(function () {
  "use strict";
  var P = window.PalaceCore;
  var $ = function (id) { return document.getElementById(id); };
  var K = "palace:state";
  var state = { palace: P.emptyPalace(), unreadable: null };

  var els = {
    status: $("status"), thing: $("thing"), spot: $("spot"), placeBtn: $("placeBtn"), walkList: $("walkList"),
    answerWrap: $("answerWrap"), testBtn: $("testBtn"), testSays: $("testSays"), missList: $("missList"),
    exportBtn: $("exportBtn"), ioNote: $("ioNote")
  };

  function today() { var d = new Date(), p = function (n) { return (n < 10 ? "0" : "") + n; }; return p(d.getDate()) + "/" + p(d.getMonth() + 1) + "/" + d.getFullYear(); }
  function setStatus(k, m) { els.status.className = "status show " + k; els.status.textContent = m; }
  function node(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; }

  function persist() {
    try { window.localStorage.setItem(K, P.serialize(state.palace)); return true; }
    catch (e) { setStatus("bad", "NOT SAVED: " + (e && e.name === "QuotaExceededError" ? "storage is full" : "storage is unavailable") + ". The palace on screen is unchanged."); return false; }
  }

  function render() {
    var w = P.walk(state.palace);
    els.walkList.textContent = "";
    if (!w.length) els.walkList.appendChild(node("li", null, "Nothing placed yet."));
    w.forEach(function (i) {
      var li = node("li");
      var left = node("div", null, i.order + ". " + i.thing);
      left.appendChild(node("span", "meta", "at " + i.spotLabel));
      li.appendChild(left);
      var b = node("button", "small", "Remove");
      b.addEventListener("click", function () {
        var out = P.remove(state.palace, i.id);
        if (!out.ok) { setStatus("bad", out.reason); return; }
        state.palace = out.palace;
        var saved = persist();
        render();
        if (saved) setStatus("ok", out.says);
      });
      li.appendChild(b);
      els.walkList.appendChild(li);
    });

    els.answerWrap.textContent = "";
    w.forEach(function (i) {
      var row = node("div", "bar");
      row.appendChild(node("span", "hint", i.order + "."));
      var inp = document.createElement("input");
      inp.type = "text"; inp.className = "ans"; inp.placeholder = "what was at " + i.spotLabel;
      inp.style.flex = "1";
      row.appendChild(inp);
      els.answerWrap.appendChild(row);
    });
  }

  function place() {
    var out = P.place(state.palace, { thing: els.thing.value, spot: els.spot.value });
    if (!out.ok) { setStatus("bad", out.reason); return; }
    state.palace = out.palace;
    var saved = persist();
    els.thing.value = "";
    render();
    if (saved) setStatus("ok", out.says);
  }

  function check() {
    var answers = Array.prototype.map.call(document.querySelectorAll(".ans"), function (i) { return i.value; });
    var out = P.test(state.palace, answers);
    if (!out.ok) { setStatus("bad", out.reason); return; }
    els.testSays.textContent = out.says;
    els.missList.textContent = "";
    out.missed.forEach(function (m) {
      var li = node("li", "missed");
      li.appendChild(node("div", null, m.says));
      els.missList.appendChild(li);
    });
    setStatus(out.missed.length ? "warn" : "ok", out.says);
  }

  function doExport() {
    var out = P.exportFile("palace", { palace: state.palace }, { when: today() }, function (name, text, mime) {
      if (!window.Export || typeof window.Export.save !== "function") throw new Error("the export kit did not load");
      window.Export.save(name, text, mime); return true;
    });
    if (out.ok) { els.ioNote.textContent = "Wrote " + out.filename + "."; setStatus("ok", "Exported."); }
    else setStatus("bad", out.reason + ".");
  }

  els.placeBtn.addEventListener("click", place);
  els.testBtn.addEventListener("click", check);
  els.exportBtn.addEventListener("click", doExport);

  P.spots().forEach(function (s) {
    var o = document.createElement("option"); o.value = s.id; o.textContent = s.label; els.spot.appendChild(o);
  });

  var raw = null;
  try { raw = window.localStorage.getItem(K); } catch (e) { raw = null; }
  if (raw) {
    var parsed = P.parseState(raw);
    if (parsed.ok) state.palace = parsed.palace;
    else {
      state.unreadable = parsed;
      setStatus("bad", parsed.reason);
      var keep = node("button", "small", "Export the unreadable palace");
      keep.addEventListener("click", function () {
        var out = P.exportFile("raw", parsed, { when: today() }, function (name, text, mime) {
          if (!window.Export || typeof window.Export.save !== "function") throw new Error("the export kit did not load");
          window.Export.save(name, text, mime); return true;
        });
        setStatus(out.ok ? "ok" : "bad", out.ok ? "Wrote " + out.filename + "." : out.reason);
      });
      els.ioNote.parentNode.insertBefore(keep, els.ioNote);
    }
  }

  render();
  if (window.Loom && window.Loom.pwa) window.Loom.pwa.register("sw.js");
})();
