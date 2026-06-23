# Example: `00_CONTEXT.md` frontmatter

Master router for a news/event knowledge base. Adapt topic, schema, and routing table to your domain.

```yaml
---
title: Reflecting Pool Controversy 2026 — KB Context & Routing
description: Master index for June 2026 Lincoln Memorial Reflecting Pool controversy
date: 2026-06-23
topic: reflecting-pool-controversy-2026
guidance_type: section
index_type: section
research_brief: >-
  Factual KB on the June 2026 Reflecting Pool controversy — renovation,
  algae, peeling coating, vandalism claims vs expert explanations, arrests,
  lawsuits. Neutral voice; attribute claims; verify live for evolving facts.
content_structure:
  - KB purpose and scope
  - kb_schema
  - Document map and routing
llm_instructions: >-
  Dense factual prose with dates and sourced numbers. Present competing
  narratives side by side. Do not treat unverified claims as proven.
summary: >-
  Knowledge base on the June 2026 Lincoln Memorial Reflecting Pool controversy
  in Washington DC — renovation, algae blooms, peeling sealant, arrests,
  lawsuits, and competing narratives. Use as master router for all
  reflecting-pool-2026 questions.
keywords:
  - Reflecting Pool controversy 2026
  - Lincoln Memorial Reflecting Pool June 2026
  - reflecting pool KB index
  - National Mall reflecting pool 2026
tags:
  - reflecting-pool
  - 2026
  - context
intents:
  - route_reflecting_pool_question
  - lookup_june_2026_controversy
hyde_questions:
  - What is the Reflecting Pool controversy in June 2026?
  - What happened to the Lincoln Memorial Reflecting Pool?
  - Why is the Reflecting Pool green?
retrieval_hint: >-
  Use as master router for the June 2026 Reflecting Pool controversy.
  Do NOT use for generic Lincoln Memorial history — route to historic-preservation-debate.
scenarios:
  - journalist fact-checking viral pool photos
  - agent answering why DC reflecting pool is green June 2026
canonical_for:
  - reflecting-pool-controversy-index
lifecycle_position: 0
prerequisites: []
unlocks:
  - what-is-the-reflecting-pool-controversy
  - timeline-june-2026
kb_schema:
  doc_type:
    type: str
    required: true
  event_year:
    type: int
    required: false
entities:
  - Lincoln Memorial Reflecting Pool
  - National Park Service
topics:
  - us-politics
  - historic-preservation
audience: journalists, researchers, general readers
region: United States
metadata_canary: reflecting-pool-controversy-kb-2026
---
```

## What makes a good `00_CONTEXT.md`

1. **`research_brief`** — what the KB must cover (agent grounding)
2. **`kb_schema`** — custom typed fields for this KB only
3. **`metadata_canary`** — shared token across all pages (proves metadata round-trips)
4. **Document map** (in body) — table routing questions → target slugs
5. **Reading orders** — e.g. "Journalist fast path" vs "Legal deep dive"

More `kb_schema` patterns: [kb_schema-examples.md](kb_schema-examples.md)
