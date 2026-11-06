# Components: catalog extracted from claude.ai/design

Source: claude.ai/design project `1c960ca8-5e00-4558-8ced-80dfbdf01027`
("Brabo Design System"), files `Brabo Design System.dc.html` (sections
"Componentes base" and "Componentes de produto") + the 5 screen files
(`Brabo App/Project/Session/Approvals/Settings.dc.html`), extracted via
`DesignSync` on 2026-07-23. These `.dc.html` files use the claude.ai/design
canvas template syntax (`sc-for`, `sc-if`, `{{ }}`, `style-hover`/`style-focus`
attributes); they are not executable code. This
file is the basis for the real React/TSX implementation: every color/
spacing value references the tokens in `tokens.css`, never raw hex.

**Since 2026-08-08 (FASE 16) the living reference is the versioned handoff in
`design_handoff_brabo/`**: a README with the specification and 8 high-fidelity
`.dc.html` files. What this file says still holds; what the handoff adds is in
the three foundation sections below. A rule the handoff's own README
establishes and that holds here: the `.dc.html` files are **design reference,
not production code to copy**; the implementation uses the `apps/web` patterns.

General convention confirmed on every screen: outline icons (stroke 1.6-2.0,
24px grid, `currentColor`, `stroke-linecap`/`stroke-linejoin: round`), buttons
with 3 variants (primary/secondary/ghost) × 4 states (default/hover/focus/
disabled), real `:hover`/`:focus` via CSS (the mockup's `style-hover` does not
exist in CSS/React; it needs CSS Modules or an equivalent styled approach,
never inline-only). No binary asset: every icon is inline SVG, and the only
brand asset is the monogram documented below, which is a **component, never a
rasterized image**.

## Typography: the handoff scale

The three families and what each one carries. Loading is self-hosted
(`@font-face` in `apps/web/src/index.css` pointing to `public/fonts/`); the
handoff asks for the Google Fonts `<link>` and **that is the only deliberate
divergence**; see ADR 0036 and the header of `tokens.css`.

- **Space Grotesk** (`var(--font-heading)`): titles, agent and project names,
  wordmark. Weights 600/700. Section title 18px/600; H1 22px/700
  `letter-spacing:-.02em`; wordmark 700 `letter-spacing:-.045em`.
- **Archivo** (`var(--font-body)`): body, labels, buttons. Weights 400/500/600.
  Body 13px, label 12px, button 13px/600.
- **IBM Plex Mono** (`var(--font-mono)`): code, diffs, terminal, token
  counters, paths, keys, IDs and status badges. 10-13px. Table header label:
  10px/600, `letter-spacing:.05em`, uppercase.

The rule behind the list: mono is not only for code. It marks a **value the
person will compare, copy or type**: hash, path, id, count. It is what keeps
title and data distinguishable even at 10px.

## Heights, radii, shadows and transitions

8px grid. Card padding 14-18px; table cell padding 10-11px × 14px.

| height | where |
|---|---|
| 44px | top bar; login primary button |
| 42px | input; login secondary button |
| 36px | editor tab |
| 28-36px | button in a dense context |
| 28px | breadcrumb |
| 24px | status bar |
| 21px | code line |

Radii: 4-5px (mono badge), 6-7px (small input, icon button), 8px (button,
input, small card; `var(--radius-md)`), 10-12px (card, table;
`var(--radius-lg)`), 22px (large brand tile). The tokens cover the three steps
the UI uses in volume (`--radius-sm` 4px, `--radius-md` 8px, `--radius-lg`
12px, `--radius-full`); 6-7px and 22px are single-context values and stay
written where they are used.

Shadows: `var(--shadow)` is the default (`0 1px 2px rgba(0,0,0,.4), 0 12px 32px
rgba(0,0,0,.45)`); `var(--shadow-lg)` is the login card's
(`0 24px 60px rgba(0,0,0,.55)`).

