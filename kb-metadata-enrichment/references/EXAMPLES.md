# Frontmatter examples

See [skills/examples/](https://github.com/augmentableai/tpsreport-obsidian-sync/tree/main/skills/examples) in the plugin repo for copy-paste templates.

## Enrichment example (Phase 3)

Network profile derived from body content:

```yaml
summary: >-
  ClickBank is the largest digital-product marketplace, paying 30-75% RevShare
  (avg ~50%) on courses, ebooks, software, and supplements, with a sticky 60-day
  cookie and weekly/bi-weekly payouts ($10 minimum after a one-time $100
  threshold). Its proprietary Gravity score signals how many affiliates sold a
  product in the last 12 weeks; the 20-100 range is the sweet spot.
keywords:
  - ClickBank
  - HopLink
  - Gravity score
  - digital products
  - RevShare
  - 60-day cookie
intents:
  - evaluate_network
  - choose_clickbank_offers
hyde_questions:
  - What commission does ClickBank pay?
  - What is a good ClickBank Gravity score?
  - How long is the ClickBank cookie?
retrieval_hint: >-
  Use for all ClickBank-specific questions. Do NOT use for physical-product,
  SaaS, or CPA-network questions.
scenarios:
  - beginner picking a first digital-product network
canonical_for:
  - clickbank
metadata_canary: your-topic-kb-2026
```

## Seed example (Phase 1 — guidance-first)

```yaml
title: 2026 Affiliate Regulatory Changes
description: How 2026 FTC/EU rule changes affect affiliate disclosure and tracking
date: 2026-06-19
topic: affiliate-programs
guidance_type: report
research_brief: >-
  Explain what changed for affiliates in 2026 across FTC disclosure and EU cookie
  rules, and what an affiliate must DO differently.
content_structure:
  - What changed (FTC + EU), dated
  - Impact on disclosure language
  - Action checklist for affiliates
source_materials:
  - https://www.ftc.gov/
llm_instructions: >-
  Match the KB voice: blunt, tactical, numbers-first. Cite each rule change.
```

Phase 2 fills the body; Phase 3 adds the RAG layer.
