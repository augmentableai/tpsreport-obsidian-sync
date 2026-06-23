# What is TPSReport?

**[TPSReport](https://tpsreport.pro)** is an AI-native knowledge management platform for teams that need more than a flat folder of notes.

Institutional knowledge is not just data — it is a **living network** of expertise, relationships, and context. TPSReport helps you curate that knowledge into **graph-structured reports and collections** that humans and AI agents can query with precision.

→ **Home:** [tpsreport.pro](https://tpsreport.pro)  
→ **Get started:** [tpsreport.pro](https://tpsreport.pro)  
→ **Privacy:** [tpsreport.pro/privacy](https://tpsreport.pro/privacy)  
→ **Terms:** [tpsreport.pro/terms](https://tpsreport.pro/terms)

---

## The problem TPSReport solves

Most organizations store knowledge as **isolated documents**:

- Wikis without relationship metadata  
- Notes that search engines and LLMs cannot contextualize  
- Research scattered across tools with no single source of truth  
- No visibility into stale, duplicated, or conflicting content  

TPSReport treats knowledge as a **graph** — documents linked by categories, relationships, centrality, and rich frontmatter so retrieval understands *how* ideas connect, not just keyword overlap.

---

## Core capabilities

### Knowledge curation & codification

Transform tribal knowledge into structured, taxonomized, graph-connected intelligence. Capture implicit expertise, build relationship metadata, and create category hierarchies that reflect how your organization actually thinks.

### Graph RAG systems

Combine **vector embeddings** with **explicit human-curated links**. Multi-hop traversal, centrality scoring, and metadata-aware search deliver context-aware retrieval for agents and analysts.

### Knowledge operations (KnowOps)

Monitor knowledge health over time: staleness detection, usage analytics, change impact analysis, and alerts when critical content needs attention.

### Rendered knowledge reports

Publish structured reports with visibility controls, edit scopes, destinations, and optional RAG indexing — all managed from your [TPSReport workspace](https://tpsreport.pro).

---

## How Obsidian fits in

**Obsidian** is where many teams write, research, and draft. **TPSReport** is where that work becomes **managed, indexed, and agent-ready**.

This plugin ([tpsreport-obsidian-sync](https://github.com/augmentableai/tpsreport-obsidian-sync)) connects the two:

1. Write locally in Obsidian  
2. Publish folders as TPSReport reports  
3. Sync changes bidirectionally  
4. Query and operationalize knowledge in [TPSReport](https://tpsreport.pro)

**Official plugin listing:** [community.obsidian.md/plugins/tpsreport-sync](https://community.obsidian.md/plugins/tpsreport-sync)

**Agent skills:** [`skills/`](../skills/) — lifecycle workflow + `kb_lint.py` for retrieval-tuned frontmatter. Install: `npx skills add augmentableai/tpsreport-obsidian-sync/skills/kb-metadata-enrichment`

---

## Technology highlights

| Layer | Examples |
| --- | --- |
| **Graph storage** | Node/relationship models, taxonomy hierarchies, centrality |
| **Vector retrieval** | Scoped collections, hybrid graph + embedding search |
| **Curation UX** | Category management, related-doc linking, metadata enrichment |
| **Operations** | Freshness monitoring, usage dashboards, health alerts |

---

## Who is TPSReport for?

- **Research teams** building a Research OS  
- **Operations & compliance** managing policy graphs  
- **Product & strategy** linking insights to decisions  
- **Customer success** curating support knowledge with usage signals  
- **Technical writers** maintaining prerequisite-linked documentation  

See [use cases](use-cases.md) for detailed scenarios.

---

## Get started

1. Create an account at **[tpsreport.pro](https://tpsreport.pro)**  
2. Install the plugin from the **[Obsidian community listing](https://community.obsidian.md/plugins/tpsreport-sync)**  
3. Connect with your API key and publish your first report  
4. *(Optional)* Copy **[skills/kb-metadata-enrichment](../skills/kb-metadata-enrichment/)** into `.cursor/skills/` for agent-assisted KB authoring

Questions? **[arvind@augmentable.ai](mailto:arvind@augmentable.ai)**

---

**TPSReport** · [tpsreport.pro](https://tpsreport.pro) · Published by **Augmentable LLC**
