# KB Lifecycle Manager (TPSReport / Obsidian)

Agent skill for building **retrieval-tuned Obsidian knowledge bases** synced with [TPSReport](https://tpsreport.pro) via the [community Obsidian plugin](https://community.obsidian.md/plugins/tpsreport-sync).

## Files in this folder

| File | Required | Purpose |
|------|----------|---------|
| `SKILL.md` | Yes | Agent instructions — lifecycle phases, metadata rules |
| `metadata-contract.yaml` | Yes for lint | Key contract synced with plugin Gatekeeper |
| `kb_lint.py` | Yes for Phase 4 | Validates a KB folder; exit 0 = ready to push |
| `KB_AGENT_PROMPT.md` | Optional | Copy-paste prompt for any agent |

The YAML is a **separate file** on purpose — `kb_lint.py` and the plugin Gatekeeper both read it; it is not embedded in `SKILL.md`.

## Install

**Cursor (project):** copy this folder to `.cursor/skills/kb-metadata-enrichment/`

**From GitHub:**

```bash
git clone https://github.com/augmentableai/tpsreport-obsidian-sync.git
cp -r tpsreport-obsidian-sync/skills/kb-metadata-enrichment .cursor/skills/
```

## Validate a KB

```bash
python .cursor/skills/kb-metadata-enrichment/kb_lint.py path/to/Your_KB_Folder/
```

Requires Python 3.9+ and `pip install pyyaml`.

## Plugin source of truth

Frontmatter keys and sync behaviour: [`main.js`](../../main.js) in this repo (`RAG_FM_KEYS`, Gatekeeper).

## License

MIT — same as parent [tpsreport-obsidian-sync](https://github.com/augmentableai/tpsreport-obsidian-sync) repository.