Transitions: 120-130ms for color and border; `bfade` .13s ease-out for
dropdowns; terminal caret 1.05s step-end; live pulse `bpulse` 2.4s ease-in-out
infinite (opacity 1 → .35); spinner `bspin` .7s linear. Every continuous
animation stops under `prefers-reduced-motion`: the element stays, only the
motion goes (see "Button with `loading`").

Derived colors always come from `color-mix(in srgb, <token> N%, transparent)`,
typically 11-15% for a chip background and 34-45% for a chip border. Never a
new hex invented for "the light version of".

## Brand: the B monogram

Solid vertical stem + two chevrons. Up close it is the letter B; from afar it
reads `>>`, agents advancing in a chain. The lower chevron sits at **58%
opacity**, and that is semantic: it is the handoff still in progress.

Canonical SVG (`viewBox="0 0 24 24"`, `fill:none`, `stroke-linecap` and
`stroke-linejoin: round`):

```html
<path d="M5.4 3.6v16.8" stroke-width="3.4"/>
<path d="M10.4 4.6l5.6 3.8-5.6 3.8" stroke-width="2.8"/>
<path d="M10.4 12l5.6 3.8-5.6 3.8" stroke-width="2.8" opacity=".58"/>
```

Default application: `var(--accent)` tile with `var(--on-accent)` stroke,
radius ≈ 28% of the side (32px→9px, 40px→11px, 96px→22px). Minimum size 16px,
and at that size the lower chevron goes up to `opacity:.7`, otherwise it
disappears.

Allowed variants: terracotta tile; terracotta over surface; teal over dark
background (active state); monochrome. **Never** rotate, stretch, outline or
apply a gradient. Minimum clear space = the stem width (3.4 units of the 24
grid).

Wordmark: Space Grotesk 700, `letter-spacing:-.045em`.

## Buttons (base)

- **primary**: bg `var(--accent)`, text `var(--on-accent)`, border
  `var(--accent)`, radius 8px, padding `9px 16px`, `font-weight:600`,
  `font-size:13px` Archivo. Hover: bg/border `var(--accent-hover)`. Focus:
  outline 2px `var(--accent)` offset 2px. Disabled: bg `var(--surface-2)`,
  text `var(--text-muted)`, opacity .6, `cursor:not-allowed`.

**Size** (`size`, FASE 17a): the default is the dense button above, in the
28-36px range of the heights table. `lg` is the **main action of an entire
screen**: `height: 44px`, `padding: 0 16px`, `font-size:14px`,
`letter-spacing:.01em`, today the submit of the four auth screens. It is a
fixed `height` and no longer padding because the label changes under `loading`
("Entrar" → "Autenticando…") and the box cannot change height when the spinner
comes in. `size` is independent of `fullWidth`: width and height answer
different questions.
- **secondary**: bg `var(--surface-2)`, text `var(--text-primary)`,
  border `var(--border)`. Hover: border `var(--border-strong)`. Disabled:
  bg transparent, opacity .5.
- **ghost**: bg transparent, text `var(--text-secondary)`, no border.
  Hover: bg `var(--surface-2)`, text `var(--text-primary)`.

**Dense and icon-only** (AT-287): `size="sm"` is the 28px button
(`font-size: var(--fs-sm)`) for a table row, side panel and language bar;
`icon` is the handoff's **icon button**: square (36px, or 28px with `sm`),
radius `--r-sm` (7px), accessible name via `aria-label`. A raw button (a
`<button>` with its own module) stays only where the element is NOT a button
action: project tab (`role="tab"`), disclosure header, navigation item,
editable title.

## Card, Chip and Badge (AT-286, AT-287)

- **`ui/Card`**: `var(--surface-1)` + `1px solid var(--border)` + radius
  `--r-lg` (or `--r-md` with `radius="md"`, the dense grid/thread card),
  padding `none|sm|md|lg` (0 / 12 / 16 / 24px). `recorta` is `overflow:hidden`,
  for whoever paints a region flush against the border (`ApprovalCard`).
  Outside layout (margin, width) belongs to the caller, via `className`. Panel,
  rail and fixed header are NOT a card; they stay `surface-1` in their own
  module.
