# FAQ — TPSReport Obsidian plugin

Quick answers about **[TPSReport](https://tpsreport.pro)** and this plugin.

→ [About TPSReport](about-tpsreport.md) · [Use cases](use-cases.md) · [Skills hub](../skills/README.md) · [README](../README.md)

---

## General

### What is TPSReport?

[TPSReport](https://tpsreport.pro) is a graph-native AI knowledge management platform. It helps teams curate notes and research into structured reports optimized for Graph RAG, access control, and agent retrieval.

### What does this Obsidian plugin do?

It syncs local Markdown folders (notes, frontmatter, images) between your Obsidian vault and your [TPSReport](https://tpsreport.pro) cloud workspace — publish, push, pull, and reconcile with stable document IDs.

### Is TPSReport the same as HiFi-WP?

TPSReport is the product brand at **[tpsreport.pro](https://tpsreport.pro)**. Legacy HiFi-WP infrastructure may still power some backend services; the public product home and policies are on tpsreport.pro.

---

## Account & setup

### Do I need a paid account?

Sign up at **[tpsreport.pro](https://tpsreport.pro)** to obtain an API key. Plan details are on the product site.

### Where do I get an API key?

From your TPSReport dashboard after signing in at [tpsreport.pro](https://tpsreport.pro). Keys look like `obs_...`.

### Is the plugin desktop-only?

Yes. It syncs vault files and local images, which requires Obsidian desktop.

---

## Privacy & security

### When is my vault data sent to the cloud?

Only after you configure an API key and explicitly **publish**, **push**, or **pull** a mapped report. Nothing is uploaded automatically.

### Where is my API key stored?

Locally in Obsidian plugin data. It is sent only to the TPSReport API for authenticated requests.

### Where are privacy and terms?

- Privacy: [tpsreport.pro/privacy](https://tpsreport.pro/privacy)  
- Terms: [tpsreport.pro/terms](https://tpsreport.pro/terms)

---

## Sync behavior

### What is `node_id` frontmatter?

A stable identifier linking a local file to its cloud report node. Enables ID-first reconciliation across renames and moves.

### What happens on conflict?

The plugin marks conflicts in frontmatter and can create reviewable conflict copies instead of silently overwriting edits.

### Does push delete remote content?

Delete sync is a separate, explicit operation for mapped folders. Review mappings before using it.

---

## KB authoring skills

### Is there a Cursor / agent workflow for building KBs?

Yes. This repo ships **[skills/kb-metadata-enrichment](../skills/kb-metadata-enrichment/)** — a lifecycle skill plus `kb_lint.py` that validates frontmatter against the same contract the plugin Gatekeeper uses.

Copy to `.cursor/skills/kb-metadata-enrichment/` in your vault project, or install via [skills.sh](https://skills.sh):

```bash
npx skills add augmentableai/tpsreport-obsidian-sync/skills/kb-metadata-enrichment
```

Full docs: [skills/README.md](../skills/README.md) · [INSTALL.md](../skills/INSTALL.md) · [examples/](../skills/examples/)

---

## Obsidian Community directory

### How do I install from Obsidian?

Settings → Community plugins → Browse → search **TPSReport**, or open the [official listing](https://community.obsidian.md/plugins/tpsreport-sync).

### How are updates delivered?

New versions are published as [GitHub releases](https://github.com/augmentableai/tpsreport-obsidian-sync/releases) tagged to match `manifest.json` version. Obsidian notifies you when updates are available.

---

## Support & links

| Link | URL |
| --- | --- |
| Product home | [tpsreport.pro](https://tpsreport.pro) |
| Plugin repo | [github.com/augmentableai/tpsreport-obsidian-sync](https://github.com/augmentableai/tpsreport-obsidian-sync) |
| Community listing | [community.obsidian.md/plugins/tpsreport-sync](https://community.obsidian.md/plugins/tpsreport-sync) |
| KB authoring skills | [skills/kb-metadata-enrichment](../skills/kb-metadata-enrichment/) |
| Email | [arvind@augmentable.ai](mailto:arvind@augmentable.ai) |
