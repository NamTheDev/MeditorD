# CSS organization

CSS is split by ownership, not by visual era.

- `global/`: shared tokens, base styles, controls, buttons, dialogs, responsive helpers and the shared beveled shell. Reusable classes use `global-*`.
- `pages/`: each page's base rules and, where needed, its scoped theme overrides. Classes use `editor-*`, `archive-*`, `database-*`, `home-*`, `exit-*`, or `not-found-*`.
- `features/`: fonts and native/custom scrollbar styling, with descriptive feature names or page prefixes.

## Cascade

`global.html` loads shared defaults first. `render.ts` then loads the selected page, optional archive explorer and scrollbar, the shared chrome, and a page's theme overrides. The final chrome scrollbar layer deliberately remains last on workspace pages. Database also loads its native scrollbar feature at the end of its body, matching its original cascade.

The large prior workspace stylesheet was split along component and page boundaries. Existing structural selectors, pseudo-elements, interaction states, responsive breakpoints and Catppuccin Mocha values are preserved.

State classes such as `.active`, `.selected`, and `.dragging` are retained where application behavior depends on them; native `[hidden]` is unaffected. Avoid creating generic `extra.css` or introducing new style-era prefixes.

For any new reusable control, prefer a `global-*` base class alongside a page-specific placement class. Test editor, archive, database and 404 after modifying chrome or scrollbar rules.