- **`ui/Chip`**: the FILTER pill, interactive (`<button aria-pressed>`), mono
  `--fs-sm`, on = `--accent` (or `--violet`) border over `--surface-2`.
- **`ui/Badge`**: the NON-interactive counterpart (`<span>`). Tones `success|warning|
  danger|accent|muted`, plus `neutral` (`--text-secondary` text: a badge whose
  text is content, like a branch name) and `agent` (color inherited from
  `--agent-color`). `size="md"` is the 11px one; `square` is the table
  rectangle. `emCurso` puts the label in the `Shimmer`, only for IN-PROGRESS
  state (container and `provisioning` project); the other badges do not change.
  The dot pulses (Badge's `pulse`, current gate marker, status dots) stop under
  `prefers-reduced-motion: reduce`: the animation goes, the dot stays.

## AgentCard

Geometric avatar (outline SVG icon distinct per agent, not photo/letter)
40-44px, `border-radius:10px`, bg `color-mix(in srgb, <status-color> 18%,
var(--surface-2))`, border `color-mix(in srgb, <color> 40-50%, transparent)`.
Name (Space Grotesk 600, 14-15px) + status badge (pill, `font-family:
IBM Plex Mono`, 10px, with a 6px dot):
| status | color | animation |
|---|---|---|
| trabalhando | `var(--success)` | `bpulse` (pulse, 1.4s infinite) |
| aguardando | `var(--warning)` | none |
| ocioso | `var(--text-muted)` | none |
| falhou | `var(--danger)` | none |

Subtitle: role/specialty (12px, `var(--text-muted)`). Footer separated by
`border-top`: "model" icon (helmet/box) + name of the bound model + provider
(`claude-sonnet-4 · API` / `llama3.1:8b · Ollama`), 11px mono. In the agent
team panel (Project screen), each card also has a manual/auto autonomy toggle
(2-button pill).

**Fixed roster of the 9 agents** (CLAUDE.md): Psicólogo, Anamnese, Criativo,
Arquiteto, PO, Dev Backend, Dev Frontend, Infra, QA, SecOps, each with its own
accent color used on the avatar/name throughout the UI (consistent between chat
and overview): Psicólogo `var(--violet)` `#9C7BE0`, Anamnese
`var(--success)` `#37B3A4`, Criativo `var(--warning)` `#E0982F`, Arquiteto
`var(--accent)` `#D6633A`, PO `var(--violet)` `#9C7BE0`, Dev Backend
`var(--success)` `#37B3A4`, Dev Frontend `#5EBEB1`, Infra `var(--warning)`
`#E0982F`, QA `var(--danger)` `#E05A3E`, SecOps `#8AA6AE`.

## TokenMeter

Card `var(--surface-1)`, border `var(--border)`, radius 12px, padding 20px
(compact variant in the ProjectCards: smaller, radius 8px, padding 10-12px,
without the extra savings text).
- Top line: `"{used} / {limit} tokens"` (mono 12-13px, secondary) + percentage on
  the right (mono, bold, color per threshold).
- Bar: height 6-10px, bg `var(--surface-0)`/`var(--surface-2)`, full radius,
  fill `linear-gradient(90deg, var(--success), var(--warning))` (at 100%
  `--danger` fades in on the real composition; see the "alert" variant below)
  with width = percentage.
- **Color thresholds** (confirmed in the Project/Settings mockups):
  `< 70%` → green (`var(--success)` dominates, no warning); `70-89%` → warning,
  percentage color and possibly text in `var(--warning)`;
  `>= 90%` → `var(--danger)`, blinking alert icon (`balert`,
  `opacity 1↔.5`, 1.6s) and card border in
  `color-mix(in srgb, var(--danger) 45%, var(--border))`; in that case the bar
  gradient gets a third stage toward red (`success→warning→danger`) with thin
  vertical markers at 70%/90%. Text label on the alert card:
  `"{pct}% do limite mensal"`.
- Markers 70/90/100 below the bar (9px mono text, `text-muted`, positioned via
  `left:70%/90%/100%`).
- Footer: cycle cost (`"R$ X · US$ Y"`, mono 15-16px bold) on the left,
  compression savings on the right (mono bold, `var(--success)`, `"−R$ X"`).
  Expanded variant (base Design System) also shows an extra badge below:
  `"{pct}% de tokens poupados este ciclo"` with an up-arrow icon, background
  `color-mix(var(--success) 12%)`.
- **"Live" variant** (chat session topbar): more compact (220px, padding
  7-12px), with a `"ao vivo"` indicator (pulsing green dot) + `"falta {N}"`
  text in `var(--warning)` on the right, without the threshold markers or the
  savings footer (only `"{used}/{limit}"` + `"R$ cost"` on one compact line).

## EventItem / ActivityFeed

Row: 26x26px icon `border-radius:7px` colored by type (`bg:
color-mix(<color> 15-16%, transparent)`, `color:<color>`), text (13px,
`<b>{agent}</b> {action}` with technical snippets in mono `text-secondary`),
relative time on the right (11px mono, `text-muted`, `white-space:nowrap`).
Row hover: `background: var(--surface-2)`. Border between items:
`border-top: 1px solid var(--border)`.
Colors by event type: commit → `text-secondary`; PR/pull request →
`var(--accent)`; hypothesis (psychologist) → `var(--violet)`; session
(abnormal termination) → `var(--danger)`; permission (granted/denied) →
`var(--success)` (denied uses `var(--danger)` via a `bad` flag separate from
the type).
In the Project screen feed: filter by agent (select) + type chips (clickable
pills, selected = bg `var(--accent)`/text `on-accent`).
Empty state: clock icon + centered explanatory text.

## ApprovalCard

Card `var(--surface-1)`, border `var(--border)` (or
`color-mix(var(--danger) 32%, var(--border))` when urgency = critical),
radius 12px.
- Header: icon per action type (diff→"diff" icon, terminal→"terminal" icon,
  PR→"pr" icon), `<b>{agent}</b> {action}` (e.g. "propõe alteração" / "quer
  executar comando" / "abriu pull request"), meta (model · context) on the
  right or below, optional urgency badge (Approvals queue: critical/high/normal,
  pill with a pulsing dot only on critical).
- Body per variant:
  - **diff**: `var(--code-bg)` block, lines with number (opacity .6),
    colored `+`/`-` sign (`var(--success)`/`var(--danger)`), line background
    `--diff-add`(`#0E2E24`)/`--diff-del`(`#331A16`) when expanded;
    in the Approvals queue it is collapsible (clickable header with a chevron
    that rotates 90°, shows the file name + `+N −N` count).
  - **command/terminal**: one mono line `$ {command}` over
    `var(--code-bg)`; in chat, the command's real output goes with it (separate
    "terminal · output" block, with an optional `rtk −N%` badge when there is
    real compression).
  - **PR**: title (Space Grotesk 600), `{source-branch} → {target-branch}`
    (mono rectangles with radius 6 and a `var(--border)` border, not pills) +
    status, summary (secondary text).
- Actions (pending state): 3 buttons side by side: **Aprovar** (bg
  `var(--success)`, white text), **Negar** (ghost with border
  `color-mix(var(--danger) 45%)`, text `var(--danger)`), **Sempre
  permitir** (secondary). The first two stretch (`flex:1`) only in the **chat**
  variant, where the column is narrow; in the **Approvals queue** they have
  content width, as in the handoff. Below, in chat: fixed note (alert icon +
  mono 11px, `text-muted`):
  `"'Sempre permitir' grava a regra em .brabo/permissions.json"`.
- Decided state: the buttons go away, showing a line with a colored dot +
  text (`"Aprovado · comando em execução"` green / `"Negado"` red /
  `"Sempre permitido · gravado em permissions.json"` accent).
- The Approvals queue also has batch selection: checkbox per card (top-left
  corner of the header) + an action bar in the SECTION HEADER when there is a
  selection (`"{N} selecionadas"` + "Aprovar selecionados" + "Limpar"). In the
  header, and not in a strip of its own above the queue: the strip pushed the
  list down 44px on the first click of every selection.

**Card structure (handoff, section 6):** the card CLIPS
(`overflow: hidden`) and has no padding of its own; each region brings its own
and the divider: header 14×16 with a bottom border, body flush against the
borders (terminal and diff over `var(--code-bg)`, PR over the card surface),
actions 12×16 with a top border. The strip that opens the diff sits over
`var(--surface-2)`.

## ModelPicker

Dropdown/list (width ~300-440px depending on context: standalone in the Design
System, inline in the Settings table rows, or a dropdown in the session
topbar), background `var(--surface-1)`, border `var(--border-strong)` when
open, `box-shadow: var(--shadow)`.
- Group header (sticky): `var(--surface-2)`, mono 9-10px uppercase
  `letter-spacing:.08em`, `text-muted`, two fixed groups: **"Local ·
  Ollama"** and **"Cloud · por provedor"** (or "Cloud" alone in the base
  variant).
