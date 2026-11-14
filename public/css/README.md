# CSS organization

CSS is split by ownership, not by visual era.

- `global/`: shared tokens, base styles, controls, buttons, dialogs, responsive helpers and the shared beveled shell. Reusable classes use `global-*`.
- `pages/`: each page's base rules and, where needed, its scoped theme overrides. Classes use `editor-*`, `archive-*`, `database-*`, `home-*`, `exit-*`, or `not-found-*`.
- `features/`: fonts and one shared native scrollbar stylesheet (`chrome-scrollbars.css`). The editor uses native scrolling instead of a custom mobile scrollbar.

## Cascade

`global.html` loads shared defaults first. `render.ts` then loads the selected page, optional Archive explorer styles, shared chrome, and page theme overrides. `features/chrome-scrollbars.css` is loaded once at the end of every workspace page's head. It retains the Archive posts scrollbar's existing 17px beveled track/thumb and native scrolling behavior without a competing global scrollbar layer. Arrow buttons are hidden on all workspace scrollbars, including Archive Gallery, Explorer, Database, Editor, and dialogs.

The large prior workspace stylesheet was split along component and page boundaries. Existing structural selectors, pseudo-elements, interaction states, responsive breakpoints and Catppuccin Mocha values are preserved.

State classes such as `.active`, `.selected`, and `.dragging` are retained where application behavior depends on them; native `[hidden]` is unaffected. Avoid creating generic `extra.css` or introducing new style-era prefixes.

For any new reusable control, prefer a `global-*` base class alongside a page-specific placement class. Test editor, archive, database and 404 after modifying chrome or scrollbar rules.

## Scrollbar and frame geometry

All Editor, Archive, and Database master frames retain a 20px exterior margin and at least 8px interior clearance (with safe-area allowances). The Archive posts, Explorer tree, Database table, Editor panes and dialogs remain native scrollports inside their respective frames. Responsive Gallery navigation is 30px high on fine-pointer devices and 44px high on coarse-pointer devices, including its link-based Database control.
