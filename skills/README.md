# TPSReport Skills & Resources

**Write in Obsidian. Enrich with agents. Sync to Graph RAG.**

This folder is the **skills and resources hub** for the [TPSReport Obsidian plugin](https://community.obsidian.md/plugins/tpsreport-sync). One repo ships the plugin, the agent workflows, examples, and install guides — so teams can go from vault notes to agent-ready knowledge bases without hunting across repos.

| | |
|---|---|
| **Product** | [tpsreport.pro](https://tpsreport.pro) |
| **Obsidian plugin (official)** | [community.obsidian.md/plugins/tpsreport-sync](https://community.obsidian.md/plugins/tpsreport-sync) |
| **Plugin source** | [github.com/augmentableai/tpsreport-obsidian-sync](https://github.com/augmentableai/tpsreport-obsidian-sync) |
| **Skills directory** | [skills.sh](https://skills.sh) · [agentskill.sh](https://agentskill.sh) *(submit links below)* |

---

## What you get

```text
Obsidian vault  →  Agent skill (author + lint)  →  TPSReport plugin (push)  →  Graph RAG + rendered reports
```

| Layer | What it does | Where |
|-------|--------------|-------|
| **Obsidian plugin** | Publish, push/pull, Gatekeeper, image sync, conflict copies | Repo root · [Install from Obsidian](https://community.obsidian.md/plugins/tpsreport-sync) |
| **TPSReport KB skill** | Seed → write → RAG metadata → lint → ship workflow for agents | [`../tpsreport-skill/`](../tpsreport-skill/) |
| **`kb_lint.py`** | Validates frontmatter against the same contract as Gatekeeper | [`../tpsreport-skill/kb_lint.py`](../tpsreport-skill/kb_lint.py) |
| **Examples** | Folder anatomy, frontmatter templates, `kb_schema` patterns | [`examples/`](examples/) |

---

## Available skills

| Skill | Install path | Best for |
|-------|--------------|----------|
| **[TPSReport Skill](../tpsreport-skill/)** | `tpsreport-skill/` (repo root) | Building retrieval-tuned Obsidian KBs for TPSReport Graph RAG |

More skills will be added to this folder as we publish them. Each skill is a self-contained directory with `SKILL.md`, optional tooling, and examples.

---

## Quick install

### Obsidian plugin (required for sync)

1. [Open the official listing](https://community.obsidian.md/plugins/tpsreport-sync) → **Add to Obsidian**
2. Or: **Settings → Community plugins → Browse** → search **TPSReport**
3. Paste your `obs_…` API key from [tpsreport.pro](https://tpsreport.pro) → **Test Connection**

### TPSReport KB skill (Cursor / agents)

**Option A — copy from this repo**

```bash
git clone https://github.com/augmentableai/tpsreport-obsidian-sync.git
cp -r tpsreport-obsidian-sync/tpsreport-skill .cursor/skills/
pip install pyyaml
```

**Option B — skills.sh / npx**

```bash
npx skills add augmentableai/tpsreport-obsidian-sync --skill tpsreport-skill -y
```

**Option C — direct URL (any agent that reads SKILL.md)**

```
https://github.com/augmentableai/tpsreport-obsidian-sync/blob/main/tpsreport-skill/SKILL.md
```

→ Full platform-by-platform guide: **[INSTALL.md](INSTALL.md)**

---

## Validate a knowledge base

```bash
python .cursor/tpsreport-skill/kb_lint.py path/to/Your_KB_Folder/
```

Exit code **0** = frontmatter matches the TPSReport contract. The plugin **Gatekeeper** enforces the same rules at push time (no Python required in Obsidian).

---

## Documentation map

| Doc | Description |
|-----|-------------|
| **[INSTALL.md](INSTALL.md)** | Cursor, Claude Code, Codex, skills.sh, personal vs project skills |
| **[WORKFLOW.md](WORKFLOW.md)** | End-to-end lifecycle: seed → lint → push → test retrieval |
| **[examples/](examples/)** | Frontmatter samples, folder structure, `kb_schema` patterns |
| **[DIRECTORIES.md](DIRECTORIES.md)** | Where to list the skill (skills.sh, agentskill.sh, GitHub topics) |
| **[tpsreport-skill/SKILL.md](../tpsreport-skill/SKILL.md)** | Full agent instructions (metadata contract, phases, quality bar) |
| **[tpsreport-skill/KB_AGENT_PROMPT.md](../tpsreport-skill/KB_AGENT_PROMPT.md)** | Copy-paste prompt for any agent |

Plugin docs (repo root): [README](../README.md) · [About TPSReport](../docs/about-tpsreport.md) · [Use cases](../docs/use-cases.md) · [FAQ](../docs/faq.md)

---

## Who this is for

- **Research teams** publishing Obsidian folders as structured TPSReport reports
- **AI / agent builders** who need Graph RAG metadata that actually routes queries
- **Cursor / Claude Code users** automating KB authoring with a repeatable lifecycle skill
- **Support & ops teams** maintaining wikis with freshness, conflict detection, and stable `node_id` sync

---

## The stack in 60 seconds

1. **Sign up** at [tpsreport.pro](https://tpsreport.pro) and generate an `obs_…` API key
2. **Install** the [Obsidian plugin](https://community.obsidian.md/plugins/tpsreport-sync)
3. **Install** the [TPSReport KB skill](tpsreport-skill/) into `.cursor/skills/`
4. **Author** a KB folder in Obsidian (see [examples/folder-structure.md](examples/folder-structure.md))
5. **Lint** with `kb_lint.py` until exit 0
6. **Publish** the folder → **Push to TPS** → enable RAG in report settings
7. **Test** agent retrieval with probe questions from your `hyde_questions` fields

---

## Support & links

| | |
|---|---|
| Email | [arvind@augmentable.ai](mailto:arvind@augmentable.ai) |
| Privacy | [tpsreport.pro/privacy](https://tpsreport.pro/privacy) |
| Terms | [tpsreport.pro/terms](https://tpsreport.pro/terms) |
| License | MIT — see [LICENSE](../LICENSE) |

**Publisher:** Augmentable LLC