- Each option: custom radio (circle 13-16px, ring `var(--border-strong)`
  or `var(--accent)` when selected, inner dot filled only when selected) +
  model name (mono 12-13px) + (cloud) `· {provider}` in `text-muted` + cost
  badge on the right (`"grátis"` in `var(--success)` for local ones;
  `"R$ X · US$ Y"` in `text-secondary`/`text-muted` for cloud ones), whole
  button background highlighted (`color-mix(var(--accent) 10%, transparent)`)
  when it is the current selection. Hover: `background: var(--surface-2)`.
- Trigger (closed): button with model icon + current name + (topbar variant)
  chevron; in the table context (Settings), the trigger hides the binding
  origin (separate badge, see Settings below) and shows only
  model+abbreviated provider+chevron.

## NotificationBell (not in the base Design System; extracted from the App screen)

38x38px button, radius 8px, `var(--surface-1)`/`var(--border)`, count badge
(`var(--accent)` pill, mono 9px, `border: 2px solid var(--surface-0)` to
"cut out" of the background) at the top-right corner.
Dropdown (380px, `max-height:70vh` with scroll): sticky header "Notificações"
+ "marcar lidas" link (accent). Grouped by project: group header
(`var(--surface-2)`, project dot + name + event count), event list (same look
as EventItem, icon+text+time).

