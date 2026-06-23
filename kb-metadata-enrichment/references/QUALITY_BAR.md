# Quality bar (enforced by scripts/kb_lint.py)

Run the linter — do not self-grade:

```bash
python scripts/kb_lint.py <kb-folder>
```

A green exit code is the definition of "passes the Quality Bar."

## Checklist (linter codes in brackets)

- [ ] Exactly one leading `---` frontmatter block `[DOUBLE_FRONTMATTER]` `[BOM_PRESENT]`
- [ ] Valid YAML `[YAML_PARSE_ERROR]`
- [ ] Only contract keys; no synonyms (`questions` → `hyde_questions`) `[UNKNOWN_KEY]`
- [ ] Core keys present and non-empty `[MISSING_CORE_KEY]` `[EMPTY_VALUE]`
- [ ] `summary` standalone, ≥60 chars `[SUMMARY_TOO_SHORT]`
- [ ] `keywords` 8–20 entries `[LIST_LEN]`
- [ ] `hyde_questions` 4–8 entries `[LIST_LEN]`
- [ ] `retrieval_hint` includes "Do NOT use for …" `[NO_NEGATIVE_CLAUSE]`
- [ ] Correct YAML types `[WRONG_TYPE]`
- [ ] Cross-refs use real slugs `[BROKEN_XREF]`
- [ ] No duplicate `canonical_for` `[DUP_CANONICAL]`
- [ ] Consistent `metadata_canary` `[CANARY_MISMATCH]`
- [ ] Plugin-managed keys untouched (`node_id`, `sync_status`, `last_synced`, `tps_content_hash`)

Contract: [metadata-contract.yaml](metadata-contract.yaml)
