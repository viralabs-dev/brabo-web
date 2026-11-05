# design/

Brabo design system: strict fidelity is required in the UI (see `CLAUDE.md`).

- **`tokens.css`**: also consumed by the documentation site
  (`website/src/css/custom.css` imports it; AT-561). Colors (palette + dark/light semantic tokens),
  typography (Space Grotesk/Archivo/IBM Plex Mono, plus the `--fs-*` scale),
  spacing, radius and the shell metrics (`--sidebar-w`, `--header-h`,
  `--tabs-h`). Extracted from the claude.ai/design project ["Brabo Design
  System"](https://claude.ai/design/p/1c960ca8-5e00-4558-8ced-80dfbdf01027?file=Brabo+Design+System.dc.html)
  on 2026-07-23 and reconciled with the versioned handoff on 2026-08-08.
  It is consumed directly by `apps/web/src/index.css`.
  Dark is the primary theme; `[data-theme="light"]` on `<html>` switches to
  the light theme, and what writes that attribute is
  `apps/web/public/theme-boot.js` (ADR 0074, RN-182). Until that file existed
  the light theme was here and **unreachable**: no product path set
  `data-theme`.

  Two groups of names are **aliases**, not renames: `--font-display` points
  to `--font-heading`, `--shadow-modal` to `--shadow-lg`, and
  `--r-md`/`--r-lg`/`--r-pill` to the `--radius-*` tokens that already existed.
  They are the handoff's names; replacing the old ones would be a blind
  synonym rename across dozens of files. Watch out for one step that does
  **not** match: `--r-sm` is 7px and `--radius-sm` is 4px.
- **`COMPONENTS.md`**: catalog of the components (base: buttons, inputs,
  tabs, toasts, modal, dense table, cards; product: AgentCard,
  TokenMeter, EventItem, ApprovalCard, ModelPicker, NotificationBell),
  extracted from the same project (file `Brabo Design System.dc.html` +
  the 5 screen files) on 2026-07-23.
- **`SCREENS.md`**: composition of each screen (shell+dashboard, project
  with tabs, session/chat, approvals, settings), same source.

`COMPONENTS.md`/`SCREENS.md` are the curated translation used as the basis for
the real React/TSX implementation in `apps/web`.

**Semantic tints** (AT-285). Background and border tinted by a state tone are
no longer written with `color-mix()` in the module: the scale is ONE and lives
in `tokens.css`, at the end of each theme block:

| token | what it is | mix |
|---|---|---|
| `--<tom>-soft` | tinted background (badge, active item, alert) | tone at `--tint-soft` (12%) over `transparent` |
| `--<tom>-line` | tinted border | tone at `--tint-line` (40%) over `transparent` |
| `--<tom>-panel` / `--<tom>-panel-border` | opaque notice strip | tone at `--tint-panel` (8%) over `--surface-1`; border at 40% over `--border` |
| `--focus-ring` / `--focus-ring-inset` / `--danger-ring` | focus ring | accent at 22% / 45%; danger at 22% |

`<tom>` is `accent`, `success`, `warning` or `danger` (`violet` has only `-soft`
and `-line`). Mixing with `transparent` is what makes the tint work over ANY
base: it does not carry the hue of the surface underneath, which is what lets
the neutral palette swap backgrounds without reviewing module by module.
DYNAMIC color (`--agent-color`, `--status-color`, ...) stays in `color-mix()`,
but with the percentage as a token: `color-mix(in srgb, var(--agent-color)
var(--tint-soft), transparent)`. `apps/web/src/design-tintas.test.ts` rejects
a mix of a fixed tone with a literal percentage in a module, a referenced tint
that `tokens.css` does not declare, and a `:root` tint that the light theme
does not redeclare. The consolidation rounded neighbors: backgrounds of 10-18%
became 12% and borders of 30-50% became 40%.

**Scale** (AT-288). Font, space and radius come from the steps in `tokens.css`:
no module has a half font step (10.5/11.5/12.5 px; the handoff's 12.5 is
`--fs-mono`), the Session, Shell and rail modules write every size and space
that has a step through the token, and a radius that matches a step goes
through the token in any module. The two radius families COEXIST as a declared
alias: `--r-md`/`--r-lg`/`--r-pill` point to `--radius-md`/`-lg`/`-full`, and
`--r-sm` (7px, icon button) is **not** `--radius-sm` (4px);
`apps/web/src/design-escala.test.ts` pins both facts. Left out, for having no
step, are the 6, 9, 10 and 11px radii and the 14 and 17px fonts.

Every UI implementation must always reference the semantic tokens
(`var(--surface-*)`, `var(--text-*)`, `var(--accent)`, `var(--violet)`
etc.), never the raw palette nor invented color/spacing values.

**Screen patterns** (AT-322, AT-327). What the 09/30 visual audit found in
several forms now has ONE, in `apps/web/src/components/ui/`:

| pattern | component | rule |
|---|---|---|
| segmented control ("which of these") | `SegmentedControl` | labeled group of `Chip`s with `aria-pressed`, one on at a time: list filter OR panel switch; never `role="tab"` without `tabpanel` |
| empty state | `EmptyState` | centered dashed box, sentence in `--text-secondary`, optional icon and CTA; the SENTENCE belongs to the caller (empty by filter is not empty by absence) and error/loading stay separate (RN-088) |
| create CTA | `Button` + `PlusIcon` | icon + verb ("Nova ideação"), never the "+" character in the text |
| disabled button | `Button` | `--text-muted` on `--surface-2` with a `--border-strong` outline, WITHOUT `opacity`; the pair is measured in `design-contraste.test.ts` in both themes |
| requested decision | `ApprovalCard` | a single variant on the four surfaces (thread, Approvals tab, "needs you", pending items from other sessions): same buttons at natural width, same notes at 12px body, phrase code in mono without quotes; the width belongs to the CONTAINER |

A project tab starts at the top, with no section margin before the title:
`.arch` (`ProjectOverviewTab.module.css`) is for a section that comes AFTER
another.

## shadcn/ui reads the tokens (ADR 0232)

`apps/web` has shadcn/ui (Base UI + Tailwind 4) in `components/shadcn/`.
`src/shadcn.css` (imported after `index.css`, with the Tailwind preflight on
since ADR 0237) maps shadcn's semantic colors to this directory's tokens in
`@theme inline` (`primary`→`--accent`, `accent`→`--surface-2`,
`destructive`→`--danger`...) and ties `dark:` to `[data-theme='dark']`. The raw
shadcn variables (`--accent`, `--radius-*`, `--font-mono`) are NOT declared:
the tokens here remain the only source, and the contrast pairs stay measured by
`design-contraste.test.ts`.

Today `components/shadcn/` contains (downloaded from the `base-nova` registry,
still unused on any screen except Button): button, badge, card, alert, label,
field, separator, input, input-group, textarea, native-select, dialog,
collapsible, toggle, toggle-group, tabs, table, empty, skeleton, avatar, trace,
message, bubble, item, tooltip, hover-card, progress and spinner.
`components/ai-elements/` holds the AI patterns of AT-647 (presentation only,
text by prop, nothing on screen yet); `shadcn.css` already scans it.
Conversation: message, suggestion, prompt field and confirmation.

## `design_handoff_brabo/`: the handoff, versioned

Since 2026-08-08 (FASE 16) the design handoff lives **in the repository**, at
the root: a `README.md` with the full specification and eight high-fidelity
`.dc.html` files in `designs/`. Before that, the visual detail not covered by
`COMPONENTS.md`/`SCREENS.md` existed only behind `DesignSync(get_file)`, an
external service. Now the reference has a hash and a history like everything
else.

Three things the handoff states about itself that hold as rules here:

1. The `.dc.html` files are **reference, not code to copy**. Inline style is a
   prototype construct; the implementation uses the `apps/web` patterns.
2. `designs/support.js` is the prototype runtime: **do not port**.
3. No binary assets. Every icon is inline SVG, and the only brand asset is the
   B monogram, which is a component and never a rasterized image.

**The deliberate divergence:** the handoff asks for the Google Fonts `<link>`.
The three families remain **self-hosted** (`@font-face` in
`apps/web/src/index.css` over the `.woff2` files in `public/fonts/`). This is
not a preference: the nginx image's CSP is `style-src 'self'; font-src 'self'
data:`, which blocks the stylesheet and the files; following the handoff on
this item reintroduces exactly the failure ADR 0036 closed, and the symptom is
the whole typography falling back to a system font. The handoff's families,
weights and scales hold; the way of loading them does not.

The same yardstick applied twice more, in ADR 0074. The handoff says to apply
`data-theme` through an **inline script in `<head>`**: inline is blocked by the
image's `script-src 'self'`; the script exists and is a **file**
(`apps/web/public/theme-boot.js`). And five of the handoff's eight `--syn-*`
values fail 4.5:1 against its own `--code-bg`; the measured values hold. In
every case the handoff's intent is followed, and the mechanism (or number) that
breaks the product is not.

## The two UI validations

Fidelity to the design is checked by eye. Two classes of defect, however, moved
to automation because they escape any visual review: whoever wrote the code
already knows where to look, and the author's own monitor is always the best.

**Contrast** is arithmetic and became a test:
`apps/web/src/lib/contraste.test.ts` reads THIS `tokens.css`, resolves the
`var()` chain down to the literal color and measures the WCAG ratio of the
pairs the interface uses, **in both themes** since ADR 0074 (RN-184). The
Shimmer (ADR 0210) enters at the worst point of the glow, the base color
`--text-secondary` over `--surface-0/1/2`: in dark 7.58/7.17/6.62:1, in light
7.73/7.41/7.03:1.

**The palette has been neutral since ADR 0181 (RN-640).** The dark theme
stopped being petrol blue and is neutral black (`--surface-0/1/2`
`#0d0d0f/#141417/#1c1c21`) with the **soft** terracotta accent (`#c8744f`);
the light theme is the neutral of the same family (`#ffffff/#fafafa/#f4f4f5`,
accent `#a4502c`). The surfaces, secondary text and borders come from the raw
`--neutro-*` scale; the terracotta identity stayed in the accent, and the test
checks that its hue remains in the terracotta range in both themes. The final
values came from **measurement**, not from the draft: where the draft failed
(`--text-muted` `#71717a` in both themes, light `--on-accent` over the dark
theme's accent), the number was adjusted until the floor passed; the before and
after numbers are in ADR 0181.

**There is no contrast debt anymore.** From ADR 0074 to 0181 the dark theme
carried five pairs below 4.5:1, pinned by number:

| pair | ratio until ADR 0181 | today (dark / light) |
|---|---|---|
| `--text-muted` over `--surface-1` | 3.89:1 | 5.10 / 5.21 |
| `--text-muted` over `--surface-2` | 3.10:1 | 4.70 / 4.94 |
| `--accent` over `--surface-1` | 3.88:1 | 5.31 / 5.35 |
| `--danger` over `--surface-1` | 3.88:1 | 4.96 / 6.11 |
| `--success` over `--surface-2` | 4.41:1 | 6.69 / 4.85 |

All five are a **floor** now, in both themes: the next palette change that
pushes them back down fails instead of being recorded. Gone with them is the
"known exception" of the primary button (`--on-accent` over `--accent`, 3.20:1
in dark): the dark `--on-accent` is neutral black, 5.61:1. And two consumers
that worked around the debt were revisited: `.link` (auth) went back to the
mock's `--accent`; `.hint` (Input) stayed on `--text-secondary`, now for
hierarchy.

The same test guards **parity between the two themes**: every semantic color
token declared in `:root` must be redeclared in `[data-theme="light"]`. The
list is derived from the file, not written by hand, so a new token joins the
check on its own. The defect it catches is not "the color vanished": it is the
color calibrated for dark **leaking** into the light theme, which shows up far
from the commit that caused it.

The **syntax palette** has the handoff's eight roles with the `--syntax-*`
prefix (RN-185), each with its own value per theme and all measured at 4.5:1
against `--code-bg` in both (recomputed in ADR 0181 against the neutral
`--code-bg` values). Five of the eight values the handoff specifies were
**rejected by measurement** (ADR 0074 says which and by how much; the file's
comment has the current numbers): where the handoff fails, the measured number
holds.

`--violet` (agents/AI) entered in FASE 16 and is measured as an interface
element (3:1) on the three surfaces and as text (4.5:1) over `--code-bg`, where
it is the number and decorator in the highlighting. In ADR 0181 it was
desaturated along with the rest (`#9d8ad6` in dark, `#6a50b8` in light). The
three agent colors with no semantic tone, `--agent-leve`, `--agent-frontend`
and `--agent-secops`, became a per-theme token in the same ADR (they were loose
hex values in `lib/agents.ts`) and are measured by the same yardstick as
`--violet`.

**Color that has to leave CSS** (Mermaid, xterm, the minimap canvas) reads the
active theme's token and, without it, falls back to
`apps/web/src/lib/tokens-padrao.ts`, a copy of `:root` that
`tokens-padrao.test.ts` checks against this file. And
`apps/web/src/design-tokens-existentes.test.ts` rejects any CSS module
`var(--x)` that nobody declares (that is how `--surface-3` and
`--radius-pill`, used and never defined, turned up).

**Layout** depends on real measurement (font width, line wrapping, computed
position) and no test environment in the repository does layout (jsdom
measures nothing). So it runs in the browser, against the running application:
`scripts/dev/validacao-visual.js`, pasted into the console or run by the agent.
It flags four things:

1. **clipped text**: content larger than the box, with non-scrollable overflow;
2. **outside the viewport**: a menu, dropdown or tooltip whose rectangle leaves
   the screen;
3. **clipped by an ancestor**: the classic dropdown inside an
   `overflow: hidden` container, which exists, has a size and vanishes;
4. **small target**: a button or link under 24px (WCAG 2.2 AA).

No new dependency, on purpose: a checker that requires installing a runtime
does not get run. The output is JSON, to become a finding, never an automatic
fix.
