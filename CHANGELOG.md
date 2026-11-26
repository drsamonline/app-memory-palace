# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Dates: dd/mm/yyyy.

## [Unreleased]

## [1.0.0] — 26/11/2026

### Added
- **Eleven spots** in one room, placed in order — the order is the walk.
- A **ten-per-room cap**: an eleventh item is refused, and the refusal **names what it would have displaced**.
- A **recall test** in walk order, where every miss is shown **back in its own room** rather than only being marked wrong.
- Remove and renumber, so the walk stays a walk.
- Export and reload; the palace survives with its order intact.
- Refusals: no item name, a spot that is not in the room, the same thing twice, removing something that is not there, testing an empty palace.
- An unreadable palace is reported and offered for export, **never** replaced with an empty one — an empty palace looks like a palace you never built.
- A failed save says **NOT SAVED** and leaves the palace unchanged.
- PWA shell, CI (50 engine assertions + 17 in jsdom + page smoke), and the app-builder pipeline pinned to
  the canonical SHA for the EXE/APK/Linux release.

### Not built
- Multiple rooms, images, and any spaced-repetition schedule. The last is deliberate: the palace is the method and the score is not the point.
