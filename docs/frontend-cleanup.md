# Frontend cleanup plan and results

Baseline: `103960f` (2026-11-08). Preserve the current Catppuccin/Win98 design,
page routes, public IDs, event bindings, and classic-script execution model.

## Approach

Use small, reviewable refactors with evidence of equivalent behavior. CSS source
order and specificity matter; do not broadly merge selectors, introduce cascade
layers, remove dynamic selectors based on static usage scans, or strip `!important`.
Keep critical first-paint initialization inline. Extract shared pure functions
before splitting stateful page controllers. Avoid a framework/build-system migration
and repository-wide reformatting in a maintenance change.

References consulted:
- MDN cascade: https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascade/Introduction
- MDN specificity: https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascade/Specificity
- ESLint setup: https://eslint.org/docs/latest/use/getting-started
- Playwright visual comparisons: https://playwright.dev/docs/test-snapshots

## Implementation

1. Run existing tests and retain a separate baseline checkout.
2. Remove six earlier CSS declarations superseded by the same selector/property/
   importance later in the same top-level stylesheet. Preserve final positions,
   responsive rules, custom scrollbars, and all palette values.
3. Share parent-path, leaf-name, and folder-segment validation helpers across the
   Archive, Database, and Editor scripts. Load the helper before its consumers.
4. Extract build-state storage, service-worker registration, and visual viewport
   setup from `global.html` into `app-runtime.js`. Keep the head bootstrap and
   loading CSS inline. Registration still precedes deferred page initialization;
   the existing renderer fingerprints the new scripts and the service worker
   discovers their URLs from rendered pages for precaching.
5. Add `bun run check` for JavaScript syntax, template asset references, helper
   order, and unit tests. Review the diff before publishing a review branch.

## Validation results

- Baseline: 2 tests / 7 assertions passed.
- Updated: 4 tests / 28 assertions passed, including nested and Unicode paths,
  empty paths, traversal names, separators, and control characters.
- All browser JavaScript parses; local JS/CSS template references resolve.
- All six pages render through the actual Bun renderer with resolved placeholders
  and valid local JS/CSS paths; new scripts receive content fingerprints.
- Extracted runtime IIFEs match the original inline code exactly apart from indent.
- `git diff --check` passes.
- Browser screenshots and interaction tests were attempted but could not run:
  Chromium's process-singleton socket was denied by the execution environment.
  No visual-equivalence claim is made.

## Remaining browser release checks

Compare baseline/current in the same browser at desktop and mobile widths. Check
Home, Exit, 404, Editor, Archive, and Database, including populated posts/folders.
Exercise folder dialogs/cancel, Markdown preview, sorting/filtering, post menus,
modal close, mobile keyboard viewport adjustment, and navigation. Verify cold/warm
service-worker loads and offline assets. Use a disposable database for CRUD checks.

Broader stylesheet consolidation and controller splitting should follow only when
these browser checks are available. ESLint can then be introduced with explicit
browser/service-worker globals and a reviewed baseline, without blanket autofixes.
