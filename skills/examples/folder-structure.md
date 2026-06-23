# Recommended KB folder structure

Standard layout for a TPSReport-synced Obsidian knowledge base.

```text
Your_KB_Name/
├── 00_CONTEXT.md                 ← Master router (always first)
├── 01_Overview/
│   ├── what-is-[topic].md
│   └── [topic]-vs-[alternative].md
├── 02_Features/                  ← or 02_Services/, 02_Products/, 02_Events/
│   ├── features-overview.md
│   └── [feature-slug].md
├── 03_Workflows/
│   ├── getting-started.md
│   └── best-practices.md
├── 04_Pricing/                   ← omit if N/A
├── 05_Integrations/              ← omit if N/A
├── 06_FAQ/
│   └── faq.md
└── 07_Use_Cases/                 ← optional
```

## Naming rules

| Rule | Example |
|------|---------|
| Section folders | `01_Overview/`, `02_Features/` — numbered for sort order |
| File slugs | `what-is-devin.md` — lowercase, hyphens, no spaces |
| Wikilinks | `[[what-is-devin]]` — slug = filename without `.md` |
| Router | Exactly one `00_CONTEXT.md` at KB root |

## Domain adaptations

| KB type | Section names |
|---------|---------------|
| **SaaS / product** | `02_Features/`, `03_Workflows/`, `04_Pricing/`, `05_Integrations/` |
| **Service business** | `02_Services/`, `03_Service_Areas/`, `04_Patient_Journey/` |
| **News / event KB** | `02_Timeline/`, `03_Key_Players/`, `04_Legal/`, `05_Media/` |
| **Affiliate / catalog** | `02_Networks/`, `03_Programs/`, `04_Compliance/` |
| **Internal wiki** | `02_Policies/`, `03_Runbooks/`, `04_Onboarding/` |

## Minimum viable KB

For a focused topic, aim for:

- 1 × `00_CONTEXT.md`
- 3–5 × overview / explainer pages
- 2–3 × workflow or how-to pages
- 1 × FAQ
- **15–25 pages** for a substantial KB (adjust to scope)

## Body formatting (Obsidian-native)

```markdown
# Page Title

The ==key term== appears highlighted for scanability.

> [!tip] Pro tip
> Use callouts for actionable advice.

| Column A | Column B |
|----------|----------|
| Fact     | Source   |

See also: [[related-page-slug]] for the full workflow.
```

## After first push

The plugin adds sync fields automatically — **do not hand-edit**:

- `node_id`
- `sync_status`
- `last_synced`
- `tps_content_hash`

See [frontmatter-page-example.md](frontmatter-page-example.md) for a pre-sync template.
