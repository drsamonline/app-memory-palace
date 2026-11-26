# Memory Palace

Walk a room to remember. Place things at spots, then recall them in the same order — and a miss is shown
back **where it belonged**.

- **Demo:** https://drsamonline.github.io/app-memory-palace/play/index.html
- **Landing page:** https://drsamonline.github.io/app-memory-palace/
- **Release:** https://github.com/drsamonline/app-memory-palace/releases/tag/app-latest
- **Plan row:** #30 of 37 in `drsamonline/forge` → `QUEUE/PLAN.json`
- **Specs absorbed:** `app-memory-palace` (lead)
- **Licence:** PolyForm Noncommercial 1.0.0

## Status

| | |
|---|---|
| **Built** | Eleven spots; placing in order; a ten-per-room cap that refuses an eleventh and names what it would displace; a recall test that shows each miss in its room; remove and renumber; export and reload. |
| **Release** | Windows EXE, Android APK and Linux binary, built from this source by `app-builder` in CI. |
| **Not built** | Multiple rooms, images, and **any spaced-repetition schedule** — the last is deliberate. |
| **Untested** | Whether a palace built here transfers to a room you actually walk. The mechanics are exact; the mnemonic effect is not testable in a suite. |

## The spec's "done means", counted

| The spec says | The test |
|---|---|
| ten items are recalled in the order placed | 10 placed, walk order identical, `correct === 10` |
| a wrong answer is shown back in its own room | one wrong → `missed[0].says` reads *"At the table you should have had 'apple'."* |
| an eleventh in a room holding ten is refused or names what it displaced | refused, `full: true`, `wouldDisplace.thing === "keys"`, and no palace returned |
| the palace survives a reload | `serialize` → `parseState`, same ten in the same order, same recall |

## Why the cap refuses instead of replacing

A memory palace that silently drops a thing is worse than one that says the room is full: you would walk the
room, find the wrong object, and blame your memory rather than the app. The refusal names the item it would
have displaced, so the decision stays with the person.

## What it will not do

- **Become a flashcard app** — no interval, ease factor or due list.
- **Score you** — a test reports right and wrong in order; there is no grade.
- **Silently drop an item** when a room is full.
- **Start an empty palace over a broken one.**
- **Use the internet.**

## When things go wrong

| Case | Behaviour |
|---|---|
| **Bad input** | No item name, an unknown spot, the same thing twice, removing what is not there — each refused with the field named. |
| **No network** | Nothing changes. |
| **Storage full or unavailable** | **NOT SAVED**, palace unchanged. |
| **Corrupt saved state** | Reported and offered for export, never replaced with an empty one. |

## Tests

```bash
npm test                      # all three suites
node tests/self-tests.js      # engine — 50 assertions
node tests/ui-tests.js        # the page in jsdom — 17 assertions
node tests/page-smoke.js      # every local src/href resolves, nothing off-origin
```

Mutation-tested six ways on 26/11/2026, all red: an eleventh silently dropped (crash), a wrong answer only
marked wrong (2 failures), recall ignoring the order (2), the room cap ignored (crash), a broken palace
starting empty (6), and a spaced-repetition schedule appearing (3).

## Two test mistakes, both mine again

1. `eq("the miss names the room", /regex/.test(x), detail)` — an `eq` with a boolean and a string; it should
   have been `ok`. The same `ok`/`eq` mix-up that has appeared in several rows now.
2. A regex on the page source failed because the sentence **wraps across lines** in the HTML. It matches on
   `\s+` now — and that is worth remembering: static checks on rendered text need to survive line breaks.

## Layout

```
docs/index.html             landing page
docs/play/index.html        the app — place, the walk, the test, the misses
docs/play/app.js            DOM wiring: place, remove, answer boxes, check, export
docs/play/palace-core.js    the engine — spots, cap, walk, recall test, storage
docs/play/web-kit.js        vendored kit (unmodified)
docs/play/export-kit.js     vendored kit (unmodified)
tests/self-tests.js         engine suite (50)
tests/ui-tests.js           page suite (17, jsdom)
tests/page-smoke.js         shape on disk
PAGES.json                  landing = docs/index.html, app = docs/play/index.html
```

## Where the spec was silent, and what was chosen

- **Ten per room, eleven spots.** The classic advice is about ten per room; the extra spot is what makes the refusal testable and visible.
- **The order is stored, not inferred** — an explicit `order` field survives a remove-and-renumber, which a sort by insertion time would not.
- **The test compares in walk order**, so a right item in the wrong place is still a miss — which is what the method is actually about.
- **A duplicate item is refused**: one thing, one spot. Two "keys" in a palace is a palace with a bug in it.
- **No schedule anywhere.** The spec's must-not is the design.

## What is not built, and why

**Multiple rooms, images and spaced repetition.** The first two are scope; the third is forbidden, and
adding it would turn the palace into the flashcard app the spec explicitly rules out.
