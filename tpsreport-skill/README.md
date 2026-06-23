# Moved → `augmentableai/skills`

The TPSReport KB generation skill no longer ships as a bundled copy in this plugin repo.

**Canonical repo:** https://github.com/augmentableai/skills  
**Skill path:** `skills/tpsreport-knowledge-base-generation/`

## Install

```bash
npx skills add augmentableai/skills --skill tpsreport-knowledge-base-generation -y
```

## Validate a KB

```bash
python .cursor/skills/tpsreport-knowledge-base-generation/references/kb_lint.py path/to/Your_KB/
```

Plugin docs hub: [skills/README.md](https://github.com/augmentableai/tpsreport-obsidian-sync/blob/main/skills/README.md)