## Generic cards (base Design System: Cards / Dense table / Inputs /
Tabs / Toasts / Modal)

- **ProjectCard** (dashboard): header (34px provider icon + name
  Space Grotesk 600 15px + mono 11px muted provider label + optional unread
  badge), row of overlapping agent avatars (`margin-left:-6px`,
  `box-shadow: 0 0 0 2px var(--surface-1)` to separate them), compact
  `TokenMeter`, footer with activity dot + text (last activity, 12px,
  truncated).
- **Dense table** (permissions/members/models/matrix): grid via
  `display:grid;grid-template-columns:...` (not `<table>`), header
  `var(--surface-2)` mono 10px uppercase, rows with `border-top` +
  hover `var(--surface-1)`, columns separated by `border-left`.
- **Inputs/selects**: background `var(--surface-0)`/`var(--surface-1)`, border
  `var(--border)`, radius 8px, padding `8-11px 12-13px`. Focus:
  `border-color: var(--accent)` + `box-shadow: 0 0 0 3px var(--focus-ring)`
  (the accent at 22% over `transparent`, AT-285). Custom select with an
  absolutely positioned SVG chevron (never the browser's native arrow;
  `appearance:none`).
- **Tabs**: no background, `border-bottom:2px solid transparent`, active =
  `border-color: var(--accent)` + `color: var(--text-primary)` +
  `font-weight:600`; inactive = `color: var(--text-muted)`,
  `font-weight:500`. Optional count badge next to the label (accent pill, same
  pattern as the unread badge).
