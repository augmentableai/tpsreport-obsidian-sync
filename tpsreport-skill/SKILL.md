---
name: tpsreport-skill
description: >-
  TPSReport knowledge base skill for Obsidian — build, enrich, lint, and sync
  Graph RAG-ready KB folders. Use when authoring TPSReport KBs, YAML frontmatter
  (summary, keywords, hyde_questions, retrieval_hint), kb_lint.py validation,
  or the TPSReport Obsidian plugin publish/push workflow.
license: MIT
compatibility: Requires Python 3.9+ and PyYAML for kb_lint.py. Pairs with the TPSReport Obsidian community plugin and a TPSReport account.
metadata:
  author: Augmentable.ai
  version: "1.1.0"
  product: TPSReport
  plugin: tpsreport-sync
  brand: TPSReport by Augmentable.ai
---

# TPSReport KB Skill

**TPSReport by [Augmentable.ai](https://augmentable.ai)** — workflow skill for Obsidian knowledge bases synced to [TPSReport](https://tpsreport.pro).

The single workflow manager for a TPSReport knowledge base across its **whole
lifecycle**: seeding new reports, generating content from guidance, enriching
retrieval metadata, **assessing existing reports**, and continuously testing and
iterating — then building locally, pushing through the Obsidian plugin, and
controlling online visibility/gating. The end state is a rich, retrieval-tuned KB
that TPSReport agents query at runtime.

This supersedes the older "enrichment-only" scope: enrichment (Phase 3) is now one
phase inside a closed build->push->measure->iterate loop.

Reference vaults for examples: sample KBs in your Obsidian vault or TPSReport workspace (structure mirrors affiliate / industry KB patterns on [tpsreport.pro](https://tpsreport.pro)).

Plugin source (authoritative key lists + sync behaviour):
[`main.js`](https://github.com/augmentableai/tpsreport-obsidian-sync/blob/main/main.js) in [tpsreport-obsidian-sync](https://github.com/augmentableai/tpsreport-obsidian-sync).

Tooling shipped with this skill (use them — don't eyeball metadata):
- [references/metadata-contract.yaml](references/metadata-contract.yaml) — machine-readable contract: the exact keys, types,
  required core, synonym traps, and value rules. Single source of truth.
- [scripts/kb_lint.py](scripts/kb_lint.py) — deterministic validator. Phase 4 runs this and must reach exit 0.
  The plugin's Gatekeeper enforces the same rules at the sync boundary.

## When To Use This Skill

- **Seed** a brand-new KB or add new reports/sections to an existing one.
- **Generate** report bodies from a research brief / guidance (guidance-first).
- **Enrich** good prose that has empty/partial frontmatter (`keywords:`,
  `intents:`, `hyde_questions:` blank, malformed `defers_to:`, etc.).
- **Assess** an existing KB: audit coverage, find gaps/duplicates, score retrieval
  metadata quality, and produce a prioritized fix list.
- **Iterate**: after a push, test retrieval against real agent questions and shift
  metadata/content based on what under-retrieves.
- **Ship**: map folders, push, and set the correct online sharing/RAG/gating.

Guardrails: never invent facts (derive from body or clearly-sourced research),
never hand-edit plugin-managed keys, never rewrite a finished doc's voice, and
never push KB content without the user's explicit go-ahead.

## The Metadata Contract (what TPSReport actually reads)

The plugin extracts these frontmatter keys for retrieval (`RAG_FM_KEYS` in
[`main.js`](https://github.com/augmentableai/tpsreport-obsidian-sync/blob/main/main.js)). **Target exactly these names** — a
synonym in the wrong key is ignored.

| Key | Type | Purpose |
|-----|------|---------|
| `summary` | string | Dense 2-3 sentence abstract with concrete nouns/numbers. Primary retrieval signal. |
| `keywords` | list | Exact terms/phrases a user would search. Include synonyms, acronyms, product names, numbers. |
| `intents` | list | What jobs this doc answers (snake_case verbs/nouns), e.g. `compare_networks`, `payout_lookup`. |
| `hyde_questions` | list | 4-8 natural questions this doc fully answers (HyDE-style; boosts question->doc matching). |
| `retrieval_hint` | string | Router instruction: when to use AND when NOT to use this doc. Keep the "Do NOT use for..." clause. |
| `scenarios` | list | Concrete situations/personas, e.g. `beginner choosing first network`, `paid-traffic operator picking high-EPC offers`. |
| `canonical_for` | list | Topics this doc is the single source of truth for. Prevents duplicate-answer ambiguity. |
| `defers_to` | map | `aspect: target-file-slug` — delegate sub-topics to the canonical doc. |
| `lifecycle_position` | int | Reading order within a learning path (1 = foundational). |
| `prerequisites` | list | Slugs the reader should know first. |
| `unlocks` | list | Slugs that become useful after this one. |
| `entities` | list | Named things (orgs, people, tools, standards). |
| `topics` | list | Broad subject areas (coarser than keywords). |
| `brands` | list | Brand/product brand names mentioned. |
| `product_skus` | list | Concrete SKUs/IDs (only if the KB is product/catalog oriented). |
| `product_categories` | list | Category taxonomy values. |
| `region` | string/list | Geographic scope, e.g. `US`, `global`. |
| `audience` | string/list | Who the doc is for. |
| `metadata_canary` | string | Optional sentinel token to verify metadata round-trips through indexing. |

**Structural/bookkeeping keys** already used by this KB — keep and respect them,
do not overwrite the plugin-managed ones:

- Author-owned: `title`, `description`, `date`, `topic`, `see_also`
  (list of `{file, reason}`).
- Plugin-managed (NEVER hand-edit): `node_id`, `sync_status`, `last_synced`,
  `tps_content_hash`.

> Picking keys: every doc gets the **core set** — `summary`, `keywords`, `tags`,
> `intents`, `hyde_questions`, `retrieval_hint`, `scenarios`. Add
> `entities`/`topics`/`brands` when named things appear. Add
> `product_skus`/`product_categories` ONLY for catalog/product KBs. Add
> `lifecycle_position`/`prerequisites`/`unlocks`/`canonical_for`/`defers_to`
> when the KB has a learning path or overlapping docs (this affiliate KB does).

## Extensibility — core vs. per-KB custom fields

The contract is **two layers**, so any subject matter is supported without code
changes:

1. **Platform core** (fixed): the keys above are exactly what TPSReport retrieval
   reads. Identical for every KB; you never add subject fields here.
2. **Per-KB custom fields** (extensible): a KB declares its own fields in its
   `00_CONTEXT.md` frontmatter under `kb_schema:`. Example — a movies KB:

```yaml
# Movies KB → 00_CONTEXT.md
kb_schema:
  year_of_release: { type: int,  required: true }
  director:        { type: str,  required: true }
  genre:           { type: list, required: false }
```

The linter and the plugin Gatekeeper both load `kb_schema` automatically:
declared keys are treated as known (no `UNKNOWN_KEY`), each is type-checked
(`WRONG_TYPE`), and `required: true` ones are enforced on every content doc
(`CUSTOM_REQUIRED_MISSING`). The schema travels with the KB through sync — clients
control their own fields by editing `00_CONTEXT`, no central registry or rebuild.

## Where validation runs (and who needs Python)

Three audiences, one shared rule set ([references/metadata-contract.yaml](references/metadata-contract.yaml)):

| Audience | Tool | Python? |
|----------|------|---------|
| **Authoring agent** (this skill, in Cursor/SDK with shell) | [scripts/kb_lint.py](scripts/kb_lint.py) | Yes — dev/CI only, never shipped to clients |
| **End client** (installs the Obsidian plugin) | the plugin **Gatekeeper** (JS, in-plugin) | No |
| **Server of record** (optional, strongest gate) | backend `/validate` on push | runs on the server, not the client |

[scripts/kb_lint.py](scripts/kb_lint.py) is the agent's in-loop checker — clients never run it. The plugin
Gatekeeper is the JS port of the same rules for humans (with one-click auto-fix
for `DOUBLE_FRONTMATTER`). Both scope to **KB-managed files only** (the python
linter skips notes outside KB context folders; the plugin only checks files under
mapped report folders) — a client's personal/daily notes are never touched.

## The Guidance Contract (the "guidance -> content" layer)

The plugin reads a **second** frontmatter layer (`GUIDANCE_FM_KEYS` in `main.js`)
that drives content generation BEFORE retrieval metadata exists. This is how you
"seed" a report: write the guidance, let it produce a body, then enrich. These
keys also round-trip through sync (they are part of the metadata fingerprint), so
the guidance lives with the node online.

| Key | Type | Purpose |
|-----|------|---------|
| `research_brief` | string | The assignment: what this report must cover, angle, scope, and the question it answers for an agent. |
| `research_notes` | string/list | Raw findings, facts, stats, sources gathered for the body. The factual substrate. |
| `source_materials` | list | URLs / citations / file refs the body is built from (keeps facts traceable). |
| `content_structure` | string/list | The intended section outline / headings the body should follow. |
| `llm_instructions` | string | Voice, tone, do/don't, formatting rules for the generator (mirror the KB's `00_CONTEXT` voice). |
| `model_preferences` | map/string | Optional model/temperature hints for generation. |

Companion classifier keys the plugin also fingerprints: `index_type`,
`guidance_type`. Use them to mark a node's role (e.g. content vs. guidance-only).

> Seeding rule: a new report begins as **guidance-only** (these keys filled,
> body thin or a stub). Generation turns guidance into a body. Enrichment then
> adds the RAG layer. The guidance keys stay — they document provenance and let
> you regenerate/iterate later without re-researching from scratch.

## The KB Lifecycle (six phases)

```
Phase 0  Scope & assess        (understand KB; audit existing reports)
Phase 1  Seed                  (guidance-first: research_brief + structure)
Phase 2  Generate content      (guidance -> body, in the KB's voice)
Phase 3  Enrich RAG metadata   (the contract above; the old core workflow)
Phase 4  Validate              (YAML + quality bar + cross-refs)
Phase 5  Build -> Push -> Gate (map folders, sync, set sharing/RAG/visibility)
Phase 6  Test & Iterate        (ask agent Qs; fix under-retrieval; loop to 1/3)
```

Phases 1-3 apply per new report; Phase 0 and 6 operate on the whole KB. Existing
KBs usually enter at Phase 0 (assess) then jump to Phase 3 (enrich) or Phase 6
(test). The loop never really ends — that is the "constantly shift, test, iterate"
goal.

## Workflow

### Phase 0 — Scope & Assess the vault

**Scope (always):**

1. List the target folder (your Obsidian vault KB root).
2. Read `00_CONTEXT.md` (or the KB's context/index doc) to learn the KB's
   **topic, audience, voice, and glossary**. All work must stay consistent with it.
3. Read any `_TEMPLATE` file — it declares the intended frontmatter shape and the
   `retrieval_hint` pattern to mirror.
4. Build a file inventory and group by section (e.g. `01_Landscape`,
   `02_Network_Profiles`, `03_Niche_Playbooks`). Files in the same section share
   metadata conventions.

**Assess existing reports (when entering an existing KB):** produce a concise
audit before touching anything:

- **Coverage map:** which topics/sections exist vs. which agent questions have no
  home doc (gaps -> Phase 1 seed candidates).
- **Duplication/overlap:** docs answering the same question -> assign one
  `canonical_for` and make the others `defers_to` it.
- **Metadata health (machine-checkable):** grep for empty core keys
  (`hyde_questions: $`, `keywords: $`, etc.) and malformed YAML (e.g. unindented
  `defers_to:` children). Score each file: `complete | partial | empty`.
- **Staleness:** numbers/facts that look dated vs. the KB's `date`/intent.
- Output a **prioritized fix list** (which files need Phase 3 enrich, which need
  Phase 1/2 net-new). Confirm scope with the user before bulk edits.

### Phase 1 — Seed (guidance-first) — *new reports only*

When a gap needs a brand-new report, create it **guidance-first** so the body has
a spec to grow into:

1. Create the file in the right section folder, with `title`, `description`,
   `date`, `topic` and a `# Heading`.
2. Fill the **Guidance Contract** keys: `research_brief` (the assignment + the
   agent question it answers), `content_structure` (section outline),
   `source_materials` (URLs/refs), and `llm_instructions` (mirror the KB voice).
3. Optionally set `guidance_type`/`index_type` to mark it as guidance-only until
   the body exists. Body can be a stub at this stage.

### Phase 2 — Generate content from guidance — *new/thin reports*

Turn guidance into a body in the KB's voice:

1. Gather facts into `research_notes` (cite into `source_materials`). Research only
   what the brief needs; keep it verifiable.
2. Draft the body following `content_structure`, obeying `llm_instructions` and the
   `00_CONTEXT` voice (this KB is deliberately blunt and tactical — match it).
3. Keep facts traceable to `source_materials`. Never invent numbers.
4. Leave the guidance keys in place — they are the provenance + regeneration spec.

### Phase 3 — Enrich RAG metadata (the core loop)

For each finished/finishing doc:

1. Read the **full body**, classify the doc type (*foundational concept*, *entity
   profile*, *niche/strategy playbook*, *glossary/context*) — type decides optional
   keys and `lifecycle_position`.
2. Note concrete nouns (entities, brands, numbers, jargon) -> `keywords`/`entities`/`brands`.
3. Light body polish ONLY if thin/placeholder — preserve voice, never restructure
   a finished doc.
4. Author the frontmatter. Rules that make retrieval actually better:
   - **`summary`**: 2-3 sentences, front-load distinctive facts/numbers; standalone.
   - **`keywords`**: 8-20 entries; obvious term AND variants (acronym + expansion,
     brand + product, "30-day cookie" + "cookie duration").
   - **`hyde_questions`**: real user phrasings, mix short and long (4-8).
   - **`intents`**: snake_case, reused across the KB (shared vocabulary).
   - **`retrieval_hint`**: ALWAYS include the negative clause ("Do NOT use for ...")
     to stop over-retrieval.
   - **`see_also`/`defers_to`/`unlocks`/`prerequisites`**: use the **file slug**
     (filename without `.md`), matching the KB's `[[slug]]` wikilinks.
   - Valid YAML: block sequences, quote special-char strings, 2-space indentation.
     Leave plugin-managed keys untouched.

### Phase 4 — Validate (run the linter; do not self-grade)

**The `Quality Bar` below is enforced by a script, not by your own judgement.**
LLMs pass their own checklists even when the output is wrong (a BOM-hidden second
`---` block once bled raw YAML onto a live page). So Phase 4 is mechanical:

1. Run the deterministic linter against the KB folder:

```bash
python scripts/kb_lint.py <kb-folder>
```

2. **Fix every `error`** (DOUBLE_FRONTMATTER, YAML_PARSE_ERROR, BROKEN_XREF,
   DUP_CANONICAL, WRONG_TYPE). Address `warning`s (missing core keys, list
   lengths, missing `retrieval_hint` negative clause, BOM).
3. **Re-run until it exits `0`.** Do not tell the user the KB is done while the
   linter is red. Use `--json` to consume findings programmatically, `--strict`
   to also fail on warnings, `--quiet` to hide info.

The linter reads [references/metadata-contract.yaml](references/metadata-contract.yaml) (the single source of truth for valid
metadata). The Obsidian plugin's **Gatekeeper** (`Run gatekeeper health check`)
enforces the same rules at the sync boundary — so a clean linter locally should
mean a clean Gatekeeper before push. Optionally set a shared `metadata_canary`
across the batch to confirm online that the metadata indexed.

### Phase 5 — Build -> Push -> Gate

The user pushes via the Obsidian plugin (backend URL is fixed in production and
hidden; only the `obs_` API key is configured):

1. Map the folder once (`Set mapping for current folder`).
2. Run `Sync active report (push and delete sync)` (or `Sync all mapped reports`).
3. **Gate / visibility:** set the report's sharing preset (Private / Team /
   Agency / Public) and **Knowledge Base (RAG) enabled** toggle so the right
   TPSReport agents can retrieve it. RAG-on is what makes the doc queryable
   by agents; sharing preset controls who/which workspace sees it online.
4. Open the rendered report in TPSReport and confirm summary/keywords/questions
   surface.

> Never push without the user's explicit go-ahead. The push is destructive
> (push-and-delete-sync reconciles remote to local).

### Phase 6 — Test & Iterate (the never-ending loop)

After a push, treat the KB as a system to tune for the agents that query it:

1. **Build a question set** from real agent use — reuse each doc's
   `hyde_questions` plus questions the Phase 0 coverage map flagged as gaps.
2. **Probe retrieval:** ask those questions against the agent / RAG endpoint and
   record which doc was retrieved (or that none was).
3. **Diagnose misses:**
   - Under-retrieved doc -> weak `summary`/`keywords`/`hyde_questions` (Phase 3).
   - Wrong doc retrieved -> missing/loose `retrieval_hint` negative clause, or
     missing `canonical_for`/`defers_to` (Phase 3).
   - No doc at all -> genuine gap -> Phase 1 seed a new report.
   - Stale/incorrect answer -> body fact issue -> Phase 2 regenerate from guidance.
4. **Shift, re-validate (Phase 4), re-push (Phase 5), re-test.** Keep a short
   running note of what changed and what to test next so iterations compound.

This closes the loop: build -> push -> measure against agent questions -> shift ->
repeat, which is the "seamless build, local push, online capability" goal.

## Examples & quality bar

- **Frontmatter examples:** [references/EXAMPLES.md](references/EXAMPLES.md)
- **Quality checklist:** [references/QUALITY_BAR.md](references/QUALITY_BAR.md)
- **Agent prompt template:** [references/KB_AGENT_PROMPT.md](references/KB_AGENT_PROMPT.md)

## Anti-Patterns

- Renaming keys to synonyms TPSReport doesn't read (e.g. `questions` instead of
  `hyde_questions`, `tldr` instead of `summary`).
- Generic keywords ("affiliate", "marketing") that match everything and rank
  nothing — prefer distinctive terms.
- Omitting the negative clause in `retrieval_hint` (causes over-retrieval).
- Stuffing `product_skus`/`product_categories` into a non-catalog KB.
- Editing `tps_content_hash`/`node_id` (breaks ID-first reconciliation on sync).
- Generating a body with no `research_brief`/`source_materials` (un-traceable
  facts; can't regenerate or iterate later).
- Pushing before validating, or pushing without the user's go-ahead (push is a
  destructive reconcile).
- Enriching once and never testing retrieval — the KB only gets good by looping
  Phase 6 against real agent questions.

## Serving TPSReport agents (why this loop exists)

The KB's job is to answer the questions TPSReport agents actually ask at runtime.
That reframes every phase:

- **Guidance + content (1-2)** decide whether an answer *exists*.
- **RAG metadata (3)** decides whether the agent can *find* it.
- **Gating (5)** decides *which* agents/plans/workspaces may retrieve it (RAG
  toggle + sharing preset).
- **Test & iterate (6)** decides whether it's *actually good* — measured against
  the agents' real questions, not our assumptions.

Start from the agent's questions, work backward to the docs and metadata that
serve them, and keep looping. A doc that no agent question retrieves is either
mis-tagged (Phase 3) or shouldn't exist; a question with no doc is a Phase 1 seed.
