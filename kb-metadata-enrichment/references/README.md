# KB Metadata Enrichment

**Agent skill for building retrieval-tuned Obsidian knowledge bases synced with [TPSReport](https://tpsreport.pro).**

Pairs with the official [TPSReport Obsidian plugin](https://community.obsidian.md/plugins/tpsreport-sync).

---

## What's in this folder

| File | Required | Purpose |
|------|----------|---------|
| `SKILL.md` | **Yes** | Full agent instructions — lifecycle phases, metadata rules, quality bar |
| `metadata-contract.yaml` | **Yes** | Machine-readable key contract (shared with plugin Gatekeeper) |
| `kb_lint.py` | **Yes** for Phase 4 | Validates a KB folder; exit 0 = ready to push |
| `KB_AGENT_PROMPT.md` | Optional | Copy-paste prompt for any agent |
| `metadata.json` | Optional | skills.sh / directory metadata |
| `README.md` | Optional | This file |

The YAML contract is **not embedded in SKILL.md** on purpose — `kb_lint.py` and Gatekeeper both read the same file.

---

## Install

### Cursor (project)

```bash
cp -r kb-metadata-enrichment .cursor/skills/
pip install pyyaml
```

### skills.sh / npx

```bash
npx skills add augmentableai/tpsreport-obsidian-sync --skill kb-metadata-enrichment -y
```

→ Full guide: [skills/INSTALL.md](skills/INSTALL.md)

---

## Validate

```bash
python scripts/kb_lint.py path/to/Your_KB/
python scripts/kb_lint.py path/to/Your_KB/ --strict
python scripts/kb_lint.py path/to/Your_KB/ --json
```

Requires Python 3.9+ and `pip install pyyaml`.

---

## Lifecycle (summary)

| Phase | Action |
|-------|--------|
| 0 | Scope — section map, `kb_schema`, `metadata_canary` |
| 1–2 | Write `00_CONTEXT.md` + content pages |
| 3 | Enrich RAG frontmatter on every page |
| 4 | `kb_lint.py` until exit 0 |
| 5 | Human: Gatekeeper → Publish → Push → RAG on |
| 6 | Test retrieval; iterate metadata |

→ Details: [skills/WORKFLOW.md](skills/WORKFLOW.md) · Examples: [skills/examples/](skills/examples/)

---

## Kick off an agent

1. Install this folder to `.cursor/skills/kb-metadata-enrichment/`
2. Open [KB_AGENT_PROMPT.md](KB_AGENT_PROMPT.md)
3. Fill in `[TOPIC]`, `[Folder_Name]`, audience, voice
4. Paste into Cursor / Claude Code

---

## Plugin source of truth

Frontmatter keys and sync behaviour: [main.js](https://github.com/augmentableai/tpsreport-obsidian-sync/blob/main/main.js) (`RAG_FM_KEYS`, Gatekeeper).

When the plugin adds new retrieval keys, update `metadata-contract.yaml` and re-run lint on your KBs.

---

## Directory listings

Submit for discovery: [skills/DIRECTORIES.md](skills/DIRECTORIES.md)

| Directory | Submit |
|-----------|--------|
| [agentskill.sh](https://agentskill.sh/submit) | Repo: `augmentableai/tpsreport-obsidian-sync` or Direct URL: `https://github.com/augmentableai/tpsreport-obsidian-sync/blob/main/kb-metadata-enrichment/SKILL.md` |
| [skills.sh](https://skills.sh) | `npx skills add augmentableai/tpsreport-obsidian-sync --skill kb-metadata-enrichment -y` |

---

## License

MIT — [tpsreport-obsidian-sync](https://github.com/augmentableai/tpsreport-obsidian-sync)