- **Toast**: fixed `bottom:24px;right:24px`, `border-left:3px solid <color>`,
  colored dot, title (Space Grotesk 600 13px) + message (mono 11px
  secondary), close button (ghost X). Entry animation `btoast`
  (rises 8px + fade).
- **Modal**: overlay `rgba(3,10,14,.62-.66)` + `backdrop-filter: blur(2-3px)`,
  centered card `var(--surface-1)`, `border: 1px solid
  var(--border-strong)`, radius 12-14px, `box-shadow: var(--shadow)`,
  entry animation (fade+scale, `bpop`/`btoast`). Header with icon +
  title + close button (X). A click on the overlay closes it; a click on the
  card calls `stopPropagation` (does not close).

## "New project" wizard (App screen, modal)

4 steps with a stepper (numbered circles joined by a line,
filled/current/pending in different colors: accent on the current one and on
those already completed, `surface-2`/`text-muted` on pending):
1. **Provider**: 2x2 grid of options (GitHub/GitLab/Bitbucket/Local),
   icon + label + description, selection = accent border+background.
2. **Name**: text input + preview of the computed slug
   (`repo: brabo/{slug}`, mono, in a `var(--code-bg)` block).
3. **Branches** *(cosmetic: no backend counterpart, see plan)*:
   policy choice (Gitflow/Trunk-based/Custom, custom radio)
   + preview of the resulting branch list (mono pills).
4. **Agents** *(cosmetic: no backend counterpart)*: list of
   agents with checkbox, selected counter.
Footer: Back button (conditional) + `"passo N de 4"` + Continue/Create project
button (reduced opacity when the step cannot advance).

## Alert (extracted from the login mockup, 2026-07-30)

Warning block **in the flow** of the page, not floating. It is not a `Toast`:
that one is transient and lives fixed in the viewport; this one takes up space
and stays.

Common anatomy: `display:flex; align-items:flex-start; gap:10px;
padding:10px 12px; radius 8px`, 15px icon with `flex-shrink:0` and
`margin-top:2px` (aligns with the first line of text, not with the top of the
box), 12.5px text with `line-height:1.5` and `text-wrap:pretty`. `<strong>`
inside the text takes `var(--text-primary)` + `font-weight:600`: it is the
name of the action the person needs to look for.

Two forms, and the difference is position:

- **inside a card** (form error): background and border tinted by the tone,
  `color-mix(in srgb, var(--danger) 10%, transparent)` and
  `color-mix(..., 40%, transparent)`, no side border. It must separate from the
  card by color. Text in `var(--text-primary)`: it is the information of the
  moment.
- **outside a card** (context notice): background `var(--surface-1)`, border
  `1px var(--border)` and `border-left: 2px solid <tone color>`. It already
  sits on the page background, so it only needs an accent.

4 tones: `danger` / `warning` / `success` / `accent`. The default icon comes
from the tone: circle with `!` on `danger` (**failure**), triangle with `!` on
`warning`/`accent` (**attention**), check on `success`. Two symbols for two
different things; with just one, you would have to read the text to know which
is which.

**The accessibility role is NOT derived from the tone**; the caller chooses
it. `role="alert"` is an assertive live region (interrupts the screen reader)
and fits the result of an action the person has just triggered;
`role="status"` is polite and fits confirmation; the default is no role, for
text that was already on the screen when it opened. See ADR 0036.

## Button with `loading`

Extends the already specified `primary`/`secondary`. 15px spinner to the left
of the label, `gap:9px`: `border: 2px solid color-mix(in srgb, var(--on-accent)
35%, transparent)`, `border-top-color: var(--on-accent)`, `radius 50%`,
`animation: bspin .7s linear infinite`. The label changes (`Entrar` →
`Autenticando…`).

