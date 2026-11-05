# Screens: layout extracted from claude.ai/design

Same source as `COMPONENTS.md` (see there for the visual details of the
components cited below). This file covers the COMPOSITION of each screen:
which regions exist, how they are organized, and the state behavior of each.

## The living reference is `design_handoff_brabo/` (since 2026-08-08, FASE 16)

The handoff is **versioned in the repository**: a `README.md` with the full
specification (colors, typography, heights, radii, transitions, brand) and
eight high-fidelity `.dc.html` files in `designs/`. It replaces
`DesignSync(get_file)` as the way to recheck a detail; the source is no longer
an external service that can vanish.

The `.dc.html` files are **design reference, not production code**: inline
styles by prototype construction, and `designs/support.js` is the prototype
runtime, which the handoff's README explicitly marks as **do not port**.

Coverage, compared with this file:

| handoff file | screen | composition written here |
|---|---|---|
| `Brabo Login.dc.html` | login and sibling screens | yes, section "Auth" |
| `Brabo App.dc.html` | project list | yes, "App shell + Dashboard" |
| `Brabo Project.dc.html` | project view | yes, "Projeto" |
| `Brabo Session.dc.html` | session with agents | yes, "Sessão / Chat" |
| `Brabo Approvals.dc.html` | approvals queue | yes, "Aprovações" |
| `Brabo Settings.dc.html` | settings (AI + IAM) | yes, "Configurações" |
| `Brabo Design System.dc.html` | visual foundation and components | it is `COMPONENTS.md`, not a screen |
| `Brabo Code.dc.html` | code tab (IDE) | **no**, see below |

**Code tab (IDE):** the handoff specifies it entirely (48px rail, 252px
explorer, editor with a 64px overlay minimap, bottom panel, 24px status bar,
branch selector, syntax highlighting). The composition was **not** transcribed
here because this screen's terminal became an architecture decision: a
container per project, with the image decided by the Architect; writing the
layout before the decision would pin a screen that the decision may move. In
the meantime, the reference is the `.dc.html`.

**Brand divergence: RESOLVED in FASE 17a.** The handoff has **one** symbol, the
B monogram (see `COMPONENTS.md`), and the product had two: the auth screens'
`LogoMark`, which is the monogram, and the app shell's `BrandIcon`, an
isometric cube with no counterpart in the handoff. The swap happened on the
transition from login to the app. The shell now uses `LogoMark`; `BrandIcon`
remains exported as a generic artifact icon, with the warning that it is **not**
the brand.

## Deliberate divergences of Project and Session (FASE 17b)

Both screens were rewritten against `Brabo Project.dc.html` and
`Brabo Session.dc.html`. What follows was **not** ported, and each item has a
reason; the list exists so that the next reading of the handoff does not treat
as an oversight what was a decision.

**The logo in the screen header.** Both `.dc.html` files open with the monogram
at 30px (Project) and 28px (Session) followed by a vertical divider. The
prototypes are ISOLATED screens, without the shell; in the product both live
inside it, and the brand is already in the sidebar. Repeating it 250px away is
noise, not fidelity.

**Data that does not exist.** The Project header shows the policy chain
(`dev → qa → rc → main`), the current commit hash and `↑3 ↓1`; the Session bar
shows the duration (`24min`). None of that is in what the api returns today:
`ProvisionedRepository` carries `defaultBranch` and nothing else about repo
state. What exists is shown; the rest is pending, not invention.

**The agent team's empty state** ("Nenhum agente no time ainda" + button
"Adicionar agentes") is **unreachable** in the product: agent presence is a
RULE, not an editable list; `rosterFromFacts` always returns at least Criativo,
PO and Arquiteto. An empty state that no path produces is dead code, and the
button would promise an action that does not exist.

**Code and terminal blocks inside the bubble** (header with file name, mono
body over `--code-bg`, `rtk −78%` badge) depend on the agent's response being
structured. It is text today. Pending.

