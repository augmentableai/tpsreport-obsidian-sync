# TPSReport — Obsidian Plugin

**Sync local research folders to [TPSReport](https://tpsreport.pro) — graph-native AI knowledge management built for teams, agents, and retrieval.**

[![TPSReport](https://img.shields.io/badge/Product-tpsreport.pro-2563eb?style=for-the-badge)](https://tpsreport.pro)
[![Obsidian community plugin](https://img.shields.io/badge/Obsidian-Community%20Plugin-7c3aed?style=for-the-badge)](https://community.obsidian.md/plugins/tpsreport-sync)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.2.2-blue?style=for-the-badge)](https://github.com/augmentableai/tpsreport-obsidian-sync/releases)

> **Official Obsidian companion for [TPSReport AI Brain & Knowledge Management](https://tpsreport.pro).**  
> Write in your vault. Publish structured knowledge reports. Sync Markdown, metadata, and images to a cloud workspace built for Graph RAG, access control, and agent-ready retrieval.

**Publisher:** [Augmentable LLC](https://tpsreport.pro)  
**Home:** [tpsreport.pro](https://tpsreport.pro) · **Privacy:** [tpsreport.pro/privacy](https://tpsreport.pro/privacy) · **Terms:** [tpsreport.pro/terms](https://tpsreport.pro/terms)

---

## What is TPSReport?

**[TPSReport](https://tpsreport.pro)** turns scattered notes and research into **graph-structured intelligence** — not just files in a folder, but connected knowledge that AI agents and humans can navigate.

Most tools treat knowledge as isolated documents. TPSReport helps you **curate, codify, and connect** expertise into reports and collections optimized for:

- **Graph RAG** — vector search plus explicit relationships, categories, and metadata  
- **Knowledge operations** — freshness, staleness alerts, and usage-aware maintenance  
- **Multi-scope collections** — personal research, team wikis, and org-wide knowledge bases  
- **Rendered reports** — publish, share, and control access from your [TPSReport workspace](https://tpsreport.pro)

**This plugin** is the bridge between **Obsidian** (where you write) and **[TPSReport](https://tpsreport.pro)** (where you manage, index, query, and deliver knowledge at scale).

**→ [Skills & resources hub](skills/README.md)** — agent workflows, install guides, frontmatter examples, [skills.sh](https://skills.sh) listing

→ [Learn more about TPSReport](docs/about-tpsreport.md) · [Use cases](docs/use-cases.md) · [FAQ](docs/faq.md)

---

## Why use this plugin?

| You want to… | TPSReport + Obsidian gives you… |
| --- | --- |
| Publish vault research as structured reports | One-click **Publish as New Report** from any folder |
| Keep local notes and cloud reports in sync | Bidirectional push/pull with stable `node_id` identity |
| Improve AI retrieval quality | Rich YAML frontmatter (`keywords`, `intents`, `entities`, …) synced to Graph RAG |
| Sync images with Markdown | Optional embedded image upload/download |
| Avoid silent overwrites | Conflict detection + reviewable conflict copies |
| Control visibility & destinations | Per-report visibility, edit scope, and account destinations |

---

## Install

### From Obsidian Community Plugins (recommended)

1. Open **Settings → Community plugins → Browse**
2. Search for **TPSReport**
3. Install and enable

**Official listing:** [community.obsidian.md/plugins/tpsreport-sync](https://community.obsidian.md/plugins/tpsreport-sync)

### Manual / beta install

Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/augmentableai/tpsreport-obsidian-sync/releases/latest).

Requires a free **[TPSReport account](https://tpsreport.pro)** and an API key (`obs_...`) from your dashboard.

---

## Quick start

1. **Sign up** at **[tpsreport.pro](https://tpsreport.pro)**
2. **Generate an API key** in your TPSReport dashboard (`obs_...`)
3. In Obsidian: **Settings → TPSReport** → paste key → **Test Connection**
4. Right-click a vault folder → **Publish as New Report**
5. Push, pull, and manage sync from the command palette or folder menu

---

## Features

- Publish Obsidian folders as **TPSReport knowledge reports**
- Sync Markdown, nested folders, frontmatter, and local images
- Pull cloud updates back into mapped vault folders
- Preserve stable **`node_id`** frontmatter for ID-first reconciliation
- Detect conflicts; create conflict copies instead of silent data loss
- Choose account-enabled **report destinations**
- Optionally enable **RAG indexing** for report content in your [TPSReport knowledge base](https://tpsreport.pro)

AI generation, indexing, rendered report hosting, and access control run in your **[TPSReport cloud workspace](https://tpsreport.pro)** — this plugin handles **local ↔ cloud synchronization**.

---

## Configuration

Open **Settings → TPSReport** in Obsidian:

| Setting | Details |
| --- | --- |
| **TPSReport API Key** | Your `obs_...` key. Stored locally in plugin data. |
| **Frontmatter ID field** | Stable identity field (recommended: `node_id`). |
| **Default report settings** | Visibility, edit scope, content format, RAG, destination defaults. |
| **Image sync** | Upload embedded images on push; download on pull. |
| **Folder mapping** | Map vault folders to cloud TPSReport reports. |

---

## Frontmatter for better retrieval

Add YAML properties to improve Graph RAG accuracy in [TPSReport](https://tpsreport.pro):

```yaml
---
summary: Short retrieval-friendly summary of this note.
keywords: [product-name, category, region]
tags: [research, catalog]
intents: [product_lookup, business_recommendation]
entities: [Brand Name, Product SKU]
retrieval_hint: One sentence a search agent should match on.
---
```

Supported fields include `summary`, `keywords`, `tags`, `intents`, `scenarios`, `entities`, `topics`, `brands`, `product_skus`, `audience`, `region`, and more.

---

## KB authoring skills & resources

**Full skills hub:** [`skills/`](skills/) — install guides, workflow, examples, directory listings.

| Resource | Link |
| --- | --- |
| **Skills hub** | [skills/README.md](skills/README.md) |
| **Install guide** | [skills/INSTALL.md](skills/INSTALL.md) |
| **Workflow** | [skills/WORKFLOW.md](skills/WORKFLOW.md) |
| **Examples** | [skills/examples/](skills/examples/) |
| **KB Lifecycle skill** | [kb-metadata-enrichment/](kb-metadata-enrichment/) |
| **Agent prompt template** | [kb-metadata-enrichment/KB_AGENT_PROMPT.md](kb-metadata-enrichment/KB_AGENT_PROMPT.md) |
| **List on skills.sh** | [skills/DIRECTORIES.md](skills/DIRECTORIES.md) |

```bash
# Install skill (Cursor)
cp -r kb-metadata-enrichment .cursor/skills/

# Or via skills.sh
npx skills add augmentableai/tpsreport-obsidian-sync --skill kb-metadata-enrichment -y
```

The skill covers seed → write → RAG metadata → lint → push. The linter shares the same frontmatter contract as the plugin **Gatekeeper**.

---

## Privacy & data handling

- **No vault content is sent** until you configure an API key and explicitly publish, push, or pull.
- API keys are stored **locally** in Obsidian and sent only to the TPSReport API.
- Synced content is governed by your report visibility settings in [TPSReport](https://tpsreport.pro).

Full policy: **[tpsreport.pro/privacy](https://tpsreport.pro/privacy)** · Terms: **[tpsreport.pro/terms](https://tpsreport.pro/terms)**

---

## Links

| Resource | URL |
| --- | --- |
| **TPSReport home** | [tpsreport.pro](https://tpsreport.pro) |
| **What is TPSReport?** | [docs/about-tpsreport.md](docs/about-tpsreport.md) |
| **Use cases** | [docs/use-cases.md](docs/use-cases.md) |
| **FAQ** | [docs/faq.md](docs/faq.md) |
| **Plugin releases** | [GitHub Releases](https://github.com/augmentableai/tpsreport-obsidian-sync/releases) |
| **Obsidian listing (official)** | [community.obsidian.md/plugins/tpsreport-sync](https://community.obsidian.md/plugins/tpsreport-sync) |
| **KB authoring skills** | [skills/](skills/) |
| **skills.sh install** | `npx skills add augmentableai/tpsreport-obsidian-sync --skill kb-metadata-enrichment -y` |
| **Privacy** | [tpsreport.pro/privacy](https://tpsreport.pro/privacy) |
| **Terms** | [tpsreport.pro/terms](https://tpsreport.pro/terms) |
| **Support** | [arvind@augmentable.ai](mailto:arvind@augmentable.ai) |

---

## Keywords

Obsidian plugin · knowledge management · research sync · Markdown sync · Graph RAG · AI knowledge base · institutional knowledge · note publishing · vault sync · TPSReport · [tpsreport.pro](https://tpsreport.pro) · Augmentable LLC

---

## License

MIT — see [LICENSE](LICENSE).

**Current version:** `1.2.2` · Updates ship via [GitHub releases](https://github.com/augmentableai/tpsreport-obsidian-sync/releases) tagged to match `manifest.json`.