Three obligations: the button becomes `disabled` (this is what keeps a double
submit from turning into two requests); it gets `aria-busy="true"` (without it,
a screen reader user only notices that the button got disabled); and the
spinner is `aria-hidden`, so it does not enter the accessible name. Under
`prefers-reduced-motion` the animation stops; the element **stays**, because
removing it would change the button's layout.

## Shimmer (in-progress text, ADR 0210)

`components/ui/Shimmer.tsx`, adapted from the AI Elements Shimmer: the text
stays in `--text-secondary` and a glow in `--text-primary` runs across it
(`duration` 2s, width `--spread` = length × `spread`). When to use:
TEXT that says something is in progress ("Pensando…", "Reunindo informações…",
the AgentCard "trabalhando" status, and the screen loading text:
"Carregando…", "Buscando…", "Somando…", "Verificando…", AT-402). When NOT to
use: a block waiting for data → `Skeleton`; a button waiting for a response →
`loading`. The text stays in the DOM; `role`/`aria-live` belong to the
caller's container. Under `prefers-reduced-motion` the animation stops and the
text stays, static, in the base color. It is the only place in the web app that
imports `motion`.

## Filled field (second input anatomy)

The `Inputs/selects` above still holds as the default. This is the login
mockup's variant, and it is **opt-in**: screens outside auth stay on the
default.

`background: var(--code-bg)`, `height: 42px`, `padding: 0 13px`,
`font-size: 14px`. The three things come from the same specification and travel
together; half of it gives a field that exists nowhere.

The field is **sunken**, as in the handoff. It was `var(--surface-2)`
(**raised** field) until FASE 17a, a divergence ADR 0036 had recorded: over a
`var(--surface-1)` card, the field's default background is the SAME as the
card's, separated only by a 1px border. The problem was real and still holds
for screens outside auth; sinking it solves it equally, follows the versioned
reference and even improves contrast.

**Password**: `var(--font-mono)` 13.5px `letter-spacing: .02em` (mono at 14px
next to Archivo at 14px reads as larger body text). Placeholder in
`var(--text-secondary)`, not `var(--text-muted)`: over `--code-bg` muted would
pass (5.65:1), but a placeholder is reading text and the reason it is more
present than in the handoff has not changed.

**Reveal button**: 32×32 absolute, `right: 5px`, vertically centered,
radius 4px, `color: var(--text-muted)`; hover `var(--text-secondary)` +
`background: var(--surface-2)`. The field opens `padding-right: 44px`. The
accessible label states the **action** ("Mostrar senha"/"Esconder senha") and
`aria-pressed` states the state; a state label would leave the person not
knowing what the button does.

**Action in the label** (the "Esqueci minha senha" next to "Senha"): flex row
with `justify-content: space-between; align-items: baseline`. The action is a
**sibling** of the `<label>`, never a child: a click anywhere in a `<label>`
activates the associated field.

## Visible focus (general rule, fixed in Phase 7)

`:focus-visible`, never `:focus`: the latter lights up on a mouse click, which
is not what the focus indication is for.

Field: `border-color: var(--accent)` + `box-shadow: 0 0 0 3px color-mix(in
srgb, var(--accent) 22%, transparent)` **plus** `outline: 2px solid
transparent`. The transparent outline is not decoration: under `forced-colors`
(system high contrast) the `box-shadow` is discarded, and without it the
focused field has NO indicator at all. A `@media (forced-colors: active)` paints
the outline with `Highlight`.

Button and link: `outline: 2px solid var(--accent); outline-offset: 2px`.
Text link over `--surface-1` uses `var(--accent-hover)` at rest;
`var(--accent)` gives 3.88:1 and fails AA (ADR 0036).

## Iconography