**The bubble text color** stays at `--text-primary`, and the handoff asks for
`--text-secondary`. The message content is the densest reading surface in the
product, and the `--text-secondary` over `--surface-1` pair sits at the border
of the AA floor measured in `apps/web/src/lib/contraste.test.ts`.

**The tab ruler's numeric badge** stays solid (`--accent` with
`--on-accent`), and the handoff asks for it tinted (`--accent` at 18% with text
in `--accent`). The tinted one uses a pair that is already in the recorded
contrast debt (3.88:1), and the badge is 10px text.

**The horizontal tab ruler no longer exists** (ADR 0126). Project navigation
was a VERTICAL RAIL (`ProjectRail.tsx`, removed in ADR 0211), with the three
groups open at the same time: 12 tabs in 3 groups did not fit in a bar designed
for half a dozen items. The geometry is that of the Code tab's rail
(`--surface-1` strip, 32px item at `--radius-sm`, active tinted at 12% of
`--accent`), with one declared divergence: 180px wide instead of 48px, because
this rail carries a label and a group header, not an icon.

**The rail left in ADR 0211** (AT-404): project navigation is the project's
list in the SIDEBAR (`apps/web/src/routes/AbasDoProjeto.tsx`), with the same
groups, the same item geometry (28px, `--fs-sm`, active in `--accent-soft`) and
the five separate counters. Collapsed, the open project opens a flyout with the
same tabs; on the phone, they live in the drawer. The Code tab's frame dropped
from 492px to 312px (110px collapsed).

The pending item this paragraph used to record (per-tab spacing, interval and
divider adjusted by the CALLER's CSS (`ProjectPage.module.css`) instead of in
the primitive) **closed before that, in ADR 0078**: the values migrated to
`components/ui/Tabs.module.css`, which documents the migration at the top of
the file, and `ProjectPage.module.css` kept only the side spacing (later
removed along with the ruler). The `Tabs` primitive continues to exist as a
design system piece (`ds-bundle/components/primitivas/Tabs`), now with no caller
inside the app.

## App shell + Dashboard (`Brabo App.dc.html`)

Layout: `display:flex;height:100vh`: fixed sidebar (248px) + main column
(`flex:1`).

**Sidebar** (`var(--surface-1)`, `border-right`): logo+name at the top;
label "PROJETOS" (mono uppercase, muted); project list (nav, each item = color
dot + truncated mono name + conditional unread badge, active = `surface-2`
background); fixed footer with 2 buttons ("Chat global", "Configurações";
outside this implementation's scope, it is global navigation) + logged-in user
card (34×34 avatar radius 8px with initials, name + RBAC role). The avatar is
SOLID `var(--accent)`, not the handoff's gradient: the mix with `--warning`
drops the initials' contrast to 2.10:1, and the handoff does not specify a
seniority the product has to show.

Deliberate divergence from the mock: a "+" button (icon only, 22×22px) next to
the "PROJETOS" label, which opens the SAME `NewProjectWizard` as the topbar
button. The mock only draws "Novo projeto" in the Dashboard topbar, but the
sidebar is the PERSISTENT layout (`Shell.tsx`, mounted on every
`/projects/$projectId/**` route); without it, creating a second project while
inside an already open one required manually going back to `/`. The two coexist
on purpose: they live in distinct visual regions, and there is no perceptible
redundancy on the only screen where both appear (the dashboard).

**Topbar** (60px, `border-bottom`): title "Projetos" on the left; search
(input with icon, 260px); `NotificationBell`; primary button "+ Novo
projeto" (opens the wizard, see `COMPONENTS.md`).

**Main**: summary line (`"{N} projetos ativos · {N} agentes · R$ {X}
este mês"`, mono) + responsive grid (`repeat(auto-fill, minmax(340px,1fr))`)
of `ProjectCard`.

**Notif dropdown**: see `COMPONENTS.md` (`NotificationBell`); opens anchored at
the top right, a clickable invisible overlay closes it.

## Project: Overview (`Brabo Project.dc.html`)

Layout: fixed header + body with tabs; the overview has 2 columns
(`flex:1` content + fixed 360px aside).

**Header**: provider icon + project name (Space Grotesk 700 20px)
+ badge `"{provider} · {visibilidade}"`; below, mono metadata
(current branch policy `dev → qa → rc → main`, commit hash,
`↑N ↓N` ahead/behind); the project's `TokenMeter` (alert variant
when ≥90%, see `COMPONENTS.md`) aligned right; "ver estado vazio"
toggle (dev-only, to preview the empty state).

