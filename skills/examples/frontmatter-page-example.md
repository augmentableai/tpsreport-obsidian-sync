# Example: content page frontmatter

Overview page template with full RAG metadata. **Omit** `node_id`, `sync_status`, `last_synced`, and `tps_content_hash` — the plugin adds these on first push.

```yaml
---
title: What Is the Reflecting Pool Controversy?
description: Executive summary — June 2026 renovation, algae, peeling, vandalism frame
date: 2026-06-23
topic: reflecting-pool-controversy-2026
doc_type: overview
event_year: 2026
guidance_type: report
source_materials:
  - https://www.example.com/reflecting-pool-explainer
  - https://www.example.com/expert-analysis
summary: >-
  In June 2026 the Lincoln Memorial Reflecting Pool became a national
  controversy after a high-profile renovation repainted the basin, reopened
  it amid celebrations, then faced algae blooms, peeling coating, and
  competing vandalism vs application-failure narratives. This page is the
  one-paragraph executive summary with dates and sourced figure ranges.
keywords:
  - Reflecting Pool controversy explained
  - what happened reflecting pool 2026
  - Lincoln Memorial pool green algae
  - reflecting pool peeling paint
  - reflecting pool June 2026 summary
  - National Mall reflecting pool problems
tags:
  - reflecting-pool
  - overview
  - 2026
intents:
  - summarize_reflecting_pool_controversy
hyde_questions:
  - What is the Reflecting Pool controversy?
  - Why is the Reflecting Pool in the news June 2026?
  - What went wrong with the Reflecting Pool renovation?
  - Why did the Reflecting Pool turn green?
retrieval_hint: >-
  Use for one-page executive summary of the June 2026 controversy.
  Do NOT use for contractor payment schedules — route to contractors-and-costs.
scenarios:
  - reader seeing green pool photos without context
  - first question in news chatbot
canonical_for:
  - reflecting-pool-controversy-summary
lifecycle_position: 1
prerequisites: []
unlocks:
  - timeline-june-2026
  - competing-narratives-open-questions
see_also:
  - file: april-renovation-american-flag-blue
    reason: Project origin
  - file: david-hearn-arrest
    reason: Highest-profile arrest
entities:
  - Lincoln Memorial Reflecting Pool
topics:
  - us-news-2026
audience: general readers
region: Washington DC
metadata_canary: reflecting-pool-controversy-kb-2026
---
```

## Body starter (below frontmatter)

```markdown
# What Is the Reflecting Pool Controversy?

The ==Lincoln Memorial Reflecting Pool== became a flashpoint in **June 2026**
when a high-profile renovation collided with **algae**, **peeling coating**,
and **accusations of deliberate sabotage**.

## The Arc (April → June 2026)

| Phase | What happened |
|-------|---------------|
| **April 2026** | Pool drained; new coating applied |
| **June 6** | Reopened to the public |
| **Mid-June** | Algae bloom; material peels and floats |
| **Late June** | Vandalism allegations; arrests reported |

> [!note] Verify live
> Arrest counts, drain status, and court dates change frequently — check
> current reporting before citing as fact.

See [[timeline-june-2026]] for day-by-day detail.
```

## Common mistakes

| Wrong | Right |
|-------|-------|
| `questions:` | `hyde_questions:` |
| `tldr:` | `summary:` |
| `retrieval_hint` without negative clause | Always include "Do NOT use for …" |
| `defers_to: wrong-slug` | Values must match **existing file slugs** |
| Hand-editing `node_id` | Leave blank until plugin syncs |