- A new icon comes from Lucide, via `lucide-react`. The house icons (`components/ui/icons.tsx`) do not migrate.
- Size 16px and stroke 1.6: `Button` already forces `size-4` on `svg` without `size-*` and `index.css` pins `svg.lucide` at 1.6.
- A destructive action keeps its text; the icon only accompanies it.
- Icon-ONLY button is the rule (AT-682): `<Button legenda="…">` sets the accessible name (`aria-label`) and the caption in a Tooltip that opens on hover AND on keyboard focus. It holds for every button in the system, including a destructive one with an unambiguous icon (trash, square); the action's CONFIRMATION does not change.
- It keeps text only when no icon covers the whole meaning (Estou pronto, Sempre permitir, Modo automático, Aprovar plano, Salvar when there is more than one Salvar on the screen).
- Exception (AT-753, owner decision 06/11): the PRIMARY decision of each card in the thread carries text next to the icon, as a plain `<Button>` with children and no `legenda`. Examples: the handoff accept ("Aceitar e passar a {agente}", `handoff.aceitarEPassar`) and "Ativar execução". Toolbar actions and secondary buttons stay icon-only with `legenda`.
- An inert control states the reason in visible TEXT: a tooltip on a `disabled` button does not open.
- A lone icon has translated `aria-label` and `title`.
- An inert control explains the reason in TEXT (ADR 0064), never only by tooltip.

## Help (AT-712)

`components/ui/Ajuda.tsx`: the "?" button that holds the long explanatory text and opens it on demand. `<Ajuda assunto="Capacidades">text</Ajuda>`; the accessible name is "Ajuda: {assunto}" (`ui:ajuda.rotulo`).

- It is the kit's `Popover` with `openOnHover` (Base UI mandates Popover, not Tooltip, for an infotip): opens on click, on Enter/Space and on hover; closes with Esc and returns focus; the text is the popup's `aria-describedby` and it also opens on touch. The `Button legenda` Tooltip is only the name of an icon button, never explanatory text.
- It sits inline next to the section title, never inside a `disabled` control. Tokens only, no Tailwind utility outside `components/shadcn` (ADR 0232).

**May go into the "?":** long explanatory subtitle and caption, the "how it works", the context note. A short visible line stays when the rule says to warn (RN-902).

**May NOT, and stays visible as text:**
- the reason for an inert control (RN-646, RN-102, ADR 0064): a tooltip on `disabled` does not open;
  - EXCEPTION, only on the Containers page (ADR 0240): the per-row reasons live in an ACTIVE `Ajuda`, subject "Por que as ações estão indisponíveis", next to the buttons; the "?" is not `disabled` and opens on click, keyboard and hover. The role reason stays in text, at the top. On no other screen.
- the irreversible consequence or the absolute ceiling before acting (RN-939, RN-418);
  - EXCEPTION, only on the execution-mode conversion warning (ADR 0243): it lives in `Perigo` (`components/ui/Perigo.tsx`, `TriangleAlert` icon in the `--danger` color, Popover like `Ajuda`, accessible name "Atenção: {assunto}", `ui:perigo.rotulo`), always visible next to the selector under the same conditions as the old warning, with the full warning in the popover. Any other use requires another ADR.
- the declared scope, such as the day window and the read ceiling (RN-180);
- the state divergence and the gap that an RN says to state (RN-486, RN-468, RN-470).

## v7 linear design (AT-714, ADR 0241/0242)

- **Sidebar**: shadcn `sidebar-07` block, 256px open and 48 collapsed,
  Ctrl/Cmd+B, Lucide icons. Project tabs: body font, `--text-primary`,
  32px, 16px icons and a divider between groups. Footer: the user card is the
  trigger of a `DropdownMenu` (Conta, Tema, Sair); collapsed, only the avatar,
  and the menu opens to the side.
- **Linear table** (`components/ui/Table`, Containers with
  `@tanstack/react-table`): one row per item, icon-only actions with `legenda`.
- **`CabecalhoDePagina`** (`components/shadcn/cabecalho-de-pagina.tsx`): title,
  description and actions; `nivel="h2"` when the page already has an `h1` (Spend panels).
- **`SectionCards`** (`components/shadcn/section-cards.tsx`): inline total
  highlights, no nested cards.
