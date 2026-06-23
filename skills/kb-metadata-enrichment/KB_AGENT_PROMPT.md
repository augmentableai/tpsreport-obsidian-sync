# KB Agent Prompt Template

Copy-paste prompt for Cursor, Claude Code, Codex, or any agent that supports project skills.

**Skill location (this repo):** [`skills/kb-metadata-enrichment/`](.)  
**Official plugin listing:** [community.obsidian.md/plugins/tpsreport-sync](https://community.obsidian.md/plugins/tpsreport-sync)

---

## Copy-paste prompt (fill in the `[BRACKETS]`)

```markdown
You are building a TPSReport knowledge base in Obsidian markdown.

## Your job
Create a complete, dense, retrieval-tuned KB for: **[TOPIC / SUBJECT]**
Target audience: **[e.g. software engineers, support agents, dental intake staff]**
Voice/tone: **[e.g. technical practitioner, plain-language professional, blunt tactical]**
Output vault folder: **`[Your_Vault]/[Folder_Name]/`**

## Mandatory: read and follow the skill
1. Read `.cursor/skills/kb-metadata-enrichment/SKILL.md` in full before writing anything.
   (Install from https://github.com/augmentableai/tpsreport-obsidian-sync/tree/main/skills/kb-metadata-enrichment if missing.)
2. Treat `metadata-contract.yaml` in the same folder as the single source of truth for frontmatter keys.
3. Do NOT invent synonym keys (`questions` → use `hyde_questions`; `tldr` → use `summary`).

## Lifecycle — execute all phases unless told otherwise

### Phase 0 — Scope
- Propose a section map (folders + page slugs) and confirm coverage of the main agent questions for this topic.
- Declare `kb_schema` custom fields in `00_CONTEXT.md` if the subject needs typed metadata beyond the platform core.
- Set a shared `metadata_canary: [topic-slug]-kb-[YEAR]`.

### Phase 1–2 — Seed + generate content
- Create `00_CONTEXT.md` first: purpose, voice, kb_schema, document map, routing table, reading order.
- Use numbered section folders: `01_Overview/`, `02_Features/`, `03_Workflows/`, etc.
- Every content page: real prose (dense, not stub bullets), Obsidian-native formatting:
  - `[[wikilinks]]` between pages (slug = filename without `.md`)
  - `> [!tip]` / `> [!note]` / `> [!warning]` callouts
  - `==highlights==` for key terms
  - tables and mermaid diagrams where they clarify structure
- Ground facts in **`source_materials`** URLs — research the web; never invent statistics or pricing. Flag time-sensitive facts with "verify live."
- Do NOT hand-edit plugin-managed keys: `node_id`, `sync_status`, `last_synced`, `tps_content_hash`.

### Phase 3 — RAG metadata (every content page)
Required on each page (exact key names):
- `summary` — 2–3 sentences, standalone, concrete nouns/numbers (≥60 chars)
- `keywords` — 8–20 entries (synonyms, acronyms, product names)
- `tags` — shared vocabulary across the KB
- `intents` — snake_case job verbs reused across files
- `hyde_questions` — 4–8 natural questions this page fully answers
- `retrieval_hint` — MUST include **"Do NOT use for …"** negative clause
- `scenarios` — concrete personas/situations

Add when relevant: `canonical_for`, `defers_to` (values = **file slugs**), `lifecycle_position`, `prerequisites`, `unlocks`, `see_also`, `entities`, `topics`, `brands`, `audience`, `region`.

### Phase 4 — Validate (non-negotiable)
Run until exit code 0:
```bash
python .cursor/skills/kb-metadata-enrichment/kb_lint.py [Your_Vault]/[Folder_Name]/
```
Fix every **error**; address **warnings**. Re-run until clean. Do not declare done while linter is red.

### Phase 5 — Ship (human step — do NOT push without explicit user approval)
Tell the user:
1. Open vault in Obsidian → reload TPSReport plugin
2. Run **Gatekeeper health check**
3. **Publish as New Report** or map folder → **Push to TPS**
4. Enable **RAG** + set sharing preset
5. Verify rendered pages on TPSReport

### Phase 6 — Test (optional unless asked)
Produce 15–20 probe questions from the KB's collective `hyde_questions` for post-push retrieval testing.

## Quality bar
- Aim for **15–25 pages** for a substantial topic (adjust to scope).
- One `00_CONTEXT.md` router; no orphan topics without a home doc.
- No duplicate `canonical_for` topics across files.
- Cross-refs use real slugs that exist in the vault.
- Exactly **one** YAML frontmatter block per file; no BOM; no double `---` blocks.

## Deliverables checklist
- [ ] `00_CONTEXT.md` with kb_schema + full document map
- [ ] All section pages with body + full RAG metadata
- [ ] `kb_lint.py` exit 0
- [ ] Short summary for the user: folder path, page count, push instructions
- [ ] Do NOT git commit or Obsidian-push unless the user explicitly asks

Begin by reading the skill, proposing the section map for **[TOPIC]**, then implement.
```

---

## Quick commands

```bash
# Lint the KB (must exit 0)
python .cursor/skills/kb-metadata-enrichment/kb_lint.py path/to/Your_KB/

# Strict mode (warnings = failure)
python .cursor/skills/kb-metadata-enrichment/kb_lint.py path/to/Your_KB/ --strict

# JSON output for programmatic fix loops
python .cursor/skills/kb-metadata-enrichment/kb_lint.py path/to/Your_KB/ --json
```

---

*Template version: `kb-agent-prompt-v1` · Bundled with [tpsreport-obsidian-sync](https://github.com/augmentableai/tpsreport-obsidian-sync)*
