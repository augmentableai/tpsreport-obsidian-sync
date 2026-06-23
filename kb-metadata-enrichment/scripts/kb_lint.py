#!/usr/bin/env python3
"""
kb_lint.py — deterministic frontmatter linter for HiFi-Bots / TPSReport KBs.

The KB Lifecycle Manager skill (Phase 4) MUST run this before declaring a KB
task done. It is the source of truth for "valid metadata" — not an LLM self-check.

What it catches that an LLM checklist misses:
  - DOUBLE_FRONTMATTER : more than one leading `---` block (the bug that bled
                         YAML into rendered pages).
  - BOM_PRESENT        : UTF-8 BOM before the frontmatter fence.
  - YAML_PARSE_ERROR   : frontmatter that won't parse.
  - UNKNOWN_KEY        : key TPSReport never reads (esp. synonyms like
                         `questions` instead of `hyde_questions`).
  - WRONG_TYPE         : a key with the wrong YAML type.
  - BROKEN_XREF        : defers_to/see_also/unlocks/prerequisites pointing at a
                         slug that does not exist in the KB.
  - DUP_CANONICAL      : two docs claim the same canonical_for topic.
  - MISSING_CORE_KEY / LIST_LEN / SUMMARY_TOO_SHORT / NO_NEGATIVE_CLAUSE /
    CANARY_MISMATCH / EMPTY_VALUE : retrieval-quality bar.

Usage:
    python kb_lint.py <path-to-kb-or-vault> [--json] [--strict] [--quiet]

Exit code: 0 if no errors (and, with --strict, no warnings); 1 otherwise.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError:  # pragma: no cover
    sys.stderr.write("kb_lint.py requires PyYAML (pip install pyyaml)\n")
    sys.exit(2)

CONTRACT_PATH = Path(__file__).resolve().parent.parent / "references" / "metadata-contract.yaml"


# --------------------------------------------------------------------------- #
# Findings
# --------------------------------------------------------------------------- #
@dataclass
class Finding:
    code: str
    severity: str  # error | warning | info
    file: str
    message: str


@dataclass
class Contract:
    raw: dict
    rag_keys: set = field(default_factory=set)
    guidance_keys: set = field(default_factory=set)
    classifier_keys: set = field(default_factory=set)
    author_keys: set = field(default_factory=set)
    plugin_managed_keys: set = field(default_factory=set)
    required_core: list = field(default_factory=list)
    xref_keys: list = field(default_factory=list)
    synonyms: dict = field(default_factory=dict)
    rules: dict = field(default_factory=dict)
    exempt_quality: dict = field(default_factory=dict)
    custom_field_types: set = field(default_factory=set)
    severity_map: dict = field(default_factory=dict)

    @property
    def known_keys(self) -> set:
        return (
            self.rag_keys
            | self.guidance_keys
            | self.classifier_keys
            | self.author_keys
            | self.plugin_managed_keys
        )


def load_contract(path: Path = CONTRACT_PATH) -> Contract:
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    severity_map: dict[str, str] = {}
    for sev, codes in (data.get("severity") or {}).items():
        for c in codes or []:
            severity_map[c] = sev
    return Contract(
        raw=data,
        rag_keys=set(data.get("rag_keys") or []),
        guidance_keys=set(data.get("guidance_keys") or []),
        classifier_keys=set(data.get("classifier_keys") or []),
        author_keys=set(data.get("author_keys") or []),
        plugin_managed_keys=set(data.get("plugin_managed_keys") or []),
        required_core=list(data.get("required_core") or []),
        xref_keys=list(data.get("xref_keys") or []),
        synonyms=dict(data.get("synonyms") or {}),
        rules=dict(data.get("rules") or {}),
        exempt_quality=dict(data.get("exempt_quality") or {}),
        custom_field_types=set(data.get("custom_field_types") or []),
        severity_map=severity_map,
    )


# --------------------------------------------------------------------------- #
# Frontmatter extraction
# --------------------------------------------------------------------------- #
FENCE_RE = re.compile(r"^(---|\.\.\.)[ \t]*$")


def extract_frontmatter_blocks(text: str) -> tuple[list[dict], str, list[str]]:
    """Return (blocks, body_after_last_block, parse_errors).

    Counts *leading* YAML frontmatter blocks. A block only counts if it parses
    to a mapping (dict) — that distinguishes a real FM block from a `---`
    thematic break in prose. `blocks` may be empty (no frontmatter).
    """
    lines = text.split("\n")
    blocks: list[dict] = []
    parse_errors: list[str] = []
    i = 0
    n = len(lines)

    while i < n:
        # skip blank lines between/before blocks
        while i < n and lines[i].strip() == "":
            i += 1
        if i >= n or lines[i].strip() != "---":
            break
        # find closing fence
        j = i + 1
        while j < n and not FENCE_RE.match(lines[j].strip()):
            j += 1
        if j >= n:
            break  # unterminated fence — treat as not-a-block, leave to YAML check
        raw_block = "\n".join(lines[i + 1 : j])
        try:
            parsed = yaml.safe_load(raw_block)
        except yaml.YAMLError as e:
            parse_errors.append(str(e).splitlines()[0])
            parsed = None
        if isinstance(parsed, dict):
            blocks.append(parsed)
            i = j + 1
            continue
        if parsed is None and raw_block.strip() == "":
            # empty fenced block; count as (empty) frontmatter then continue
            blocks.append({})
            i = j + 1
            continue
        # not a mapping => it was a thematic break / body content, stop scanning
        break

    body = "\n".join(lines[i:])
    return blocks, body, parse_errors


def merge_blocks(blocks: list[dict]) -> dict:
    merged: dict = {}
    for b in blocks:
        for k, v in b.items():
            merged[k] = v  # later blocks win
    return merged


# --------------------------------------------------------------------------- #
# Classification helpers
# --------------------------------------------------------------------------- #
def slug_of(path: Path) -> str:
    return path.stem


def is_quality_exempt(path: Path, fm: dict, contract: Contract) -> tuple[bool, str]:
    ex = contract.exempt_quality
    name = path.name.lower()
    for frag in ex.get("name_contains") or []:
        if frag.lower() in name:
            return True, f"name contains '{frag}'"
    for pre in ex.get("name_startswith") or []:
        if name.startswith(pre.lower()):
            return True, f"name starts with '{pre}'"
    segs = [s.lower() for s in path.parts]
    for seg in ex.get("path_segment") or []:
        if seg.lower() in segs:
            return True, f"in '{seg}/'"
    it = str(fm.get("index_type") or "").lower()
    for val in ex.get("classifier_index_type") or []:
        if it == str(val).lower():
            return True, f"index_type={it}"
    if ex.get("classifier_guidance_type_any") and fm.get("guidance_type"):
        return True, f"guidance_type={fm.get('guidance_type')}"
    return False, ""


def value_matches_type(val: Any, t: str) -> bool:
    if t == "str":
        return isinstance(val, str)
    if t == "int":
        return isinstance(val, int) and not isinstance(val, bool)
    if t == "float":
        return isinstance(val, (int, float)) and not isinstance(val, bool)
    if t == "bool":
        return isinstance(val, bool)
    if t == "list":
        return isinstance(val, list)
    if t == "map":
        return isinstance(val, dict)
    if t == "str_or_list":
        return isinstance(val, (str, list))
    return True  # unknown type declaration -> don't false-flag


def is_empty(v: Any) -> bool:
    if v is None:
        return True
    if isinstance(v, str):
        return v.strip() == ""
    if isinstance(v, (list, dict)):
        return len(v) == 0
    return False


def collect_xref_slugs(key: str, value: Any) -> list[str]:
    """Pull the referenced slugs out of a cross-reference value."""
    out: list[str] = []
    if value is None:
        return out
    if key == "defers_to" and isinstance(value, dict):
        out.extend(str(v).strip() for v in value.values() if v)
    elif key == "see_also":
        if isinstance(value, list):
            for item in value:
                if isinstance(item, dict):
                    f = item.get("file")
                    if f:
                        out.append(str(f).strip())
                elif isinstance(item, str):
                    out.append(item.strip())
        elif isinstance(value, dict):
            f = value.get("file")
            if f:
                out.append(str(f).strip())
    else:  # unlocks / prerequisites — list of slugs
        if isinstance(value, list):
            out.extend(str(v).strip() for v in value if v)
        elif isinstance(value, str):
            out.append(value.strip())
    # normalize: strip [[ ]] wikilink syntax and .md
    norm = []
    for s in out:
        s = s.strip().strip("[]").strip()
        if s.endswith(".md"):
            s = s[:-3]
        if s:
            norm.append(s)
    return norm


# --------------------------------------------------------------------------- #
# Linter
# --------------------------------------------------------------------------- #
def iter_markdown(root: Path):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in (".obsidian", "__pycache__", ".git")]
        for fn in filenames:
            if fn.lower().endswith(".md"):
                yield Path(dirpath) / fn


KB_CONTEXT_FILENAMES = {"00_context.md", "00_index.md", "00_guidance.md"}


def is_context_file(path: Path) -> bool:
    # KB-root marker = the context convention only. NOT README (common at many
    # levels) and NOT arbitrary 00_* files, so a stray README never turns a whole
    # vault into a "KB" and suppresses non-KB scoping.
    return path.name.lower() in KB_CONTEXT_FILENAMES


def discover_kb_schemas(files: list[Path]):
    """Find per-KB schemas + KB root dirs.

    Returns (schema_dirs, kb_root_dirs):
      - schema_dirs: {dir_path: kb_schema dict}  (from 00_*.md `kb_schema:`)
      - kb_root_dirs: set of dirs that contain a context file (00_*/README) —
        used to decide which files are KB-managed (vs a client's personal notes).
    """
    schema_dirs: dict[Path, dict] = {}
    kb_root_dirs: set[Path] = set()
    for f in files:
        if not is_context_file(f):
            continue
        kb_root_dirs.add(f.parent)
        raw = f.read_text(encoding="utf-8", errors="replace").replace("\ufeff", "").replace("\u200b", "")
        blocks, _, _ = extract_frontmatter_blocks(raw)
        fm = merge_blocks(blocks)
        ks = fm.get("kb_schema")
        if isinstance(ks, dict) and ks:
            schema_dirs[f.parent] = ks
    return schema_dirs, kb_root_dirs


def nearest_ancestor_value(path: Path, by_dir: dict[Path, Any]):
    """Walk up from a file's folder to find the closest declared value."""
    cur = path.parent
    while True:
        if cur in by_dir:
            return by_dir[cur]
        if cur.parent == cur:
            return None
        cur = cur.parent


def under_any(path: Path, dirs: set[Path]) -> bool:
    cur = path.parent
    while True:
        if cur in dirs:
            return True
        if cur.parent == cur:
            return False
        cur = cur.parent


def is_kb_doc(fm: dict, governed: bool, contract: Contract) -> bool:
    """A file is KB-managed (worth linting) if it sits under a KB context dir, or
    carries a node_id / any contract signal key. Plain personal notes are skipped."""
    if governed:
        return True
    if not fm:
        return False
    keys = set(fm.keys())
    if "node_id" in keys:
        return True
    signal = contract.rag_keys | contract.guidance_keys | contract.classifier_keys
    return bool(keys & signal)


def lint(root: Path, contract: Contract, lint_all: bool = False) -> tuple[list[Finding], int]:
    findings: list[Finding] = []
    files = sorted(iter_markdown(root))

    schema_dirs, kb_root_dirs = discover_kb_schemas(files)
    slug_index: set[str] = {slug_of(f) for f in files}
    canonical_owner: dict[str, str] = {}
    canary_values: dict[str, list[str]] = {}
    skipped_non_kb = 0

    for f in files:
        rel = str(f.relative_to(root)) if f.is_relative_to(root) else str(f)
        raw = f.read_text(encoding="utf-8", errors="replace")
        has_zero_width = "\ufeff" in raw or "\u200b" in raw
        raw_clean = raw.replace("\ufeff", "").replace("\u200b", "") if has_zero_width else raw

        blocks, body, parse_errors = extract_frontmatter_blocks(raw_clean)
        fm = merge_blocks(blocks)

        # SCOPING: only lint KB-managed files. A client's personal notes / daily
        # notes (no frontmatter, no node_id, not under a KB context folder) are
        # skipped entirely so we never touch files this skill didn't create.
        governed = under_any(f, kb_root_dirs)
        if not lint_all and not is_kb_doc(fm, governed, contract):
            skipped_non_kb += 1
            continue

        # Per-KB custom field schema (declared in the KB's 00_CONTEXT kb_schema).
        kb_schema = nearest_ancestor_value(f, schema_dirs) or {}
        custom_keys = set(kb_schema.keys())

        # A BOM/zero-width char anywhere can hide a frontmatter fence from every
        # parser (Obsidian, the renderer, us). A BOM before a 2nd `---` is what
        # bleeds YAML into the page.
        if has_zero_width:
            leading = raw.startswith("\ufeff") or raw.startswith("\u200b")
            where = "at the start of the file" if leading else "mid-file (likely before a second `---` fence)"
            findings.append(Finding("BOM_PRESENT", "warning", rel,
                                    f"UTF-8 BOM / zero-width char present {where}; strip it so the "
                                    f"frontmatter fence is detectable."))

        for pe in parse_errors:
            findings.append(Finding("YAML_PARSE_ERROR", "error", rel,
                                    f"Frontmatter failed to parse: {pe}"))

        if len(blocks) > 1:
            findings.append(Finding(
                "DOUBLE_FRONTMATTER", "error", rel,
                f"{len(blocks)} leading frontmatter blocks found — merge into one "
                f"`---` block, or YAML will render into the page body."))

        # Unknown keys / synonyms (custom kb_schema keys count as known)
        subfields = {"reason", "file"}  # belong *inside* a see_also entry
        for k in fm.keys():
            if k in contract.known_keys or k in custom_keys or k == "kb_schema":
                continue
            hint = contract.synonyms.get(k)
            if k in subfields:
                findings.append(Finding("UNKNOWN_KEY", "error", rel,
                                        f"`{k}` is dedented to the top level — it is a sub-field of a "
                                        f"`see_also` entry. Indent it under its `- file:` item (2 spaces)."))
            elif hint:
                findings.append(Finding("UNKNOWN_KEY", "error", rel,
                                        f"`{k}` is not read by TPSReport — did you mean `{hint}`?"))
            else:
                # Truly-unknown custom key: TPSReport ignores it (harmless), but it
                # may be a typo. Warn, don't block.
                findings.append(Finding("UNKNOWN_KEY", "warning", rel,
                                        f"`{k}` is not in the TPSReport contract; it will be ignored by "
                                        f"retrieval (custom/author key or a typo)."))

        # Cross-reference resolution (runs on every doc)
        for xk in contract.xref_keys:
            if xk not in fm:
                continue
            for ref in collect_xref_slugs(xk, fm[xk]):
                if ref not in slug_index:
                    findings.append(Finding("BROKEN_XREF", "error", rel,
                                            f"`{xk}` -> `{ref}` does not match any file slug in the KB."))

        # canonical_for uniqueness (every doc); accepts scalar or list
        cf = fm.get("canonical_for")
        cf_topics = cf if isinstance(cf, list) else ([cf] if isinstance(cf, str) and cf.strip() else [])
        if cf_topics:
            for topic in cf_topics:
                t = str(topic).strip().lower()
                if not t:
                    continue
                if t in canonical_owner and canonical_owner[t] != rel:
                    findings.append(Finding("DUP_CANONICAL", "error", rel,
                                            f"canonical_for `{topic}` already claimed by "
                                            f"`{canonical_owner[t]}`."))
                else:
                    canonical_owner.setdefault(t, rel)

        # canary tracking
        canary = fm.get("metadata_canary")
        if isinstance(canary, str) and canary.strip():
            canary_values.setdefault(canary.strip(), []).append(rel)

        # ---- content-quality checks (skip exempt docs) ----
        exempt, why = is_quality_exempt(f, fm, contract)
        if exempt:
            findings.append(Finding("EXEMPT_QUALITY", "info", rel,
                                    f"Quality bar skipped ({why}); structural checks still applied."))
            continue

        # guidance-only (has guidance keys but thin/no RAG core) -> info, relax core
        has_guidance = any(not is_empty(fm.get(k)) for k in contract.guidance_keys)
        has_any_core = any(not is_empty(fm.get(k)) for k in contract.required_core)
        if has_guidance and not has_any_core:
            findings.append(Finding("GUIDANCE_ONLY", "info", rel,
                                    "Guidance-only doc (no RAG core yet) — enrich in Phase 3."))
            continue

        for key in contract.required_core:
            if key not in fm:
                findings.append(Finding("MISSING_CORE_KEY", "warning", rel,
                                        f"missing required core key `{key}`."))
            elif is_empty(fm.get(key)):
                findings.append(Finding("EMPTY_VALUE", "warning", rel,
                                        f"core key `{key}` is present but empty."))

        # Per-KB custom fields declared in 00_CONTEXT kb_schema
        for ckey, cspec in kb_schema.items():
            cspec = cspec if isinstance(cspec, dict) else {}
            ctype = cspec.get("type")
            required = bool(cspec.get("required"))
            present = ckey in fm and not is_empty(fm.get(ckey))
            if required and not present:
                findings.append(Finding("CUSTOM_REQUIRED_MISSING", "error", rel,
                                        f"KB requires custom field `{ckey}` (declared in 00_CONTEXT kb_schema)."))
            if present and ctype and not value_matches_type(fm[ckey], ctype):
                findings.append(Finding("WRONG_TYPE", "error", rel,
                                        f"custom field `{ckey}` should be type `{ctype}`."))

        # per-key rules
        for key, spec in contract.rules.items():
            if key not in fm or is_empty(fm.get(key)):
                continue
            val = fm[key]
            t = spec.get("type")
            if t == "list" and not isinstance(val, list):
                findings.append(Finding("WRONG_TYPE", "error", rel,
                                        f"`{key}` should be a YAML list."))
                continue
            if t == "map" and not isinstance(val, dict):
                findings.append(Finding("WRONG_TYPE", "error", rel,
                                        f"`{key}` should be a YAML mapping."))
                continue
            if t == "int" and not isinstance(val, bool) and not isinstance(val, int):
                findings.append(Finding("WRONG_TYPE", "error", rel,
                                        f"`{key}` should be an integer (reading-order position)."))
                continue
            if t == "str_or_list" and not isinstance(val, (str, list)):
                findings.append(Finding("WRONG_TYPE", "error", rel,
                                        f"`{key}` should be a string or a YAML list."))
                continue
            if isinstance(val, list):
                if "min" in spec and len(val) < spec["min"]:
                    findings.append(Finding("LIST_LEN", "warning", rel,
                                            f"`{key}` has {len(val)} entries; want >= {spec['min']}."))
                if "max" in spec and len(val) > spec["max"]:
                    findings.append(Finding("LIST_LEN", "warning", rel,
                                            f"`{key}` has {len(val)} entries; want <= {spec['max']}."))
            if isinstance(val, str):
                if "min_chars" in spec and len(val.strip()) < spec["min_chars"]:
                    code = "SUMMARY_TOO_SHORT" if key == "summary" else "EMPTY_VALUE"
                    findings.append(Finding(code, "warning", rel,
                                            f"`{key}` is {len(val.strip())} chars; want >= {spec['min_chars']}."))
                must = spec.get("must_contain_any")
                if must:
                    low = val.lower()
                    if not any(m in low for m in must):
                        findings.append(Finding("NO_NEGATIVE_CLAUSE", "warning", rel,
                                                f"`{key}` has no negative clause (e.g. 'Do NOT use for ...') "
                                                f"— add one to stop over-retrieval."))

    # canary consistency across the KB
    if len(canary_values) > 1:
        summary = "; ".join(f"'{k}' ({len(v)})" for k, v in canary_values.items())
        for k, files_ in canary_values.items():
            for rel in files_:
                findings.append(Finding("CANARY_MISMATCH", "warning", rel,
                                        f"metadata_canary values are inconsistent across the KB: {summary}."))

    return findings, skipped_non_kb


# --------------------------------------------------------------------------- #
# Reporting
# --------------------------------------------------------------------------- #
SEV_ORDER = {"error": 0, "warning": 1, "info": 2}


def print_report(findings: list[Finding], root: Path, quiet: bool, skipped: int = 0) -> None:
    errors = [f for f in findings if f.severity == "error"]
    warnings = [f for f in findings if f.severity == "warning"]
    infos = [f for f in findings if f.severity == "info"]

    print(f"\nKB lint — {root}")
    skip_note = f"  •  Skipped (non-KB): {skipped}" if skipped else ""
    print(f"  Errors: {len(errors)}  •  Warnings: {len(warnings)}  •  Info: {len(infos)}{skip_note}\n")

    groups = [("ERRORS (must fix)", errors), ("WARNINGS (recommended)", warnings)]
    if not quiet:
        groups.append(("INFO", infos))

    for title, items in groups:
        if not items:
            continue
        print(f"== {title} ==")
        by_file: dict[str, list[Finding]] = {}
        for it in sorted(items, key=lambda x: x.file):
            by_file.setdefault(it.file, []).append(it)
        for file, fs in by_file.items():
            print(f"  {file}")
            for f in fs:
                print(f"    [{f.code}] {f.message}")
        print()


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description="Lint KB frontmatter against the metadata contract.")
    ap.add_argument("path", help="KB or vault folder to lint")
    ap.add_argument("--json", action="store_true", help="emit findings as JSON")
    ap.add_argument("--strict", action="store_true", help="warnings also fail the run")
    ap.add_argument("--quiet", action="store_true", help="hide INFO findings in human output")
    ap.add_argument("--all", action="store_true", help="lint every .md (skip KB-managed scoping)")
    args = ap.parse_args(argv)

    root = Path(args.path).resolve()
    if not root.exists():
        sys.stderr.write(f"path not found: {root}\n")
        return 2

    contract = load_contract()
    findings, skipped = lint(root, contract, lint_all=args.all)

    if args.json:
        print(json.dumps([f.__dict__ for f in findings], indent=2))
    else:
        print_report(findings, root, args.quiet, skipped)

    n_err = sum(1 for f in findings if f.severity == "error")
    n_warn = sum(1 for f in findings if f.severity == "warning")
    if n_err or (args.strict and n_warn):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
