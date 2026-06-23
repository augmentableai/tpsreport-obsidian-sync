# TPSReport Skills & Resources

[![skills.sh](https://skills.sh/b/augmentableai/skills)](https://skills.sh/augmentableai/skills)

**TPSReport by [Augmentable.ai](https://augmentable.ai)** — agent workflows for the [TPSReport Obsidian plugin](https://community.obsidian.md/plugins/tpsreport-sync).

| | |
|---|---|
| **Product** | [tpsreport.pro](https://tpsreport.pro) |
| **Obsidian plugin (official)** | [community.obsidian.md/plugins/tpsreport-sync](https://community.obsidian.md/plugins/tpsreport-sync) |
| **Plugin source** | [github.com/augmentableai/tpsreport-obsidian-sync](https://github.com/augmentableai/tpsreport-obsidian-sync) |
| **Canonical skills repo** | [github.com/augmentableai/skills](https://github.com/augmentableai/skills) |

---

## What you get

```text
Obsidian vault  →  Agent skill (author + lint)  →  TPSReport plugin (push)  →  Graph RAG + rendered reports
```

| Layer | What it does | Where |
|-------|--------------|-------|
| **Obsidian plugin** | Publish, push/pull, Gatekeeper, image sync, conflict copies | Plugin repo · [Install from Obsidian](https://community.obsidian.md/plugins/tpsreport-sync) |
| **TPSReport KB skill** | Seed → write → RAG metadata → lint → ship workflow for agents | [`augmentableai/skills`](https://github.com/augmentableai/skills/tree/main/skills/tpsreport-knowledge-base-generation) |
| **`kb_lint.py`** | Validates frontmatter against the same contract as Gatekeeper | [references/kb_lint.py](https://github.com/augmentableai/skills/blob/main/skills/tpsreport-knowledge-base-generation/references/kb_lint.py) |
| **Examples** | Folder anatomy, frontmatter templates, `kb_schema` patterns | [examples/](examples/) |

---

## Available skills

Skills live in the **[augmentableai/skills](https://github.com/augmentableai/skills)** repo under `skills/{name}/`:

| Skill | Path | Best for |
|-------|------|----------|
| **TPSReport KB generation** | `skills/tpsreport-knowledge-base-generation/` | Building retrieval-tuned Obsidian KBs for TPSReport Graph RAG |

More skills will be added to that repo as we publish them. Each skill is a self-contained directory with `SKILL.md`, optional tooling, and references.

---

## Quick install

### Obsidian plugin (required for sync)

1. [Open the official listing](https://community.obsidian.md/plugins/tpsreport-sync) → **Add to Obsidian**
2. Or: **Settings → Community plugins → Browse** → search **TPSReport**
3. Paste your `obs_…` API key from [tpsreport.pro](https://tpsreport.pro) → **Test Connection**

### TPSReport KB skill (Cursor / agents)

**Recommended — npx / skills.sh**

```bash
npx skills add augmentableai/skills --skill tpsreport-knowledge-base-generation -y
pip install pyyaml
```

**Direct URL (any agent that reads SKILL.md)**

```
https://github.com/augmentableai/skills/blob/main/skills/tpsreport-knowledge-base-generation/SKILL.md
```

→ Full platform-by-platform guide: **[INSTALL.md](INSTALL.md)**

---

## Validate a knowledge base

```bash
python .cursor/skills/tpsreport-knowledge-base-generation/references/kb_lint.py path/to/Your_KB_Folder/
```

Exit code **0** = frontmatter matches the TPSReport contract. The plugin **Gatekeeper** enforces the same rules at push time (no Python required in Obsidian).

---

## Documentation map

| Doc | Description |
|-----|-------------|
| **[INSTALL.md](INSTALL.md)** | Cursor, Claude Code, Codex, skills.sh, personal vs project skills |
| **[WORKFLOW.md](WORKFLOW.md)** | End-to-end lifecycle: seed → lint → push → test retrieval |
| **[examples/](examples/)** | Frontmatter samples, folder structure, `kb_schema` patterns |
| **[DIRECTORIES.md](DIRECTORIES.md)** | Where to list the skill (skills.sh, GitHub topics) |
| **[SKILL.md](https://github.com/augmentableai/skills/blob/main/skills/tpsreport-knowledge-base-generation/SKILL.md)** | Full agent instructions (metadata contract, phases, quality bar) |
| **[KB_AGENT_PROMPT.md](https://github.com/augmentableai/skills/blob/main/skills/tpsreport-knowledge-base-generation/references/KB_AGENT_PROMPT.md)** | Copy-paste prompt for any agent |

Plugin docs: [README](../README.md) · [About TPSReport](../docs/about-tpsreport.md) · [Use cases](../docs/use-cases.md) · [FAQ](../docs/faq.md)

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
3. **Install** the KB skill: `npx skills add augmentableai/skills --skill tpsreport-knowledge-base-generation -y`
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

**Publisher:** Augmentable.ai · **Brand:** TPSReport by Augmentable.ai
