# `kb_schema` examples

Per-KB custom fields declared in `00_CONTEXT.md`. The linter and plugin Gatekeeper enforce `required: true` on every content page.

---

## Movies / catalog KB

```yaml
kb_schema:
  year_of_release:
    type: int
    required: true
  director:
    type: str
    required: true
  genre:
    type: list
    required: false
  mpaa_rating:
    type: str
    required: false
```

Content pages include: `doc_type: film`, `year_of_release: 2024`, etc.

---

## Service business (dental, legal, home services)

```yaml
kb_schema:
  service_type:
    type: str
    required: true
  price_range:
    type: str
    required: true
  insurance_accepted:
    type: list
    required: false
```

---

## SaaS / agent product KB

```yaml
kb_schema:
  doc_type:
    type: str
    required: true
  product_surface:
    type: str
    required: false
```

Example values: `doc_type: integration`, `product_surface: api`.

---

## Affiliate / network KB

```yaml
kb_schema:
  network_name:
    type: str
    required: true
  commission_type:
    type: str
    required: true
  payout_frequency:
    type: str
    required: false
  geo_restrictions:
    type: list
    required: false
```

---

## News / event KB

```yaml
kb_schema:
  doc_type:
    type: str
    required: true
  event_year:
    type: int
    required: false
  event_date:
    type: str
    required: false
```

Example values: `doc_type: timeline`, `doc_type: overview`, `event_year: 2026`.

---

## Rules

1. Declare schema **once** in `00_CONTEXT.md` frontmatter
2. Platform core keys (`summary`, `keywords`, `intents`, …) are **separate** — never put them in `kb_schema`
3. Use types: `str`, `int`, `list`, `map`
4. `required: true` → linter error if missing on any content doc
5. Schema travels with the KB through sync — no central registry update needed

Full contract: [../tpsreport-skill/metadata-contract.yaml](../tpsreport-skill/metadata-contract.yaml)
