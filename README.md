# TPSReport by HiFi-WP

Obsidian companion plugin for **TPSReport AI Brain & Knowledge Management**. Publish and sync local Markdown research folders from your Obsidian vault into TPSReport so they can be rendered, managed, indexed, and queried from your HiFi-WP workspace.

**Publisher:** Augmentable LLC  
**Product site:** [wp.hifibots.com](https://wp.hifibots.com)  
**Privacy:** [wp.hifibots.com/privacy](https://wp.hifibots.com/privacy) | **Terms:** [wp.hifibots.com/terms](https://wp.hifibots.com/terms)

## What it does

TPSReport connects your local Obsidian writing workflow to your TPSReport cloud workspace.

- Publish an Obsidian folder as a new TPSReport knowledge report
- Sync Markdown files, nested folders, frontmatter metadata, and local images
- Pull report updates from TPSReport back into your vault
- Preserve stable `node_id` frontmatter for ID-first reconciliation
- Detect conflicts and create conflict copies instead of silently discarding edits
- Choose enabled report destinations returned by your HiFi-WP account
- Optionally enable RAG indexing for report content

This plugin is for **knowledge management and report synchronization**. AI generation, indexing, public/private access control, and rendered report management happen in your connected TPSReport / HiFi-WP account.

## Requirements

- A **HiFi-WP account** at [wp.hifibots.com](https://wp.hifibots.com)
- A TPSReport / Obsidian API key (`obs_...`) generated from your HiFi-WP dashboard
- Obsidian desktop. This plugin is desktop-only because it syncs vault files and local images.

## Configure

Open **Settings -> TPSReport** in Obsidian:

| Setting | Details |
| ------- | ------- |
| **API Base URL** | TPSReport backend URL. Production is managed by HiFi-WP. |
| **TPSReport API Key** | Your `obs_...` key. Stored locally in Obsidian plugin data. |
| **Frontmatter ID field** | Stable identity field, recommended: `node_id`. |
| **Default report settings** | Visibility, edit scope, content format, RAG setting, and destination defaults for newly published reports. |
| **Image sync** | Upload local embedded images on push and download remote report images on pull. |
| **Folder mapping** | Map local Obsidian folders to cloud TPSReport reports. |

Run **Test Connection** after adding your API key.

## Basic workflow

1. Create or choose an Obsidian folder for a report.
2. Right-click the folder and choose **Publish as New Report**.
3. Pick visibility, edit scope, content format, and destination.
4. Push the folder to TPSReport.
5. Open the rendered report in your HiFi-WP workspace.
6. Re-run sync commands as your local notes change.

## Frontmatter metadata

Frontmatter is optional. A Markdown file with no frontmatter still syncs normally; the plugin creates TPSReport bookkeeping fields such as `node_id`, `sync_status`, `last_synced`, and `tps_content_hash` when needed.

For higher retrieval accuracy, add Obsidian YAML properties to source documents. TPSReport reads normal YAML frontmatter, including multiline arrays and nested objects. Useful retrieval fields include `summary`, `keywords`, `tags`, `intents`, `scenarios`, `retrieval_hint`, `entities`, `topics`, `brands`, `product_skus`, `product_categories`, `region`, `audience`, and `metadata_canary`.

Example:

```yaml
---
summary: AP-300 commercial-light purifier facts and filter intervals.
keywords:
  - AP-300
  - CADR 420
  - dental office
tags:
  - clearbreeze
  - catalog
intents:
  - product_lookup
  - business_recommendation
product_skus:
  - AP-300
  - AP300-H13
metadata_canary: zephyr-17
---
```

## External services

This plugin connects to TPSReport / HiFi-WP services operated by **Augmentable LLC**. A HiFi-WP account and API key are required for cloud sync.

**Service URLs**

- Web app: `https://wp.hifibots.com`
- API: `https://wordpressgpt-api-325927718367.us-central1.run.app`

**What is sent, when, and why**

- **Connection verification:** your API key is sent to verify your HiFi-WP account and load available TPSReport destinations.
- **Report publishing:** report title, description, visibility, edit scope, content format, and destination are sent when you publish a new report.
- **Markdown sync:** Markdown body content, selected frontmatter metadata, file paths, folder structure, content hashes, and local modification timestamps are sent when you push a mapped folder.
- **Image sync:** local images embedded in synced Markdown are uploaded when image sync is enabled.
- **Pull sync:** report tree, document content, guidance metadata, and image assets are downloaded when you pull from TPSReport.
- **RAG indexing setting:** when enabled for a report, content can be indexed in your HiFi-WP knowledge base for retrieval.

No vault content is sent until you configure an API key and explicitly publish, push, or pull a mapped report.

## Privacy

Your TPSReport API key is stored locally in Obsidian plugin data and sent only to the configured TPSReport API. Synced content is stored in your HiFi-WP workspace and governed by your report visibility settings.

For full details on how Augmentable LLC handles personal data, see the [HiFi-WP Privacy Policy](https://wp.hifibots.com/privacy).

## Safety notes

- Push can update remote report content.
- Pull can create, modify, rename, or archive files inside mapped vault folders.
- Delete sync only applies to mapped report folders and should be used after reviewing the target mapping.
- Conflicts are marked in frontmatter and remote conflict copies are created for review.

## Support

- Product site: [wp.hifibots.com](https://wp.hifibots.com)
- Privacy policy: [wp.hifibots.com/privacy](https://wp.hifibots.com/privacy)
- Terms of service: [wp.hifibots.com/terms](https://wp.hifibots.com/terms)

## Version

Current plugin version: `0.1.4`

After the first community release, ship updates by bumping `manifest.json` `version`, updating `versions.json`, creating a matching GitHub release tag, and attaching `main.js`, `manifest.json`, and `styles.css`.