**Tabs**: "Visão geral" / "Sessões" / "Aprovações" (badge with pending count) /
"Configurações". "Sessões"/"Backlog" appear in the mockup but their content is out
of this screen's scope (generic placeholder "Conteúdo desta aba fora do
escopo desta tela"; in this implementation, Sessões becomes a simple real
screen, see plan; Backlog is not in the request, omit it).

**"Time de agentes" region** (main area): header with count
(`"{N} agentes · {N} trabalhando · {N} aguardando"`); grid of
`AgentCard` (`repeat(auto-fill, minmax(300px,1fr))`) with the manual/auto
autonomy toggle per card. Empty state (newly created project):
icon illustration + title + text + "Adicionar agentes" button
(dashed border, centered).

**"Atividade" aside**: header with count; filter select by agent
+ type filter chips (see `COMPONENTS.md` EventItem); scrollable list of
`EventItem`; empty state with a contextual message.

## Session / Chat (`Brabo Session.dc.html`)

Layout: `flex-direction:column`, topbar (60px) + body (`flex:1` chat +
optional 320px aside).

**Topbar**: pulsing green dot + session title + mono metadata
(`"{projeto} · #{id-curto} · {duração}"`); `ModelPicker` (dropdown,
compact trigger); "live" variant `TokenMeter` (220px); "Encerrar" button
(ghost, danger color); context panel toggle button (icon of a layout with a
column).

**Chat** (`max-width:780px`, centered): stacked messages
(`gap:20px`), each one = avatar (gradient for the user; geometric icon
colored per agent for the others, see the palette in `COMPONENTS.md`) + name
(agent color) + meta (model · time) + bubble (`var(--surface-1)`,
`border-top-left-radius:2px`: tail at the top-left corner).
The bubble content can include, besides text: code/diff block
(header with file name + "diff" badge, mono body over
`var(--code-bg)`, colored +/- lines) and terminal block (header
"terminal · output" + optional `rtk −N%` badge when there is compression,
mono body). Handoff divider between agents: horizontal line + central pill
(`"{agente A} → passou o bastão ao {agente B}"`). `ApprovalCard`
appears inline as one more "message" when a `pending` action arrives
(same component as the Approvals queue, compact variant without batch
selection). Typing indicator: avatar + 3 dots blinking in sequence
+ text `"{agente} está aguardando aprovação…"` (or "digitando", depending on
the real state).

**Context aside** (collapsible): 3 sections with an uppercase mono header:
"Artefatos gerados" (file+icon+author list), "Decisões
registradas" (list with colored dot + text), "Arquivos tocados"
(git-status-style list: colored M/A letter + path + `+N −N`).

**Composer**: not explicitly detailed in the extracted mockup (the typing
interaction is implicit); implement it as a multi-line text input fixed at the
bottom of the chat, styled consistently with the other inputs
(`COMPONENTS.md`), with a send button; disabled during streaming.

## Approvals (`Brabo Approvals.dc.html`)

Layout: single column, centered `max-width:960px`. Project header
(same name+badge pattern) + tabs (same 5, "Aprovações" active).

