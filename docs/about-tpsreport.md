# What is TPSReport?

**[TPSReport](https://tpsreport.pro)** is a workflow to **publish knowledge bases** and use them as an **AI brain for agentic execution**.

Institutional knowledge is not just data — it is **codified, linked, and metadata-rich** so agents and humans can navigate it with precision. TPSReport helps you:

1. **Publish** structured reports and collections (visibility, gating, destinations)
2. **Index** for sophisticated retrieval — hybrid graph + vector, scoped collections
3. **Execute** agentic workflows against your corpus — not the open web

→ **Home:** [tpsreport.pro](https://tpsreport.pro)  
→ **Plugin (optional Obsidian path):** [tpsreport.pro/downloads](https://tpsreport.pro/downloads)  
→ **Privacy:** [tpsreport.pro/privacy](https://tpsreport.pro/privacy)  
→ **Terms:** [tpsreport.pro/terms](https://tpsreport.pro/terms)

---

## The problem TPSReport solves

Most tools treat knowledge as **isolated documents** or **flat vector dumps**:

- Wikis without agent-oriented metadata  
- RAG that retrieves similar text but routes tasks to the wrong doc  
- Research scattered across tools with no single published KB  
- No visibility into stale, duplicated, or conflicting content  

TPSReport treats knowledge as **structured and codified** — linked reports with metadata designed for agentic KB workflows (`summary`, `hyde_questions`, `retrieval_hint`, `defers_to`, `canonical_for`, …).

---

## Core capabilities

### Publish knowledge bases

Ship linked report collections with visibility controls, gating, and optional monetization. Author **100% online** or sync from Obsidian when that fits your stack.

### AI brain for agentic execution

Scoped retrieval collections combine embeddings with graph signals and routing metadata — so agents get the right context, defer subtopics, and skip what they should not touch.

### Knowledge operations (KnowOps)

Monitor knowledge health: staleness detection, usage analytics, change impact analysis, and alerts when critical content needs attention.

---

## How Obsidian fits in

**Obsidian is optional architectural bedrock** — not the product story.

- **Online-first:** Build and publish entirely in TPS Report  
- **Vault-native:** Use Obsidian for offline editing, wikilinks, and folder workflows  

This plugin ([tpsreport-obsidian-sync](https://github.com/augmentableai/tpsreport-obsidian-sync)) connects vault folders to the same published KB and metadata contract:

1. Write locally in Obsidian  
2. Publish folders as TPSReport reports  
3. Sync changes bidirectionally  
4. Agents and chat query the indexed corpus in [TPSReport](https://tpsreport.pro)

**Install:** [tpsreport.pro/downloads](https://tpsreport.pro/downloads) · [Obsidian community listing](https://community.obsidian.md/plugins/tpsreport-sync)

**Agent skills:** [skills hub](../skills/README.md) — `npx skills add augmentableai/skills --skill tpsreport-knowledge-base-generation -y`

---

## Who is TPSReport for?

- **Teams publishing vertical KB products** (research OS, runbooks, policy graphs)  
- **Creators** shipping gated knowledge collections  
- **Agent builders** who need metadata-rich retrieval — not naive chunk search  
- **Obsidian users** who want vault sync without giving up online authoring  

See [use cases](use-cases.md) for detailed scenarios.

---

## Get started

1. Create an account at **[tpsreport.pro](https://tpsreport.pro)**  
2. *(Optional)* Install the plugin from **[tpsreport.pro/downloads](https://tpsreport.pro/downloads)** or the [Obsidian community listing](https://community.obsidian.md/plugins/tpsreport-sync)  
3. Connect with your API key and publish your first report  
4. *(Optional)* Install the KB skill: `npx skills add augmentableai/skills --skill tpsreport-knowledge-base-generation -y`

Questions? **[arvind@augmentable.ai](mailto:arvind@augmentable.ai)**

---

**TPSReport** · [tpsreport.pro](https://tpsreport.pro) · **TPSReport by Augmentable.ai**
