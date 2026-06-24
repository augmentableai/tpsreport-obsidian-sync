# TPSReport — Obsidian Plugin

**Sync your Obsidian vault to [TPSReport](https://tpsreport.pro) — the optional authoring path for published knowledge bases and agent-ready retrieval.**

[![TPSReport](https://img.shields.io/badge/TPSReport-tpsreport.pro-2563eb?style=for-the-badge)](https://tpsreport.pro)
[![Obsidian community plugin](https://img.shields.io/badge/Obsidian-Community%20Plugin-7c3aed?style=for-the-badge)](https://community.obsidian.md/plugins/tpsreport-sync)
[![skills.sh skill](https://img.shields.io/badge/skills.sh-tpsreport--kb-111?style=for-the-badge)](https://skills.sh/augmentableai/skills)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.2.3-blue?style=for-the-badge)](https://github.com/augmentableai/tpsreport-obsidian-sync/releases)

> **TPSReport by [Augmentable.ai](https://augmentable.ai)** — official Obsidian companion for [TPSReport](https://tpsreport.pro).  
> **Publish** structured knowledge bases · **Power** agentic workflows with metadata-rich retrieval · **Optional:** write in Obsidian and sync to the same KB contract.

**Brand:** TPSReport by [Augmentable.ai](https://augmentable.ai)  
**Home:** [tpsreport.pro](https://tpsreport.pro) · **Plugin downloads:** [tpsreport.pro/downloads](https://tpsreport.pro/downloads) · **Privacy:** [tpsreport.pro/privacy](https://tpsreport.pro/privacy) · **Terms:** [tpsreport.pro/terms](https://tpsreport.pro/terms)

---

## What is TPSReport?

**[TPSReport](https://tpsreport.pro)** is a workflow to **publish knowledge bases** and use them as an **AI brain for agentic execution** — not a note app or a generic chat wrapper.

Two layers:

| Layer | What it does |
| --- | --- |
| **Publish KB** | Codify expertise into linked reports and collections — visibility, gating, monetization |
| **AI brain** | Scoped retrieval with agent-oriented metadata — hybrid graph + vector, routing hints, negative signals |

You can build and ship **100% online**. **Obsidian is optional** — popular for offline vaults, wikilinks, and folder-native authoring.

**This plugin** syncs vault folders into the same published KB and metadata contract:

- Write locally in Obsidian (or edit online and pull back)
- Publish folders as TPS Report collections
- Push/pull markdown, images, and agent-ready frontmatter
- Query and execute against your corpus in [TPSReport](https://tpsreport.pro)

**→ [Install on tpsreport.pro/downloads](https://tpsreport.pro/downloads)** · [Skills & resources hub](https://github.com/augmentableai/tpsreport-obsidian-sync/blob/main/skills/README.md)

→ [Learn more about TPSReport](https://github.com/augmentableai/tpsreport-obsidian-sync/blob/main/docs/about-tpsreport.md) · [Use cases](https://github.com/augmentableai/tpsreport-obsidian-sync/blob/main/docs/use-cases.md) · [FAQ](https://github.com/augmentableai/tpsreport-obsidian-sync/blob/main/docs/faq.md)

---

## Why use this plugin?

| You want to… | TPSReport + Obsidian gives you… |
| --- | --- |
| Publish vault folders as structured KB reports | One-click **Publish as New Report** from any folder |
| Keep vault and cloud in sync | Bidirectional push/pull with stable `node_id` identity |
| Agent-ready retrieval metadata | YAML frontmatter (`hyde_questions`, `retrieval_hint`, `defers_to`, …) synced to Graph RAG |
| Validate before sync | **Gatekeeper** checks the metadata contract |
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

[![skills.sh](https://skills.sh/b/augmentableai/skills)](https://skills.sh/augmentableai/skills)

**TPSReport KB generation skill** by Augmentable.ai — [`augmentableai/skills`](https://github.com/augmentableai/skills)

| Resource | Link |
| --- | --- |
| **Skills hub** | [skills/README.md](https://github.com/augmentableai/tpsreport-obsidian-sync/blob/main/skills/README.md) |
| **Install guide** | [skills/INSTALL.md](https://github.com/augmentableai/tpsreport-obsidian-sync/blob/main/skills/INSTALL.md) |
| **Workflow** | [skills/WORKFLOW.md](https://github.com/augmentableai/tpsreport-obsidian-sync/blob/main/skills/WORKFLOW.md) |
| **Examples** | [skills/examples/](https://github.com/augmentableai/tpsreport-obsidian-sync/tree/main/skills/examples) |
| **Canonical skill (SKILL.md)** | [tpsreport-knowledge-base-generation](https://github.com/augmentableai/skills/tree/main/skills/tpsreport-knowledge-base-generation) |
| **Agent prompt template** | [KB_AGENT_PROMPT.md](https://github.com/augmentableai/skills/blob/main/skills/tpsreport-knowledge-base-generation/references/KB_AGENT_PROMPT.md) |
| **Directory listing guide** | [skills/DIRECTORIES.md](https://github.com/augmentableai/tpsreport-obsidian-sync/blob/main/skills/DIRECTORIES.md) |

```bash
# Install skill (recommended)
npx skills add augmentableai/skills --skill tpsreport-knowledge-base-generation -y
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
| **Plugin downloads (mirror)** | [tpsreport.pro/downloads](https://tpsreport.pro/downloads) |
| **What is TPSReport?** | [docs/about-tpsreport.md](https://github.com/augmentableai/tpsreport-obsidian-sync/blob/main/docs/about-tpsreport.md) |
| **Use cases** | [docs/use-cases.md](https://github.com/augmentableai/tpsreport-obsidian-sync/blob/main/docs/use-cases.md) |
| **FAQ** | [docs/faq.md](https://github.com/augmentableai/tpsreport-obsidian-sync/blob/main/docs/faq.md) |
| **Plugin releases** | [GitHub Releases](https://github.com/augmentableai/tpsreport-obsidian-sync/releases) |
| **Obsidian listing (official)** | [community.obsidian.md/plugins/tpsreport-sync](https://community.obsidian.md/plugins/tpsreport-sync) |
| **KB authoring skills hub** | [skills/](https://github.com/augmentableai/tpsreport-obsidian-sync/tree/main/skills) |
| **Skills repo (canonical)** | [github.com/augmentableai/skills](https://github.com/augmentableai/skills) |
| **skills.sh install** | `npx skills add augmentableai/skills --skill tpsreport-knowledge-base-generation -y` |
| **Privacy** | [tpsreport.pro/privacy](https://tpsreport.pro/privacy) |
| **Terms** | [tpsreport.pro/terms](https://tpsreport.pro/terms) |
| **Support** | [arvind@augmentable.ai](mailto:arvind@augmentable.ai) |

---

## Keywords

Obsidian plugin · TPSReport by Augmentable.ai · knowledge management · Graph RAG · [tpsreport.pro](https://tpsreport.pro)

---

## License

MIT — see [LICENSE](LICENSE).

**Current version:** `1.2.3` · Updates ship via [GitHub releases](https://github.com/augmentableai/tpsreport-obsidian-sync/releases) tagged to match `manifest.json`.