**"Pendentes" section**: header with title (Space Grotesk 600/17) and the mono
caption "ordenadas por urgência" on the SAME baseline; batch selection bar on
the right of the header (shows only with an active selection, see
`COMPONENTS.md`); list of `ApprovalCard` (variant with checkbox + urgency
badge); empty state in a dashed frame with a 48px tile and the sentence
"Nenhuma aprovação pendente. O time está fluindo.".

Three deliberate divergences from the `.dc.html`, all for lack of data or by
product decision:

1. **"Selecionar todas"** (the button the mockup shows when there is no
   selection) does NOT exist. Select all followed by "Aprovar selecionados"
   turns mass approval into one click, and how many approvals fit in one
   gesture is a product decision, not visual fidelity. "Limpar" came in;
   this one did not.
2. **Urgency is not derived.** `ApprovalCard` knows how to draw the pill
   (`crítico`/`alta`/`normal`), but nothing in the domain classifies a
   `proposed_action` by urgency, so the queue does not pass the prop and
   ordering remains by `seq`. The caption "ordenadas por urgência" follows the
   design's text and today describes an intent, not what happens.
3. **The GRANTED BY and WHEN columns** of the rules table do not exist:
   `permissions.json` stores patterns, not authorship or date.

**"Permissões do projeto" section**: header + subtitle referencing
`.brabo/permissions.json`; fixed warning banner (icon + text):
`"Ordem de avaliação: deny sempre vence allow, independente da ordem no arquivo."` (soft `var(--warning)` background, text with `deny`/`allow`
highlighted in `var(--danger)`/`var(--success)` mono); search (input,
340px) filtering by pattern/type/granted-by; dense rules table
(columns: PADRÃO mono, TIPO allow/deny/ask badge, CONCEDIDO POR,
"QUANDO", "AÇÃO" = per-row revoke button, trash icon, hover turns
red). Revoking removes the row from the local list (in the real implementation:
removes the pattern from the corresponding array, `allow`/`deny`/`ask`
depending on the row's TYPE, and persists via `PUT .../permissions`).

## Settings (`Brabo Settings.dc.html`)

Layout: same header+tabs structure (`max-width:1040px`, left-aligned since ADR
0244), 2 sections.

**"Modelos por agente" section**: subtitle explaining the cascade
(`global → projeto → agente`, colors muted/warning/accent respectively;
note: in the mockup text the labels used are "global/projeto/agente",
but the real API vocabulary is `workspace/project/agent/session`; use
the real API vocabulary in the implementation, mapping visually to the
same 3 color levels + adding "sessão" as a 4th level
when applicable); team estimated cost summary (card with a clock
icon); dense table (AGENTE with avatar+name, MODELO VIGENTE =
inline `ModelPicker` dropdown, ORIGEM = badge colored by the cascade
level, FALLBACK mono, EST. MÊS).

**"Membros e papéis" section**: subtitle; invite bar (email input
+ role select + "Convidar" button); members table
(MEMBRO = gradient avatar+name+email, PAPEL NO PROJETO = inline select,
STATUS = dot+text "ativo"/"convite", action = remove button); summarized
matrix "Quem pode aprovar o quê" (table: action type × role,
check/dash per cell), mockup rows: Merge/abrir PR, Deploy em
"produção", "Comando privilegiado", "Alterar schema/migração", "Editar
permissions.json"; columns owner/maintainer/developer/viewer. This matrix
is illustrative/static in the implementation (it reflects `MIN_ROLE_FOR_ACTION_TYPE`
of the backend where applicable: terminal/git_commit≥developer,
git_push/pr_open≥maintainer, spend≥owner, but the "Merge/PR" and
"Editar permissions.json" rows have no granular role check
implemented in the backend today; keep the table informative, not
editable).

**"Credenciais de provider" section**: it is the handoff's "Conectores de IA"
(section 7, item 4), with the same design: grid
`repeat(auto-fill, minmax(300px, 1fr))`, one card per provider with a 2px
left border in the connector's color, 28px chip with the two-letter acronym,
name (Space Grotesk 600/14), type in mono 10 uppercase
(`credencial de provider` / `hub de providers`) and status dot, pulsing in
`var(--success)` when there is a key, dimmed when there is not.

The acronym comes from the CAPITALS of the name (`OA`, `OR`, `NV`), and not
from the first letter of each word: "OpenAI" and "OpenRouter" are one word
each and both gave `OP`.

**The divergence:** where the mockup shows the masked credential
(`sk-ant-api03-••••7f2c`), the implementation shows "Configurada em {data} ·
nunca reexibida" or "Nenhuma credencial salva". The key is write-only and
never comes back from the server (ADR 0050); the masked prefix would require
storing a piece of it in the clear. The card keeps the same mono box over
`var(--code-bg)`, the replace field and the save/test/remove buttons.

**Does not exist yet:** the "Melhores modelos por capacidade" section (ranking
by capability with score and "used by"). It depends on a per-model quality
metric that the product does not compute.

## Auth: Login and sibling screens (`Brabo Login.dc.html`)

**A different source from the five above.** This mockup was created in the same
design project (`1c960ca8-5e00-4558-8ced-80dfbdf01027`) but **after** the
2026-07-23 extraction; the auth screens were born in Phase 7a with no mockup at
all, because until the cutover it was Keycloak that served this surface.
Extracted on 2026-07-30. Decisions and divergences in
[ADR 0036](../docs/adr/0036-telas-de-auth-fieis-ao-design-e-fontes-auto-hospedadas.md).

Four screens share the frame: `/login`, `/registrar`,
`/esqueci-senha`, `/definir-senha`.

### Frame (holds for all four)

`min-height:100vh` page, flex centered, `position:relative;
overflow:hidden`, background `var(--surface-0)`, vertical padding 32px / side
padding 24px. Two decorative layers, both `aria-hidden`:

- **grid**: `inset:0`, two crossed 1px `linear-gradient`s in
  `var(--border)`, `background-size:64px 64px`, `opacity:.22`: the graph
  paper that gives the reading of an engineering tool;
- **glow**: 900×520 ellipse at `top:-160px`, centered,
  `radial-gradient(closest-side, color-mix(in srgb, var(--success) 14%,
  transparent), transparent)`, clipped by the page's `overflow`.

Container `max-width:412px`, entry `bfade .4s ease both` (zeroed under
`prefers-reduced-motion`, which keeps the keyframe's final state).

**Two-column mode** (only `/login`; see below). When the screen supplies
`colunaDeIdentidade`, the container becomes a two-column `flex` (`max-width:940px`,
gap 64px, `align-items:center`): identity and environment on the left, the
412px card on the right. Below a 900px viewport the mode is undone entirely and
goes back to being the 412px stack. This is CSS and not a second JSX: the two
wrappers (`.colunaIdentidade`, `.colunaFormulario`) **always** exist in the DOM
and are `display:contents` by default; the tree, and therefore the `Tab` order
and the `<section>` → `<footer>` neighborhood, is the same on all four screens.

**Brand header** (flex, gap 12px, `margin-bottom:26px`): 40×40 seal
radius 11px in `var(--accent)` with the 23px glyph in `var(--on-accent)`
(`LogoMark`: vertical bar + two chevrons, the second at `opacity:.58`; it is
the SAME symbol as the app shell since FASE 17a, there in a 32×32 seal radius
9px), then the "Brabo" wordmark (Space Grotesk 700, 24px,
`letter-spacing:-.035em`, `line-height:1.1`) with the tagline below (IBM Plex
Mono 10px, `letter-spacing:.12em`, uppercase, `var(--text-muted)`).

**Card**: `var(--surface-1)`, `1px var(--border)`, radius 12px,
`var(--shadow-lg)`, `overflow:hidden` (this is what makes the footer respect
the radius). The login shadow is the large one (`0 24px 60px`), not the
default; the brand seal uses the same.
Three regions:

1. **head**: padding `26px 28px 8px`: `<h1>` (Space Grotesk 600, 19px,
   `letter-spacing:-.015em`) + 13px subtitle `var(--text-secondary)`. The
   card title is the page's **only `<h1>`**: "Brabo" is identity, not a
   heading, and promoting it would give two `<h1>`;
2. **body**: padding `20px 28px 26px`, flex column gap 16px: the error `Alert`
   (when there is one) and the form, **siblings, never nested**;
3. **footer**: `border-top 1px var(--border)`, background `var(--surface-0)` (one
   step below the card), padding `14px 28px`, 12.5px
   `var(--text-secondary)` with a link to the neighboring screen.

**Block below the card** (`margin-top:18px`): `Alert` outside the card, when
the screen has context to give about the account. It stays outside on purpose;
inside it would compete with what the person came to do.

**Page footer** (`margin-top:22px`, flex centered, uniform 16px gap
between the five children, IBM Plex Mono 10.5px `var(--text-muted)`):
`<versão> · Status · Documentação`. The version is the artifact's **raw**
value, `dev` outside a release, and that is true information. "Status" is a
button (internal route); "Documentação" is `<a target="_blank" rel="noreferrer">`.

### `/login`

Title "Entrar", subtitle "Acesse seu workspace e retome as sessões em
andamento.". Fields: email (placeholder `voce@empresa.com`) and password
(`revelavel`, mono, placeholder `••••••••••`), both in the `preenchido`
variant. "Esqueci minha senha" on the password label line, on the right.
Full-width submit with `loading` (`Entrar` → `Autenticando…`). Card footer:
"Não tem acesso? **Criar uma conta**". Below the card: `warning` notice about
the migrated account.

**Identity and environment column.** `/login` is the only one of the four that
uses the two-column mode, and that is deliberate: the other three are steps of a
flow already started, and whoever arrives at them already knows where they are.
On the left, under the brand header: an identity sentence (`<p>`, IBM Plex Sans
15px `var(--text-secondary)`, `max-width:42ch`; **not** an `<h2>`, so the card
title remains the only `<h1>`) and the **Ambiente** block, with one row per
service (8px dot, label, state).

The block shows only what is true **without identity**: the `/health` of the api
and of the engine, public on both services. Three states per row and none of
them collapsed: `verificando…` (hollow ring), `respondendo` (`var(--success)`),
`sem resposta` (`var(--danger)`), with a 6s ceiling for the hanging probe. The
version is **not** repeated here: it is still rendered once, in the page
footer. **Nothing in the column is focusable**, and that is a contract: it comes
before the card in the DOM, and a button there would steal the email field's
first `Tab` stop.

**Two things from the mockup that the implementation does not have** (ADR
0036): the "ou" divider existed only to separate the two social buttons and came
back along with them (ADR 0084, which closed the GitHub button divergence); the
**"N agentes online"** indicator is still missing. It did not enter the
Ambiente block on purpose: an agent count belongs to a workspace, and before
login there is no workspace; the question has no subject. Runner and local
models have the same problem (`{user_id, project_id}` and
`projects/:projectId/models`) and so live in the project Overview, not here;
the block SAYS this absence instead of omitting it. Without the indicator, the
card footer is left with one item and the mockup's `space-between` becomes
left alignment.

### `/registrar`, `/esqueci-senha`, `/definir-senha`

Same frame, same components. Each has a **success state** that replaces the
form: a `success`-tone `Alert` with `role="status"` (polite, does not
interrupt; interrupting to give good news is rude) plus an exit button.

The success texts are **conditional on purpose** ("se o endereço estiver disponível", "se houver uma conta com…"): the api answers the same for an
existing and a non-existing account, and an affirmative sentence here would
reopen the enumeration that the server closes.

A field error (short password, mismatched confirmation) goes **under the field**
with `aria-invalid`; a form error (rejected credential, invalid link, network
failure) goes in the **`Alert` at the top of the card**. Whoever reads the
message should not need it to know where to act.
