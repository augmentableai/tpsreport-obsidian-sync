# Install guide — plugin + skills

Step-by-step setup for **TPSReport Obsidian sync** and the **KB Metadata Enrichment** agent skill.

---

## Prerequisites

| Requirement | Why |
|-------------|-----|
| [TPSReport account](https://tpsreport.pro) | Cloud workspace, API key, rendered reports |
| **Obsidian desktop** | Plugin syncs local files and images |
| **API key** (`obs_…`) | From TPSReport dashboard → plugin settings |
| **Python 3.9+** *(optional)* | Only for `kb_lint.py` during authoring — not required in Obsidian |
| **PyYAML** *(optional)* | `pip install pyyaml` for the linter |

---

## Part 1 — Obsidian plugin

### Recommended: Community Plugins

1. Open **[community.obsidian.md/plugins/tpsreport-sync](https://community.obsidian.md/plugins/tpsreport-sync)**
2. Click **Add to Obsidian**, or browse in-app: **Settings → Community plugins → Browse** → **TPSReport**
3. Enable the plugin
4. **Settings → TPSReport** → paste `obs_…` key → **Test Connection**

### Manual / beta install

Download from [GitHub Releases](https://github.com/augmentableai/tpsreport-obsidian-sync/releases/latest):

- `main.js`
- `manifest.json`
- `styles.css`

Copy into your vault: `.obsidian/plugins/tpsreport-sync/`

### BRAT (pre-release builds)

Install [BRAT](https://github.com/TfTHacker/obsidian42-brat) → **Add beta plugin** →

```
https://github.com/augmentableai/tpsreport-obsidian-sync
```

---

## Part 2 — KB Lifecycle skill

The skill lives at **`skills/kb-metadata-enrichment/`** in this repo.

### Cursor — project skill (recommended)

Use when one vault/repo is your KB home:

```bash
# from your vault or monorepo root
mkdir -p .cursor/skills
git clone https://github.com/augmentableai/tpsreport-obsidian-sync.git /tmp/tpsreport-obsidian-sync
cp -r /tmp/tpsreport-obsidian-sync/skills/kb-metadata-enrichment .cursor/skills/
pip install pyyaml
```

Expected layout:

```text
your-vault/
├── My_KB_Folder/
│   ├── 00_CONTEXT.md
│   └── 01_Overview/
└── .cursor/skills/kb-metadata-enrichment/
    ├── SKILL.md
    ├── metadata-contract.yaml
    ├── kb_lint.py
    ├── KB_AGENT_PROMPT.md
    └── README.md
```

Cursor auto-discovers `.cursor/skills/*/SKILL.md`.

### Cursor — personal skill (all projects)

Same folder under:

```text
Windows:  %USERPROFILE%\.cursor\skills\kb-metadata-enrichment\
macOS:    ~/.cursor/skills/kb-metadata-enrichment/
Linux:    ~/.cursor/skills/kb-metadata-enrichment/
```

### skills.sh / npx

```bash
npx skills add augmentableai/tpsreport-obsidian-sync/skills/kb-metadata-enrichment
```

Browse: [skills.sh](https://skills.sh) · Docs: [skills.sh/docs](https://skills.sh/docs)

To publish updates after pushing to GitHub:

```bash
cd skills/kb-metadata-enrichment
npx skills publish
```

### agentskill.sh

Import the whole repo (finds all `SKILL.md` files):

1. Go to [agentskill.sh/submit](https://agentskill.sh/submit)
2. Paste: `https://github.com/augmentableai/tpsreport-obsidian-sync`
3. Connect GitHub for verified badge + auto-sync on push

### Claude Code

```bash
# project-level
mkdir -p .claude/skills
cp -r skills/kb-metadata-enrichment .claude/skills/kb-metadata-enrichment
```

Or install via skills.sh if your Claude Code build supports `npx skills add`.

### Codex / other agents

Point the agent at the raw SKILL.md URL or copy the folder into your project's skills directory. Use **[KB_AGENT_PROMPT.md](kb-metadata-enrichment/KB_AGENT_PROMPT.md)** as a starter prompt.

---

## Part 3 — Verify everything works

### Plugin connection

1. Obsidian → **Settings → TPSReport** → **Test Connection** → success
2. Right-click a test folder → **Publish as New Report** (or map existing report)

### Linter

```bash
python .cursor/skills/kb-metadata-enrichment/kb_lint.py path/to/Your_KB/
```

Fix errors until exit **0**. Warnings are optional unless you pass `--strict`.

### Gatekeeper (in Obsidian)

Command palette → **TPSReport: Gatekeeper health check** on a mapped folder. Should align with `kb_lint.py` results.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `ModuleNotFoundError: yaml` | `pip install pyyaml` |
| Gatekeeper fails but linter passes | Reload plugin; confirm `metadata-contract.yaml` matches plugin version |
| Push 404 on settings | Update plugin to latest [release](https://github.com/augmentableai/tpsreport-obsidian-sync/releases) |
| Skill not picked up in Cursor | Confirm path is `.cursor/skills/kb-metadata-enrichment/SKILL.md` and restart Cursor |
| `npx skills add` not found | Install Node.js; see [skills.sh/docs](https://skills.sh/docs) |

---

## Next steps

- Read **[WORKFLOW.md](WORKFLOW.md)** for the full KB lifecycle
- Copy examples from **[examples/](examples/)**
- Use **[KB_AGENT_PROMPT.md](kb-metadata-enrichment/KB_AGENT_PROMPT.md)** to kick off agent authoring
