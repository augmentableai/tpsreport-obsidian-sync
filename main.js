/*
  TPSReport Sync (Obsidian Plugin) - no build step / no npm required.

  Install by copying:
    - manifest.json
    - main.js
  into your vault:
    <VAULT>/.obsidian/plugins/tpsreport-sync/
*/

const {
  Plugin,
  PluginSettingTab,
  Setting,
  Notice,
  TFile,
  TFolder,
  Modal,
  ButtonComponent,
  parseYaml,
  stringifyYaml,
  getFrontMatterInfo
} = require("obsidian");

function isoNow() {
  return new Date().toISOString();
}

const SHARING_PRESETS = [
  {
    key: "private",
    label: "Private (only me)",
    description: "Only the author can view and edit. RAG is scoped to this user.",
    accessLevel: "author",
    editScope: "author",
    collectionScope: "user"
  },
  {
    key: "team",
    label: "Team (workspace)",
    description: "Members of the current workspace can view and edit. RAG is scoped to the workspace.",
    accessLevel: "workspace",
    editScope: "workspace",
    collectionScope: "workspace"
  },
  {
    key: "agency",
    label: "Agency (account)",
    description: "The broader account can view and edit. RAG is scoped to the account.",
    accessLevel: "account",
    editScope: "account",
    collectionScope: "account"
  },
  {
    key: "public",
    label: "Public",
    description: "Anyone with access to the URL can view. Editing stays author-only.",
    accessLevel: "public",
    editScope: "author",
    collectionScope: "account"
  }
];

function sharingPresetForKey(key) {
  return SHARING_PRESETS.find((preset) => preset.key === key) || SHARING_PRESETS[0];
}

function sharingPresetKeyFromSettings(settings) {
  const accessLevel = settings?.defaultAccessLevel || "author";
  const editScope = settings?.defaultEditScope || "author";
  const collectionScope = settings?.defaultCollectionScope || "user";
  if (accessLevel === "public") return "public";
  if (accessLevel === "workspace" || editScope === "workspace" || collectionScope === "workspace") return "team";
  if (accessLevel === "account" || editScope === "account" || collectionScope === "account") return "agency";
  return "private";
}

function sharingPresetKeyFromReportSettings(settings) {
  if (!settings) return "private";
  if (settings.sharing_preset) return settings.sharing_preset;
  const accessLevel = String(settings.access_level || "author").toLowerCase();
  const editScope = String(settings.edit_scope || "author").toLowerCase();
  const collectionScope = String(settings.collection_scope || "user").toLowerCase();
  if (accessLevel === "public") return "public";
  if (accessLevel === "workspace" || editScope === "workspace" || collectionScope === "workspace") return "team";
  if (accessLevel === "account" || editScope === "account" || collectionScope === "account") return "agency";
  return "private";
}

function applySharingPresetToSettings(settings, key) {
  const preset = sharingPresetForKey(key);
  settings.defaultAccessLevel = preset.accessLevel;
  settings.defaultEditScope = preset.editScope;
  settings.defaultCollectionScope = preset.collectionScope;
}

function sharingPresetsForKeys(keys) {
  if (!Array.isArray(keys) || !keys.length) return SHARING_PRESETS;
  const allowed = new Set(keys.map((key) => (key || "").toString().trim().toLowerCase()).filter(Boolean));
  const presets = SHARING_PRESETS.filter((preset) => allowed.has(preset.key));
  return presets.length ? presets : SHARING_PRESETS.filter((preset) => preset.key === "private" || preset.key === "public");
}

function coerceSharingPresetKey(key, presets) {
  const allowed = Array.isArray(presets) && presets.length ? presets : SHARING_PRESETS;
  const candidate = (key || "").toString().trim().toLowerCase();
  if (allowed.some((preset) => preset.key === candidate)) return candidate;
  return allowed[0]?.key || "private";
}

function sha256String(str) {
  // Browser crypto (Obsidian desktop)
  const enc = new TextEncoder().encode(str);
  return crypto.subtle.digest("SHA-256", enc).then((buf) => {
    const bytes = new Uint8Array(buf);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  });
}

async function sha256Bytes(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const buf = await crypto.subtle.digest("SHA-256", u8);
  const out = new Uint8Array(buf);
  return Array.from(out)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function splitFrontmatter(markdown) {
  const text = markdown || "";

  if (typeof getFrontMatterInfo === "function") {
    try {
      const info = getFrontMatterInfo(text);
      if (info && info.exists && typeof info.frontmatter === "string" && typeof info.contentStart === "number") {
        return {
          exists: true,
          raw: info.frontmatter,
          body: text.slice(info.contentStart)
        };
      }
    } catch (e) {
      console.warn("TPSReport: Obsidian frontmatter boundary detection failed; using fallback splitter", e);
    }
  }

  const open = text.match(/^---[ \t]*\r?\n/);
  if (!open) {
    return { exists: false, raw: "", body: text };
  }

  const close = /\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/g;
  close.lastIndex = open[0].length;
  const match = close.exec(text);
  if (!match) {
    return { exists: false, raw: "", body: text };
  }

  return {
    exists: true,
    raw: text.slice(open[0].length, match.index),
    body: text.slice(match.index + match[0].length)
  };
}

function parseSimpleFrontmatterBlock(rawYaml) {
  const frontmatter = {};
  for (const rawLine of (rawYaml || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith("- ")) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (!key) continue;
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (value === "true") {
      frontmatter[key] = true;
      continue;
    }
    if (value === "false") {
      frontmatter[key] = false;
      continue;
    }
    if (value === "null") {
      frontmatter[key] = null;
      continue;
    }
    if (value.startsWith("[") && value.endsWith("]")) {
      const inner = value.slice(1, -1).trim();
      frontmatter[key] = inner
        ? inner.split(",").map((s) => s.trim()).filter(Boolean).map((s) => s.replace(/^['"]|['"]$/g, ""))
        : [];
      continue;
    }
    frontmatter[key] = value;
  }
  return frontmatter;
}

function parseFrontmatter(markdown) {
  const split = splitFrontmatter(markdown);
  if (!split.exists) return { frontmatter: {}, body: split.body, rawFrontmatter: "", hasFrontmatter: false };

  try {
    const parsed = typeof parseYaml === "function" ? parseYaml(split.raw) : parseSimpleFrontmatterBlock(split.raw);
    const frontmatter = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    return { frontmatter, body: split.body, rawFrontmatter: split.raw, hasFrontmatter: true };
  } catch (e) {
    console.warn("TPSReport: could not parse YAML frontmatter; falling back to simple parser", e);
    return {
      frontmatter: parseSimpleFrontmatterBlock(split.raw),
      body: split.body,
      rawFrontmatter: split.raw,
      hasFrontmatter: true,
      parse_error: e
    };
  }
}

function cleanFrontmatterObject(frontmatter) {
  const out = {};
  for (const [key, value] of Object.entries(frontmatter || {})) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}

function stripZeroWidth(s) {
  return (s || "").replace(/\uFEFF/g, "").replace(/\u200B/g, "");
}

// Count *leading* frontmatter blocks. A block only counts if it parses to a
// mapping, which separates a real `---` block from a `---` thematic rule in
// prose. Zero-width/BOM chars (which hide a fence from every parser) are
// stripped first. Mirrors kb_lint.py's extract_frontmatter_blocks.
function extractLeadingFrontmatterBlocks(markdown) {
  const hadBom = /[\uFEFF\u200B]/.test(markdown || "");
  const text = stripZeroWidth(markdown || "");
  const lines = text.split("\n");
  const blocks = [];
  const isFence = (s) => {
    const t = s.trim();
    return t === "---" || t === "...";
  };
  let i = 0;
  const n = lines.length;
  while (i < n) {
    while (i < n && lines[i].trim() === "") i++;
    if (i >= n || lines[i].trim() !== "---") break;
    let j = i + 1;
    while (j < n && !isFence(lines[j])) j++;
    if (j >= n) break;
    const rawBlock = lines.slice(i + 1, j).join("\n");
    let parsed = null;
    try {
      parsed = typeof parseYaml === "function" ? parseYaml(rawBlock) : parseSimpleFrontmatterBlock(rawBlock);
    } catch (e) {
      parsed = null;
    }
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      blocks.push(parsed);
      i = j + 1;
      continue;
    }
    if ((parsed === null || parsed === undefined) && rawBlock.trim() === "") {
      blocks.push({});
      i = j + 1;
      continue;
    }
    break;
  }
  return { blocks, body: lines.slice(i).join("\n"), hadBom };
}

function mergeFrontmatterBlocks(blocks) {
  const merged = {};
  for (const b of blocks || []) {
    if (!b || typeof b !== "object") continue;
    for (const [k, v] of Object.entries(b)) merged[k] = v;
  }
  return merged;
}

// Contract mirrors (kept in sync with .cursor/skills/tpsreport-skill/
// metadata-contract.yaml). Used by the Gatekeeper health check.
const KB_REQUIRED_CORE_KEYS = [
  "summary",
  "keywords",
  "hyde_questions",
  "retrieval_hint",
  "intents",
  "scenarios"
];

const KB_KEY_SYNONYMS = {
  questions: "hyde_questions",
  question: "hyde_questions",
  hyde: "hyde_questions",
  tldr: "summary",
  abstract: "summary",
  overview: "summary",
  intent: "intents",
  keyword: "keywords",
  hint: "retrieval_hint",
  router_hint: "retrieval_hint",
  scenario: "scenarios"
};

function kbValueIsEmpty(v) {
  if (v == null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") return Object.keys(v).length === 0;
  return false;
}

function kbValueMatchesType(val, t) {
  switch (t) {
    case "str":
      return typeof val === "string";
    case "int":
      return typeof val === "number" && Number.isInteger(val);
    case "float":
      return typeof val === "number";
    case "bool":
      return typeof val === "boolean";
    case "list":
      return Array.isArray(val);
    case "map":
      return val && typeof val === "object" && !Array.isArray(val);
    case "str_or_list":
      return typeof val === "string" || Array.isArray(val);
    default:
      return true;
  }
}

function renderScalarYamlValue(value) {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  const text = String(value);
  if (!text || /[:#\[\]\{\},&*?|<>=!%@`"'\\]|\s$|^\s/.test(text)) {
    return JSON.stringify(text);
  }
  return text;
}

function renderSimpleYaml(frontmatter) {
  const lines = [];
  for (const [key, value] of Object.entries(cleanFrontmatterObject(frontmatter))) {
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) lines.push(`  - ${renderScalarYamlValue(item)}`);
    } else if (value && typeof value === "object") {
      lines.push(`${key}: ${JSON.stringify(value)}`);
    } else {
      lines.push(`${key}: ${renderScalarYamlValue(value)}`);
    }
  }
  return lines.join("\n");
}

function renderFrontmatter(frontmatter) {
  const clean = cleanFrontmatterObject(frontmatter);
  const yaml = typeof stringifyYaml === "function"
    ? stringifyYaml(clean).trimEnd()
    : renderSimpleYaml(clean);
  return `---\n${yaml}\n---\n`;
}

function applyFrontmatterPatch(frontmatter, patch) {
  const merged = Object.assign({}, frontmatter || {});
  for (const [key, value] of Object.entries(patch || {})) {
    if (value === undefined) delete merged[key];
    else merged[key] = value;
  }
  return merged;
}

function upsertFrontmatter(markdown, patch) {
  const { frontmatter, body } = parseFrontmatter(markdown);
  const merged = applyFrontmatterPatch(frontmatter, patch || {});
  return renderFrontmatter(merged) + (body || "").replace(/^\r?\n/, "");
}

async function patchFileFrontmatter(app, file, patch) {
  if (app.fileManager && typeof app.fileManager.processFrontMatter === "function") {
    await app.fileManager.processFrontMatter(file, (frontmatter) => {
      for (const [key, value] of Object.entries(patch || {})) {
        if (value === undefined) delete frontmatter[key];
        else frontmatter[key] = value;
      }
    });
    return;
  }

  const raw = await app.vault.read(file);
  await app.vault.modify(file, upsertFrontmatter(raw, patch));
}

async function apiFetch(baseUrl, apiKey, path, init) {
  const url = baseUrl.replace(/\/$/, "") + path;
  const resp = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(init && init.headers ? init.headers : {})
    }
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`HTTP ${resp.status}: ${text || resp.statusText}`);
  }
  return resp.json();
}

async function apiFetchBytes(baseUrl, apiKey, path, init) {
  const url = baseUrl.replace(/\/$/, "") + path;
  const resp = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(init && init.headers ? init.headers : {})
    }
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`HTTP ${resp.status}: ${text || resp.statusText}`);
  }
  const contentType = resp.headers.get("content-type") || "application/octet-stream";
  const ab = await resp.arrayBuffer();
  return { bytes: new Uint8Array(ab), contentType };
}

async function apiFetchMultipart(baseUrl, apiKey, path, formData) {
  const url = baseUrl.replace(/\/$/, "") + path;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`
      // NOTE: DO NOT set Content-Type for FormData; fetch will set boundary.
    },
    body: formData
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`HTTP ${resp.status}: ${text || resp.statusText}`);
  }
  return resp.json();
}

function normalizePath(path) {
  return (path || "").replace(/\\/g, "/").replace(/^\/+/, "");
}

function ensureFolderPath(path) {
  const p = normalizePath(path);
  return p.endsWith("/") ? p.slice(0, -1) : p;
}

function sanitizeName(name) {
  const n = (name || "Untitled").trim();
  return (
    n
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 180) || "Untitled"
  );
}

function joinPath(a, b) {
  const left = ensureFolderPath(a || "");
  const right = normalizePath(b || "");
  if (!left) return right;
  if (!right) return left;
  return `${left}/${right}`;
}

/** Strip report path prefix from TPS node.path → vault-relative folder/file segments. */
function pathRelativeToReport(nodePath, reportPath) {
  const np = normalizePath(nodePath || "");
  const rp = normalizePath(reportPath || "");
  if (!np || !rp) return "";
  if (np === rp) return "";
  if (np.startsWith(rp + "/")) return np.slice(rp.length + 1);
  return "";
}

function vaultPathFromRelative(rootVault, relativePath) {
  const rel = normalizePath(relativePath || "");
  const root = normalizePath(rootVault || "");
  if (!rel) return ensureFolderPath(rootVault);
  // Full vault path already includes the report folder prefix
  if (root && (rel === root || rel.startsWith(root + "/"))) return rel;
  return joinPath(rootVault, rel);
}

/** Folder path for a section node (vault_relative_path may be folder or index file path). */
function vaultFolderFromNodeVaultPath(vaultRel) {
  const rel = normalizePath(vaultRel || "");
  if (!rel) return "";
  if (rel.toLowerCase().endsWith(".md")) {
    const parts = rel.split("/");
    parts.pop();
    return parts.join("/");
  }
  return rel;
}

function titleFromVaultFilename(filePath) {
  const parts = normalizePath(filePath || "").split("/");
  const file = parts.pop() || "";
  const base = file.toLowerCase().endsWith(".md") ? file.slice(0, -3) : file;
  return sanitizeName(base);
}

/**
 * Resolve vault file path for pull: prefer existing local file, then server vault_relative_path,
 * then TPS node.path, then title-based fallback.
 */
function resolveVaultFilePath(node, rootVault, reportPath, existingFile, titleFallbackFolder) {
  if (existingFile && existingFile.path) return existingFile.path;
  const vaultRel = normalizePath(node.vault_relative_path || "");
  if (vaultRel) return vaultPathFromRelative(rootVault, vaultRel);
  const relFromPath = pathRelativeToReport(node.path, reportPath);
  if (relFromPath) {
    if (node.type === "page") {
      return vaultPathFromRelative(rootVault, `${relFromPath}.md`);
    }
    if (relFromPath.toLowerCase().endsWith(".md")) {
      return vaultPathFromRelative(rootVault, relFromPath);
    }
  }
  const folder = titleFallbackFolder || rootVault;
  const name = sanitizeName(node.title || "Untitled");
  return `${ensureFolderPath(folder)}/${name}.md`;
}

function resolveSectionVaultFolder(sectionNode, rootVault, reportPath, ancestorTitleFolders) {
  const vaultRel = normalizePath(sectionNode.vault_relative_path || "");
  if (vaultRel) {
    const folderRel = vaultFolderFromNodeVaultPath(vaultRel);
    return folderRel ? vaultPathFromRelative(rootVault, folderRel) : rootVault;
  }
  if (ancestorTitleFolders && ancestorTitleFolders.length) {
    return joinPath(rootVault, ancestorTitleFolders.join("/"));
  }
  const relFromPath = pathRelativeToReport(sectionNode.path, reportPath);
  if (relFromPath) return vaultPathFromRelative(rootVault, relFromPath);
  return joinPath(rootVault, sanitizeName(sectionNode.title || "Section"));
}

function routeBaseFromReportSource(reportSource) {
  const source = (reportSource || "resourcesv3").toString().trim().toLowerCase();
  const routeMap = {
    resourcesv3: "/resourcesV3",
    blogcomposer: "/blogcomposer",
    "niche-site-builder": "/niche-site-builder-agent",
    "niche-site-builder-agent": "/niche-site-builder-agent",
    "cta-affiliates-and-monetization-agent": "/cta-affiliates-and-monetization-agent"
  };
  return routeMap[source] || "/resourcesV3";
}

function fallbackReportDestinations() {
  return [
    {
      key: "resourcesv3",
      destination_key: "resourcesv3",
      label: "Resources V3",
      route_base: "/resourcesV3",
      is_default: true
    }
  ];
}

function normalizeReportDestination(raw) {
  const key = (raw?.key || raw?.destination_key || "resourcesv3").toString().trim().toLowerCase() || "resourcesv3";
  const routeBase = (raw?.route_base || routeBaseFromReportSource(key)).toString().trim() || "/resourcesV3";
  return {
    ...raw,
    key,
    destination_key: key,
    label: (raw?.label || key).toString(),
    route_base: routeBase.startsWith("/") ? routeBase : `/${routeBase}`,
    is_default: !!raw?.is_default
  };
}

async function ensureUniqueFilePath(app, desiredPath) {
  const clean = normalizePath(desiredPath);
  const existing = app.vault.getAbstractFileByPath(clean);
  if (!existing) return clean;
  const parts = clean.split("/");
  const file = parts.pop();
  const dir = parts.join("/");
  const dot = file.lastIndexOf(".");
  const base = dot >= 0 ? file.slice(0, dot) : file;
  const ext = dot >= 0 ? file.slice(dot) : "";
  for (let i = 2; i < 200; i++) {
    const cand = (dir ? `${dir}/` : "") + `${base} (${i})${ext}`;
    if (!app.vault.getAbstractFileByPath(cand)) return cand;
  }
  return clean;
}

async function ensureFolderExists(app, folderPath) {
  const path = ensureFolderPath(folderPath);
  if (!path) return;
  const existing = app.vault.getAbstractFileByPath(path);
  if (existing && existing instanceof TFolder) return;
  // Create nested folders
  const parts = path.split("/");
  let current = "";
  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    const abs = app.vault.getAbstractFileByPath(current);
    if (!abs) {
      await app.vault.createFolder(current);
    }
  }
}

function nodeIdKey(plugin) {
  return (plugin.settings.frontmatterNodeIdKey || "node_id").trim() || "node_id";
}

function isInObsidianSystemPath(path) {
  return normalizePath(path).startsWith(".obsidian/");
}

function stripSyncFrontmatterFields(frontmatter) {
  const fm = Object.assign({}, frontmatter || {});
  // Local-only fields (plugin bookkeeping)
  delete fm.sync_status;
  delete fm.tps_sync_status;
  delete fm.last_synced;
  delete fm.tps_content_hash;
  delete fm.tps_meta_hash;
  delete fm.tps_conflict_reason;
  delete fm.tps_remote_conflict_path;
  delete fm.tps_remote_conflict_hash;
  return fm;
}

const GUIDANCE_FM_KEYS = [
  "research_notes",
  "llm_instructions",
  "source_materials",
  "content_structure",
  "model_preferences",
  "research_brief",
];

// Production defaults. The plugin requires a TPSReport account; these point at the
// managed TPSReport production services. The API base URL is fixed in production
// and is NOT user-editable (forced to this value on load — see onload).
const DEFAULT_API_BASE_URL = "https://wordpressgpt-api-325927718367.us-central1.run.app";
const DEFAULT_SITE_URL = "https://tpsreport.pro";

const RAG_FM_KEYS = [
  "summary",
  "keywords",
  "intents",
  "hyde_questions",
  "retrieval_hint",
  "scenarios",
  "canonical_for",
  "defers_to",
  "lifecycle_position",
  "prerequisites",
  "unlocks",
  "see_also",
  "entities",
  "topics",
  "brands",
  "product_skus",
  "product_categories",
  "region",
  "audience",
  "metadata_canary",
];

function buildMetaFingerprint(frontmatter) {
  const safe = stripSyncFrontmatterFields(frontmatter || {});
  const payload = {};
  for (const k of GUIDANCE_FM_KEYS) {
    if (safe[k] !== undefined) payload[k] = safe[k];
  }
  for (const k of RAG_FM_KEYS) {
    if (safe[k] !== undefined) payload[k] = safe[k];
  }
  for (const k of ["index_type", "guidance_type", "title"]) {
    if (safe[k] !== undefined) payload[k] = safe[k];
  }
  const keys = Object.keys(payload).sort();
  const ordered = {};
  for (const k of keys) ordered[k] = payload[k];
  return ordered;
}

async function computeMetaHash(frontmatter) {
  const payload = buildMetaFingerprint(frontmatter);
  return sha256String(JSON.stringify(payload));
}

function classifyIndexFile(fileName, relativePath, frontmatter) {
  const name = (fileName || "").toLowerCase();
  if (name !== "00_index.md" && name !== "00_guidance.md") return null;
  const depth = (relativePath || "").split("/").length - 1;
  if (name === "00_index.md") {
    return depth === 0 ? "report" : "section";
  }
  const t = String(frontmatter?.index_type || frontmatter?.guidance_type || "").toLowerCase();
  if (t === "report" || depth === 0) return "report";
  return "section";
}

function looksLikeRemoteUrl(value) {
  const v = (value || "").trim().toLowerCase();
  return v.startsWith("http://") || v.startsWith("https://") || v.startsWith("data:") || v.startsWith("app://");
}

function extractAssetIdFromTpsUrl(url) {
  const u = (url || "").trim();
  // Match both:
  // - /api/tpsreport/report-assets/images/{asset_id}
  // - /api/tpsreport/public/report-assets/images/{asset_id}
  const m = u.match(/\/api\/tpsreport\/(?:public\/)?report-assets\/images\/([a-zA-Z0-9_\-]+)/);
  return m ? m[1] : null;
}

function extForContentType(contentType) {
  const ct = (contentType || "").toLowerCase();
  if (ct.includes("png")) return ".png";
  if (ct.includes("jpeg") || ct.includes("jpg")) return ".jpg";
  if (ct.includes("webp")) return ".webp";
  if (ct.includes("gif")) return ".gif";
  return ".bin";
}

function contentTypeForFilename(filename) {
  const name = (filename || "").toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".gif")) return "image/gif";
  return "application/octet-stream";
}

class ImageSyncManager {
  constructor(plugin) {
    this.plugin = plugin;
  }

  get enabled() {
    return this.plugin.settings.imageSyncEnabled !== false;
  }

  get assetsFolder() {
    return ensureFolderPath(this.plugin.settings.imageAssetsFolder || "_TPS_Assets");
  }

  get ledger() {
    if (!this.plugin.settings.imageLedger || typeof this.plugin.settings.imageLedger !== "object") {
      this.plugin.settings.imageLedger = { by_local_path: {}, by_web_url: {} };
    }
    if (!this.plugin.settings.imageLedger.by_local_path) this.plugin.settings.imageLedger.by_local_path = {};
    if (!this.plugin.settings.imageLedger.by_web_url) this.plugin.settings.imageLedger.by_web_url = {};
    return this.plugin.settings.imageLedger;
  }

  async saveLedger() {
    await this.plugin.saveSettings();
  }

  async ensureAssetsFolder() {
    await ensureFolderExists(this.plugin.app, this.assetsFolder);
  }

  resolveLocalFileForLink(linkPath, sourceMarkdownPath) {
    const link = (linkPath || "").trim();
    if (!link) return null;
    try {
      const dest = this.plugin.app.metadataCache.getFirstLinkpathDest(link, sourceMarkdownPath);
      if (dest && dest instanceof TFile) return dest;
    } catch (e) {
      // ignore
    }
    const direct = this.plugin.app.vault.getAbstractFileByPath(normalizePath(link));
    if (direct && direct instanceof TFile) return direct;
    return null;
  }

  async uploadIfNeeded({ baseUrl, apiKey, sectionPath, localFile }) {
    const key = localFile.path;
    const existing = this.ledger.by_local_path[key] || null;

    let bytes;
    try {
      bytes = await this.plugin.app.vault.readBinary(localFile);
    } catch (e) {
      // Fallback: some older Obsidian APIs
      const txt = await this.plugin.app.vault.read(localFile);
      bytes = new TextEncoder().encode(txt);
    }
    const fileHash = await sha256Bytes(bytes);

    if (existing && existing.file_hash === fileHash && existing.web_url) {
      return { web_url: existing.web_url, asset_id: existing.asset_id, file_hash: fileHash };
    }

    const form = new FormData();
    const contentType = contentTypeForFilename(localFile.name || (existing && existing.file_name) || "");
    form.append("file", new Blob([bytes], { type: contentType }), localFile.name || "image.png");
    form.append("section_path", sectionPath);

    const res = await apiFetchMultipart(baseUrl, apiKey, "/api/obsidian/assets/images/upload", form);
    const asset = res.asset || {};
    if (!asset.id || !asset.web_url) throw new Error("Upload succeeded but missing asset.id/web_url");

    this.ledger.by_local_path[key] = {
      asset_id: asset.id,
      web_url: asset.web_url,
      file_hash: fileHash,
      file_name: asset.file_name || localFile.name,
      content_type: asset.content_type || contentType
    };
    this.ledger.by_web_url[asset.web_url] = { local_path: key, asset_id: asset.id };
    await this.saveLedger();

    return { web_url: asset.web_url, asset_id: asset.id, file_hash: fileHash };
  }

  async transformBodyForPush({ body, sourceMarkdownPath, sectionPath, baseUrl, apiKey, allowUploads }) {
    if (!this.enabled) return body || "";
    const input = body || "";

    // Replace Obsidian embed wikilinks: ![[path|alias]]
    const wikilinkRe = /!\[\[([^\]]+?)\]\]/g;
    let out = "";
    let lastIdx = 0;
    for (const match of input.matchAll(wikilinkRe)) {
      const full = match[0];
      const inner = match[1] || "";
      const start = match.index || 0;
      out += input.slice(lastIdx, start);
      lastIdx = start + full.length;

      const parts = inner.split("|");
      const path = (parts[0] || "").trim();
      const alias = (parts[1] || "").trim();
      const localFile = this.resolveLocalFileForLink(path, sourceMarkdownPath);
      if (!localFile) {
        out += full;
        continue;
      }

      const ledgerEntry = this.ledger.by_local_path[localFile.path] || null;
      if (!allowUploads && (!ledgerEntry || !ledgerEntry.web_url)) {
        out += full;
        continue;
      }

      const uploaded = allowUploads
        ? await this.uploadIfNeeded({ baseUrl, apiKey, sectionPath, localFile })
        : { web_url: ledgerEntry.web_url };

      const alt = alias && !/^\d+$/.test(alias) ? alias : "";
      out += `![${alt}](${uploaded.web_url})`;
    }
    out += input.slice(lastIdx);

    // Replace markdown images with local paths: ![alt](relative.png)
    const mdImgRe = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let out2 = "";
    let lastIdx2 = 0;
    for (const match of out.matchAll(mdImgRe)) {
      const full = match[0];
      const alt = (match[1] || "").trim();
      const url = (match[2] || "").trim();
      const start = match.index || 0;
      out2 += out.slice(lastIdx2, start);
      lastIdx2 = start + full.length;

      if (!url || looksLikeRemoteUrl(url)) {
        out2 += full;
        continue;
      }
      const localFile = this.resolveLocalFileForLink(url, sourceMarkdownPath);
      if (!localFile) {
        out2 += full;
        continue;
      }

      const ledgerEntry = this.ledger.by_local_path[localFile.path] || null;
      if (!allowUploads && (!ledgerEntry || !ledgerEntry.web_url)) {
        out2 += full;
        continue;
      }

      const uploaded = allowUploads
        ? await this.uploadIfNeeded({ baseUrl, apiKey, sectionPath, localFile })
        : { web_url: ledgerEntry.web_url };

      out2 += `![${alt}](${uploaded.web_url})`;
    }
    out2 += out.slice(lastIdx2);

    // Transform Standard Wikilinks [[Link]] -> [Link](Link)
    const linkRe = /\[\[([^\]]+?)\]\]/g;
    let out3 = "";
    let lastIdx3 = 0;
    for (const match of out2.matchAll(linkRe)) {
      const full = match[0];
      const inner = match[1] || "";
      const start = match.index || 0;
      out3 += out2.slice(lastIdx3, start);
      lastIdx3 = start + full.length;

      const parts = inner.split("|");
      const path = (parts[0] || "").trim();
      const alias = (parts[1] || "").trim();
      const label = alias || path;
      
      // Slugify path for web to match backend reconcile.py logic:
      // - strip order prefixes like "01_", "1.2-", "A."
      // - normalize separators to spaces
      // - split camelCase
      // - lowercase + slugify
      const cleanPath = path
        .replace(/\.md$/i, "")
        .split("/")
        .map((part) => {
          let p = (part || "").trim();
          // strip order prefixes (numeric or single-letter) followed by .-_ 
          p = p.replace(/^(?:\d+(?:\.\d+)*|[A-Za-z])[.\-_]+\s*/, "");
          // normalize separators to spaces
          p = p.replace(/[_\-]+/g, " ");
          // split camelCase / PascalCase
          p = p.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
          // collapse whitespace
          p = p.replace(/\s+/g, " ").trim();
          // slugify
          p = p.toLowerCase();
          p = p.replace(/\s+/g, "-");
          p = p.replace(/[^a-z0-9\-_]+/g, "");
          p = p.replace(/-{2,}/g, "-").replace(/^-+|-+$/g, "");
          return p || "untitled";
        })
        .join("/");

      out3 += `[${label}](${cleanPath})`;
    }
    out3 += out2.slice(lastIdx3);

    return out3;
  }

  async ensureOfflineLocalForRemoteUrl({ baseUrl, apiKey, reportId, remoteUrl }) {
    if (!this.enabled) return null;
    const existing = this.ledger.by_web_url[remoteUrl] || null;
    if (existing && existing.local_path) {
      const af = this.plugin.app.vault.getAbstractFileByPath(existing.local_path);
      if (af && af instanceof TFile) return existing.local_path;
      // local file missing; fall through to re-download
    }

    const assetId = extractAssetIdFromTpsUrl(remoteUrl);
    if (!assetId) return null;

    const dl = await apiFetchBytes(
      baseUrl,
      apiKey,
      `/api/obsidian/assets/images/${encodeURIComponent(assetId)}?report_id=${encodeURIComponent(reportId)}`
    );
    const ext = extForContentType(dl.contentType);
    await this.ensureAssetsFolder();
    const localPath = `${this.assetsFolder}/asset_${assetId}${ext}`;
    const existingFile = this.plugin.app.vault.getAbstractFileByPath(localPath);
    if (existingFile && existingFile instanceof TFile) {
      if (typeof this.plugin.app.vault.modifyBinary === "function") {
        await this.plugin.app.vault.modifyBinary(existingFile, dl.bytes);
      } else {
        // fallback: overwrite via delete/create
        await this.plugin.app.vault.delete(existingFile);
        await this.plugin.app.vault.createBinary(localPath, dl.bytes);
      }
    } else {
      await this.plugin.app.vault.createBinary(localPath, dl.bytes);
    }

    this.ledger.by_web_url[remoteUrl] = { local_path: localPath, asset_id: assetId };
    this.ledger.by_local_path[localPath] = { web_url: remoteUrl, asset_id: assetId, file_hash: null };
    await this.saveLedger();

    return localPath;
  }

  async transformBodyForPull({ body, baseUrl, apiKey, reportId }) {
    if (!this.enabled) return body || "";
    const input = body || "";

    const mdImgRe = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let out = "";
    let lastIdx = 0;
    for (const match of input.matchAll(mdImgRe)) {
      const full = match[0];
      const url = (match[2] || "").trim();
      const start = match.index || 0;
      out += input.slice(lastIdx, start);
      lastIdx = start + full.length;

      if (!url || !looksLikeRemoteUrl(url)) {
        out += full;
        continue;
      }

      const localPath = await this.ensureOfflineLocalForRemoteUrl({ baseUrl, apiKey, reportId, remoteUrl: url });
      if (!localPath) {
        out += full;
        continue;
      }
      out += `![[${localPath}]]`;
    }
    out += input.slice(lastIdx);
    return out;
  }
}

class GatekeeperModal extends Modal {
  constructor(app, plugin, results) {
    super(app);
    this.plugin = plugin;
    this.results = results;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "TPSReport Sync — Health Check (Gatekeeper)" });

    const { errors, warnings, info } = this.results;
    contentEl.createEl("p", {
      text: `Errors: ${errors.length} • Warnings: ${warnings.length} • Info: ${info.length}`
    });

    const renderSection = (title, items) => {
      contentEl.createEl("h3", { text: title });
      if (!items.length) {
        contentEl.createEl("p", { text: "None." });
        return;
      }
      const ul = contentEl.createEl("ul");
      for (const it of items) {
        const li = ul.createEl("li");
        li.createEl("strong", { text: it.code });
        li.appendText(` — ${it.message}`);
        if (it.files && it.files.length) {
          const sub = li.createEl("ul");
          for (const f of it.files) sub.createEl("li", { text: f });
        }
        if (it.actions && it.actions.length) {
          const btnRow = li.createEl("div");
          btnRow.style.marginTop = "6px";
          for (const action of it.actions) {
            const btn = btnRow.createEl("button", { text: action.label });
            btn.onclick = async () => {
              try {
                await action.run();
                new Notice(`✅ ${action.label}`);
                this.close();
              } catch (e) {
                console.error(e);
                new Notice(`❌ ${action.label} failed: ${e.message || String(e)}`);
              }
            };
          }
        }
      }
    };

    renderSection("Errors (must fix before safe sync)", errors);
    renderSection("Warnings (recommended)", warnings);
    renderSection("Info", info);

    contentEl.createEl("hr");

    const reportPath = this.plugin.healthReportPath ? this.plugin.healthReportPath() : "_KB_HEALTH.md";
    if (errors.length || warnings.length) {
      const note = contentEl.createEl("p");
      note.style.color = "var(--text-muted)";
      note.appendText(`A durable report was written to "${reportPath}" (top of vault). It stays until the KB is clean, and an LLM/agent can read it to fix the rest next round.`);
    }

    const footer = contentEl.createEl("div");
    footer.style.display = "flex";
    footer.style.gap = "8px";
    footer.style.justifyContent = "flex-end";

    const fixableCount = [...errors, ...warnings, ...info].filter((it) => it.actions && it.actions.length).length;
    if (fixableCount) {
      const healBtn = footer.createEl("button", { text: `Auto-heal all fixable (${fixableCount})` });
      healBtn.classList.add("mod-cta");
      healBtn.onclick = async () => {
        this.close();
        try {
          await this.plugin.cmdAutoHealAll();
        } catch (e) {
          console.error(e);
          new Notice(`❌ Auto-heal failed: ${e.message || String(e)}`);
        }
      };
    }

    const openReportBtn = footer.createEl("button", { text: "Open report" });
    openReportBtn.onclick = async () => {
      const af = this.app.vault.getAbstractFileByPath(reportPath);
      if (af && af instanceof TFile) {
        await this.app.workspace.getLeaf(true).openFile(af);
        this.close();
      } else {
        new Notice("No report file (KB is clean).");
      }
    };

    const closeBtn = footer.createEl("button", { text: "Close" });
    closeBtn.onclick = () => this.close();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

class ConflictResolverModal extends Modal {
  constructor(app, plugin, conflicts) {
    super(app);
    this.plugin = plugin;
    this.conflicts = conflicts || [];
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "TPSReport Sync — Resolve Conflicts" });
    if (!this.conflicts.length) {
      contentEl.createEl("p", { text: "No conflicts found." });
      const btn = contentEl.createEl("button", { text: "Close" });
      btn.onclick = () => this.close();
      return;
    }

    const ul = contentEl.createEl("ul");
    for (const item of this.conflicts) {
      const li = ul.createEl("li");
      li.createEl("strong", { text: item.path });
      li.appendText(` — ${item.reason || "conflict"}`);

      const row = li.createEl("div");
      row.style.display = "flex";
      row.style.gap = "8px";
      row.style.marginTop = "6px";

      const keepLocal = row.createEl("button", { text: "Keep Local (mark pending push)" });
      keepLocal.onclick = async () => {
        try {
          await this.plugin.markFilePending(item.path, item.node_id);
          new Notice("✅ Marked pending");
        } catch (e) {
          console.error(e);
          new Notice(`❌ Failed: ${e.message || String(e)}`);
        }
      };

      const keepRemote = row.createEl("button", { text: "Keep Remote (overwrite local)" });
      keepRemote.onclick = async () => {
        try {
          await this.plugin.applyRemoteOverwrite(item.path);
          new Notice("✅ Applied remote overwrite");
        } catch (e) {
          console.error(e);
          new Notice(`❌ Failed: ${e.message || String(e)}`);
        }
      };

      const openRemote = row.createEl("button", { text: "Open Remote Copy" });
      openRemote.onclick = async () => {
        try {
          const remotePath = item.remote_copy_path;
          if (!remotePath) throw new Error("No remote copy path recorded");
          const af = this.app.vault.getAbstractFileByPath(remotePath);
          if (af && af instanceof TFile) await this.app.workspace.getLeaf(true).openFile(af);
        } catch (e) {
          console.error(e);
          new Notice(`❌ Failed: ${e.message || String(e)}`);
        }
      };
    }

    contentEl.createEl("hr");
    const closeBtn = contentEl.createEl("button", { text: "Close" });
    closeBtn.onclick = () => this.close();
  }

  onClose() {
    this.contentEl.empty();
  }
}

class PublishReportModal extends Modal {
  constructor(app, plugin, folder) {
    super(app);
    this.plugin = plugin;
    this.folder = folder;
    this.resolvedSlug = "";
  }

  // Clean folder name: "1. My Report" → "My Report"
  cleanFolderName(name) {
    return name
      .replace(/^\d+[\.\-\_]\s*/, "")  // Remove leading numbers
      .trim() || "Untitled Report";
  }

  // Slugify (match backend logic)
  slugify(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/[-\s]+/g, "-")
      .substring(0, 100) || "untitled";
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("tps-publish-modal");

    contentEl.createEl("h2", { text: "📊 Publish as New Report" });

    const form = contentEl.createDiv({ cls: "tps-publish-form" });

    // Title field
    const titleLabel = form.createEl("label", { text: "Report Title:" });
    titleLabel.style.display = "block";
    titleLabel.style.marginBottom = "0.5em";
    titleLabel.style.fontWeight = "600";

    const defaultTitle = this.cleanFolderName(this.folder.name);
    const titleInput = form.createEl("input", {
      type: "text",
      value: defaultTitle,
      placeholder: "Enter report title..."
    });
    titleInput.style.width = "100%";
    titleInput.style.padding = "0.5em";
    titleInput.style.marginBottom = "1em";
    titleInput.style.fontSize = "1em";
    titleInput.style.border = "1px solid var(--background-modifier-border)";
    titleInput.style.borderRadius = "4px";
    titleInput.style.background = "var(--background-primary)";
    titleInput.style.color = "var(--text-normal)";

    // Slug preview
    const slugPreview = form.createDiv({ cls: "tps-slug-preview" });
    slugPreview.style.marginBottom = "1em";
    slugPreview.style.padding = "0.75em";
    slugPreview.style.background = "var(--background-secondary)";
    slugPreview.style.borderRadius = "4px";
    slugPreview.style.fontSize = "0.9em";
    
    const slugLabel = slugPreview.createEl("div", { text: "URL Slug (read-only):" });
    slugLabel.style.fontWeight = "600";
    slugLabel.style.marginBottom = "0.25em";
    slugLabel.style.color = "var(--text-muted)";
    
    const slugValue = slugPreview.createEl("code", { text: this.slugify(defaultTitle) });
    slugValue.style.display = "block";
    slugValue.style.padding = "0.5em";
    slugValue.style.background = "var(--background-primary)";
    slugValue.style.borderRadius = "3px";
    slugValue.style.color = "var(--text-accent)";
    this.resolvedSlug = this.slugify(defaultTitle);

    // Report source (backend-controlled destination list)
    const destinations = this.plugin.getReportDestinations();
    const getSelectedReportSource = () =>
      reportSourceSelect?.value || this.plugin.getDefaultReportSource() || destinations[0]?.key || "resourcesv3";
    let reportSourceSelect = null;

    if (destinations.length > 1) {
      const reportSourceLabel = form.createEl("label", { text: "Report destination:" });
      reportSourceLabel.style.display = "block";
      reportSourceLabel.style.marginBottom = "0.5em";
      reportSourceLabel.style.fontWeight = "600";

      reportSourceSelect = form.createEl("select");
      reportSourceSelect.style.width = "100%";
      reportSourceSelect.style.padding = "0.5em";
      reportSourceSelect.style.marginBottom = "1em";
      reportSourceSelect.style.fontSize = "1em";
      reportSourceSelect.style.border = "1px solid var(--background-modifier-border)";
      reportSourceSelect.style.borderRadius = "4px";
      reportSourceSelect.style.background = "var(--background-primary)";
      reportSourceSelect.style.color = "var(--text-normal)";
      const selectedSource = this.plugin.getDefaultReportSource();
      destinations.forEach((dest) => {
        const optionEl = reportSourceSelect.createEl("option", { value: dest.key, text: dest.label });
        if (dest.key === selectedSource) optionEl.selected = true;
      });
    }

    // URL preview
    const urlPreview = form.createDiv({ cls: "tps-url-preview" });
    urlPreview.style.marginBottom = "1em";
    urlPreview.style.padding = "0.75em";
    urlPreview.style.background = "var(--background-secondary)";
    urlPreview.style.borderRadius = "4px";
    urlPreview.style.fontSize = "0.9em";
    
    const urlLabel = urlPreview.createEl("div", { text: "Your report will be accessible at:" });
    urlLabel.style.fontWeight = "600";
    urlLabel.style.marginBottom = "0.25em";
    urlLabel.style.color = "var(--text-muted)";
    
    const urlValue = urlPreview.createEl("a", { text: "Loading..." });
    urlValue.style.display = "block";
    urlValue.style.padding = "0.5em";
    urlValue.style.background = "var(--background-primary)";
    urlValue.style.borderRadius = "3px";
    urlValue.style.color = "var(--text-accent)";
    urlValue.style.wordBreak = "break-all";
    
    const updateUrlPreview = () => {
      this.fetchSiteUrl().then(siteUrl => {
        const routeBase = this.plugin.routeBaseForReportSource(getSelectedReportSource());
        urlValue.setText(`${siteUrl}${routeBase}/${this.resolvedSlug}`);
        urlValue.href = `${siteUrl}${routeBase}/${this.resolvedSlug}`;
      }).catch(() => {
        urlValue.setText(`(Unable to fetch site URL)`);
      });
    };

    // Fetch site URL and update preview
    updateUrlPreview();

    // Update slug/URL on title change
    titleInput.addEventListener("input", () => {
      const newSlug = this.slugify(titleInput.value || "untitled");
      this.resolvedSlug = newSlug;
      slugValue.setText(newSlug);
      updateUrlPreview();
    });
    if (reportSourceSelect) reportSourceSelect.addEventListener("change", updateUrlPreview);
    this.plugin.fetchObsidianConfig(true).then(updateUrlPreview).catch(() => {});

    // Description field
    const descLabel = form.createEl("label", { text: "Description (optional):" });
    descLabel.style.display = "block";
    descLabel.style.marginBottom = "0.5em";
    descLabel.style.fontWeight = "600";

    const descInput = form.createEl("textarea", {
      placeholder: "Brief description of this report..."
    });
    descInput.style.width = "100%";
    descInput.style.padding = "0.5em";
    descInput.style.marginBottom = "1em";
    descInput.style.fontSize = "1em";
    descInput.style.minHeight = "60px";
    descInput.style.border = "1px solid var(--background-modifier-border)";
    descInput.style.borderRadius = "4px";
    descInput.style.background = "var(--background-primary)";
    descInput.style.color = "var(--text-normal)";
    descInput.style.resize = "vertical";

    // Sharing field (maps to backend access_level, edit_scope, and collection_scope)
    const sharingLabel = form.createEl("label", { text: "Sharing:" });
    sharingLabel.style.display = "block";
    sharingLabel.style.marginBottom = "0.5em";
    sharingLabel.style.fontWeight = "600";

    const sharingSelect = form.createEl("select");
    sharingSelect.style.width = "100%";
    sharingSelect.style.padding = "0.5em";
    sharingSelect.style.marginBottom = "0.35em";
    sharingSelect.style.fontSize = "1em";
    sharingSelect.style.border = "1px solid var(--background-modifier-border)";
    sharingSelect.style.borderRadius = "4px";
    sharingSelect.style.background = "var(--background-primary)";
    sharingSelect.style.color = "var(--text-normal)";
    const allowedSharingPresets = this.plugin.getAllowedSharingPresets();
    const defaultSharingKey = this.plugin.getDefaultSharingPresetKey();
    allowedSharingPresets.forEach((preset) => {
      const optionEl = sharingSelect.createEl("option", { value: preset.key, text: preset.label });
      if (preset.key === defaultSharingKey) optionEl.selected = true;
    });

    const sharingHelp = form.createEl("div", { cls: "tps-sharing-help" });
    sharingHelp.style.marginBottom = "1em";
    sharingHelp.style.color = "var(--text-muted)";
    sharingHelp.style.fontSize = "0.85em";
    const updateSharingHelp = () => {
      sharingHelp.setText(sharingPresetForKey(sharingSelect.value).description);
    };
    sharingSelect.addEventListener("change", updateSharingHelp);
    updateSharingHelp();

    // RAG enabled field
    const ragLabel = form.createEl("label", { text: "Knowledge Base (RAG):" });
    ragLabel.style.display = "block";
    ragLabel.style.marginBottom = "0.5em";
    ragLabel.style.fontWeight = "600";

    const ragToggleWrap = form.createDiv();
    ragToggleWrap.style.marginBottom = "1em";
    const ragToggle = ragToggleWrap.createEl("input", { type: "checkbox" });
    ragToggle.checked = !!this.plugin.settings.defaultRagEnabled;
    ragToggle.style.marginRight = "0.5em";
    ragToggleWrap.appendText("Enable RAG indexing for this report");

    // Content format field
    const contentFormatLabel = form.createEl("label", { text: "Content format:" });
    contentFormatLabel.style.display = "block";
    contentFormatLabel.style.marginBottom = "0.5em";
    contentFormatLabel.style.fontWeight = "600";

    const contentFormatSelect = form.createEl("select");
    contentFormatSelect.style.width = "100%";
    contentFormatSelect.style.padding = "0.5em";
    contentFormatSelect.style.marginBottom = "1em";
    contentFormatSelect.style.fontSize = "1em";
    contentFormatSelect.style.border = "1px solid var(--background-modifier-border)";
    contentFormatSelect.style.borderRadius = "4px";
    contentFormatSelect.style.background = "var(--background-primary)";
    contentFormatSelect.style.color = "var(--text-normal)";
    [
      { value: "markdown", label: "Markdown" },
      { value: "html", label: "HTML" }
    ].forEach((opt) => {
      const optionEl = contentFormatSelect.createEl("option", { value: opt.value, text: opt.label });
      if (opt.value === (this.plugin.settings.defaultContentFormat || "markdown")) optionEl.selected = true;
    });

    // Info box
    const infoBox = form.createDiv({ cls: "tps-info-box" });
    infoBox.style.padding = "0.75em";
    infoBox.style.marginBottom = "1em";
    infoBox.style.background = "var(--background-secondary)";
    infoBox.style.borderLeft = "3px solid var(--interactive-accent)";
    infoBox.style.borderRadius = "4px";
    infoBox.style.fontSize = "0.9em";
    infoBox.createEl("strong", { text: "ℹ️  Note: " });
    infoBox.appendText("You can change visibility later in the web UI after publishing.");

    // Buttons
    const buttonRow = form.createDiv({ cls: "tps-button-row" });
    buttonRow.style.display = "flex";
    buttonRow.style.gap = "0.5em";
    buttonRow.style.justifyContent = "flex-end";

    const cancelBtn = buttonRow.createEl("button", { text: "Cancel" });
    cancelBtn.style.padding = "0.5em 1em";
    cancelBtn.onclick = () => this.close();

    const publishBtn = buttonRow.createEl("button", { text: "📤 Publish" });
    publishBtn.style.padding = "0.5em 1.5em";
    publishBtn.style.background = "var(--interactive-accent)";
    publishBtn.style.color = "var(--text-on-accent)";
    publishBtn.style.fontWeight = "600";
    publishBtn.onclick = async () => {
      const title = titleInput.value.trim();
      const description = descInput.value.trim();
      const sharingPreset = sharingPresetForKey(sharingSelect.value || "private");
      const accessLevel = sharingPreset.accessLevel;
      const editScope = sharingPreset.editScope;
      const ragEnabled = !!ragToggle.checked;
      const collectionScope = sharingPreset.collectionScope;
      const contentFormatDefault = contentFormatSelect.value || "markdown";
      const reportSource = getSelectedReportSource();
      if (!title) {
        new Notice("⚠️ Please enter a title");
        return;
      }
      publishBtn.disabled = true;
      publishBtn.setText("Publishing...");
      try {
        await this.plugin.cmdPublishAsNewReport(
          this.folder,
          title,
          description,
          accessLevel,
          editScope,
          ragEnabled,
          collectionScope,
          contentFormatDefault,
          reportSource
        );
        this.close();
      } catch (e) {
        console.error(e);
        new Notice(`❌ Publish failed: ${e.message || String(e)}`);
        publishBtn.disabled = false;
        publishBtn.setText("📤 Publish");
      }
    };
  }

  async fetchSiteUrl() {
    const config = await this.plugin.fetchObsidianConfig();
    return config?.site_url || DEFAULT_SITE_URL;
  }

  onClose() {
    this.contentEl.empty();
  }
}

class PushOptionsModal extends Modal {
  constructor(app, plugin, folder, reportId) {
    super(app);
    this.plugin = plugin;
    this.folder = folder;
    this.reportId = reportId;
    this.initialSettings = null;
  }

  formatRagStatusText(settings) {
    if (!settings?.indexing) return "Loading indexing status…";
    const idx = settings.indexing;
    const parts = [
      settings.rag_enabled ? "RAG enabled" : "RAG disabled",
      `${idx.atlas_chunks || 0} atlas chunks`,
      `${idx.indexed_pages || 0}/${idx.content_pages || 0} pages indexed`,
    ];
    if (idx.pending_reindex > 0) parts.push(`${idx.pending_reindex} pending`);
    if (idx.in_progress > 0) parts.push(`${idx.in_progress} in progress`);
    if (settings.rag_enabled && !idx.chat_ready) parts.push("chat retrieval NOT ready");
    else if (settings.rag_enabled && idx.chat_ready) parts.push("chat retrieval ready");
    return parts.join(" · ");
  }

  _styleField(el) {
    el.style.width = "100%";
    el.style.padding = "0.5em";
    el.style.marginBottom = "1em";
    el.style.fontSize = "1em";
    el.style.border = "1px solid var(--background-modifier-border)";
    el.style.borderRadius = "4px";
    el.style.background = "var(--background-primary)";
    el.style.color = "var(--text-normal)";
  }

  _sectionLabel(form, text) {
    const label = form.createEl("label", { text });
    label.style.display = "block";
    label.style.marginBottom = "0.5em";
    label.style.fontWeight = "600";
    return label;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("tps-push-modal");

    contentEl.createEl("h2", { text: `⚡ Push: ${this.folder.name}` });

    const scrollWrap = contentEl.createDiv();
    scrollWrap.style.maxHeight = "70vh";
    scrollWrap.style.overflowY = "auto";
    scrollWrap.style.paddingRight = "0.25em";

    const form = scrollWrap.createDiv({ cls: "tps-push-form" });
    const cachedReport = (this.plugin.cloudReports || []).find((r) => r.id === this.reportId);
    const destinations = this.plugin.getReportDestinations();

    const infoBox = form.createDiv({ cls: "tps-info-box" });
    infoBox.style.padding = "0.75em";
    infoBox.style.marginBottom = "1em";
    infoBox.style.background = "var(--background-secondary)";
    infoBox.style.borderLeft = "3px solid var(--interactive-accent)";
    infoBox.style.borderRadius = "4px";
    infoBox.style.fontSize = "0.85em";
    infoBox.createEl("strong", { text: "Mapped report: " });
    infoBox.appendText(
      cachedReport
        ? `${cachedReport.title || this.reportId} (${cachedReport.section_path || "unknown path"})`
        : this.reportId
    );

    this._sectionLabel(form, "Title (read-only):");
    const titleInput = form.createEl("input", { type: "text", value: cachedReport?.title || "" });
    titleInput.readOnly = true;
    this._styleField(titleInput);

    this._sectionLabel(form, "URL slug (read-only):");
    const slugInput = form.createEl("input", { type: "text", value: "" });
    slugInput.readOnly = true;
    this._styleField(slugInput);

    const urlBox = form.createDiv();
    urlBox.style.marginBottom = "1em";
    urlBox.style.fontSize = "0.85em";
    const urlLink = urlBox.createEl("a", { text: "Loading report URL…" });
    urlLink.style.wordBreak = "break-all";

    this._sectionLabel(form, "Description (optional):");
    const descInput = form.createEl("textarea");
    descInput.placeholder = "Brief description of this report…";
    descInput.style.minHeight = "60px";
    descInput.style.resize = "vertical";
    this._styleField(descInput);

    let reportSourceSelect = null;
    if (destinations.length > 0) {
      this._sectionLabel(form, "Destination / app surface:");
      reportSourceSelect = form.createEl("select");
      this._styleField(reportSourceSelect);
      destinations.forEach((dest) => {
        reportSourceSelect.createEl("option", { value: dest.key, text: dest.label });
      });
    }

    this._sectionLabel(form, "Sharing:");
    const sharingSelect = form.createEl("select");
    this._styleField(sharingSelect);
    const sharingHelp = form.createEl("div");
    sharingHelp.style.marginBottom = "1em";
    sharingHelp.style.color = "var(--text-muted)";
    sharingHelp.style.fontSize = "0.85em";
    const updateSharingHelp = () => {
      sharingHelp.setText(sharingPresetForKey(sharingSelect.value).description);
    };
    sharingSelect.addEventListener("change", updateSharingHelp);

    this._sectionLabel(form, "Content format:");
    const contentFormatSelect = form.createEl("select");
    this._styleField(contentFormatSelect);
    contentFormatSelect.createEl("option", { value: "markdown", text: "Markdown" });
    contentFormatSelect.createEl("option", { value: "html", text: "HTML" });

    this._sectionLabel(form, "Knowledge Base (RAG):");
    const ragStatusBox = form.createDiv();
    ragStatusBox.style.fontSize = "0.8em";
    ragStatusBox.style.color = "var(--text-muted)";
    ragStatusBox.style.marginBottom = "0.5em";
    ragStatusBox.setText("Loading report settings…");

    const ragToggleWrap = form.createDiv();
    ragToggleWrap.style.marginBottom = "0.35em";
    const ragToggle = ragToggleWrap.createEl("input", { type: "checkbox" });
    ragToggle.style.marginRight = "0.5em";
    ragToggleWrap.appendText("Enable RAG indexing (required for chat retrieval)");

    const reindexToggleWrap = form.createDiv();
    reindexToggleWrap.style.marginBottom = "0.75em";
    const reindexToggle = reindexToggleWrap.createEl("input", { type: "checkbox" });
    reindexToggle.checked = true;
    reindexToggle.style.marginRight = "0.5em";
    reindexToggleWrap.appendText("Queue RAG re-index after push");

    const ragHelp = form.createEl("div");
    ragHelp.style.fontSize = "0.8em";
    ragHelp.style.color = "var(--text-muted)";
    ragHelp.style.marginBottom = "1em";
    ragHelp.setText(
      "Push syncs markdown to TPS. These settings control where it lives, who can see it, and whether the chat agent can retrieve it."
    );

    this._sectionLabel(form, "Sync mode:");
    const deletesToggleWrap = form.createDiv();
    deletesToggleWrap.style.marginBottom = "0.5em";
    const deletesToggle = deletesToggleWrap.createEl("input", { type: "checkbox" });
    deletesToggle.checked = true;
    deletesToggle.style.marginRight = "0.5em";
    deletesToggleWrap.appendText("Apply deletes (remove remote nodes deleted locally)");
    const deletesHelp = form.createEl("div");
    deletesHelp.style.fontSize = "0.8em";
    deletesHelp.style.color = "var(--text-muted)";
    deletesHelp.style.marginBottom = "1em";
    deletesHelp.setText("Uncheck for a safe push that never removes cloud nodes.");

    const buttonRow = contentEl.createDiv({ cls: "tps-button-row" });
    buttonRow.style.display = "flex";
    buttonRow.style.gap = "0.5em";
    buttonRow.style.justifyContent = "flex-end";
    buttonRow.style.marginTop = "0.75em";

    const cancelBtn = buttonRow.createEl("button", { text: "Cancel" });
    cancelBtn.style.padding = "0.5em 1em";
    cancelBtn.onclick = () => this.close();

    const pushBtn = buttonRow.createEl("button", { text: "🚀 Push" });
    pushBtn.style.padding = "0.5em 1.5em";
    pushBtn.style.background = "var(--interactive-accent)";
    pushBtn.style.color = "var(--text-on-accent)";
    pushBtn.style.fontWeight = "600";

    const applyRemoteSettings = (settings) => {
      this.initialSettings = settings;
      titleInput.value = settings?.title || cachedReport?.title || "";
      slugInput.value = settings?.slug || cachedReport?.section_path || "";
      descInput.value = settings?.description || "";
      if (reportSourceSelect && settings?.report_source) {
        reportSourceSelect.value = settings.report_source;
      }
      const allowedPresets = settings?.sharing?.allowed_presets || this.plugin.getAllowedSharingPresets().map((p) => p.key);
      sharingSelect.empty();
      this.plugin.getAllowedSharingPresets()
        .filter((preset) => allowedPresets.includes(preset.key))
        .forEach((preset) => {
          sharingSelect.createEl("option", { value: preset.key, text: preset.label });
        });
      sharingSelect.value = sharingPresetKeyFromReportSettings(settings);
      updateSharingHelp();
      contentFormatSelect.value = settings?.content_format_default || "markdown";
      ragToggle.checked = !!settings?.rag_enabled;
      ragStatusBox.setText(this.formatRagStatusText(settings));
      if (settings?.rag_enabled && settings?.indexing && !settings.indexing.chat_ready) {
        ragStatusBox.style.color = "var(--color-orange)";
        reindexToggle.checked = true;
      } else {
        ragStatusBox.style.color = "var(--text-muted)";
      }
      if (settings?.web_url) {
        urlLink.setText(settings.web_url);
        urlLink.href = settings.web_url;
      }
    };

    ragToggle.addEventListener("change", () => {
      if (ragToggle.checked) reindexToggle.checked = true;
    });

    void this.plugin.fetchReportSettings(this.reportId)
      .then(applyRemoteSettings)
      .catch((err) => {
        console.warn("[TPS] Failed to load report settings:", err);
        ragStatusBox.setText("Could not load remote settings — showing cached defaults.");
        applyRemoteSettings({
          title: cachedReport?.title,
          slug: cachedReport?.section_path,
          report_source: cachedReport?.report_source || this.plugin.getDefaultReportSource(),
          sharing_preset: sharingPresetKeyFromSettings(this.plugin.settings),
          content_format_default: this.plugin.settings.defaultContentFormat || "markdown",
          rag_enabled: !!cachedReport?.rag_enabled,
          indexing: {},
        });
      });

    pushBtn.onclick = async () => {
      pushBtn.disabled = true;
      pushBtn.setText("Saving…");
      try {
        const { baseUrl, apiKey } = this.plugin.requireConfigured();
        const initial = this.initialSettings || {};
        const patch = {};
        const nextDescription = descInput.value.trim();
        const nextReportSource = reportSourceSelect?.value || initial.report_source || this.plugin.getDefaultReportSource();
        const nextSharing = sharingSelect.value;
        const nextFormat = contentFormatSelect.value || "markdown";
        const nextRag = ragToggle.checked;
        const reindexAfterPush = reindexToggle.checked;

        if (nextDescription !== (initial.description || "")) patch.description = nextDescription;
        if (nextReportSource !== (initial.report_source || "")) patch.report_source = nextReportSource;
        if (nextSharing !== sharingPresetKeyFromReportSettings(initial)) patch.sharing_preset = nextSharing;
        if (nextFormat !== (initial.content_format_default || "markdown")) patch.content_format_default = nextFormat;
        if (nextRag !== !!initial.rag_enabled) patch.rag_enabled = nextRag;
        if (reindexAfterPush && nextRag) patch.queue_reindex = true;

        if (Object.keys(patch).length > 0) {
          const updated = await this.plugin.updateReportSettings(this.reportId, patch);
          this.initialSettings = updated;
        }

        pushBtn.setText("Pushing…");
        await this.plugin.pushFolderByPath(
          this.folder.path,
          deletesToggle.checked,
          baseUrl,
          apiKey,
          false,
          nextReportSource,
          { ragEnabled: nextRag, reindexAfterPush: reindexAfterPush && nextRag }
        );
        this.close();
      } catch (e) {
        console.error(e);
        new Notice(`❌ Push failed: ${e.message || String(e)}`);
        this.plugin.settings.folderSyncStatus = this.plugin.settings.folderSyncStatus || {};
        this.plugin.settings.folderSyncStatus[this.folder.path] = {
          status: "error",
          lastSyncAt: new Date().toISOString(),
          message: e.message || String(e),
        };
        await this.plugin.saveSettings();
        this.plugin.decorateFileTree();
        pushBtn.disabled = false;
        pushBtn.setText("🚀 Push");
      }
    };
  }

  onClose() {
    this.contentEl.empty();
  }
}

async function listMarkdownFilesRecursive(folder) {
  // Use vault.getMarkdownFiles() — always fully indexed, never stale unlike TFolder.children
  const rootPath = ensureFolderPath(folder.path);
  const vault = folder.vault;
  if (!vault) {
    // Fallback: recurse via children (old method)
    const out = [];
    const recurse = (f) => {
      if (f instanceof TFile && (f.extension || "").toLowerCase() === "md") out.push(f);
      else if (f instanceof TFolder) for (const c of (f.children || [])) recurse(c);
    };
    recurse(folder);
    return out.sort((a, b) => a.path.localeCompare(b.path));
  }
  return vault.getMarkdownFiles()
    .filter(f => f.path.startsWith(rootPath + "/"))
    .sort((a, b) => a.path.localeCompare(b.path));
}

async function listFoldersRecursive(folder) {
  // Use vault index for reliability — TFolder.children can be stale
  const rootPath = ensureFolderPath(folder.path);
  const vault = folder.vault;
  if (!vault) {
    // Fallback: recurse via children (old method)
    const out = [];
    const recurse = (f) => {
      if (f instanceof TFolder) { out.push(f); for (const c of (f.children || [])) recurse(c); }
    };
    recurse(folder);
    return out.sort((a, b) => a.path.localeCompare(b.path));
  }
  const out = [];
  const check = (f) => {
    if (!(f instanceof TFolder)) return;
    const p = ensureFolderPath(f.path);
    if (p === rootPath || p.startsWith(rootPath + "/")) out.push(f);
    for (const c of (f.children || [])) check(c);
  };
  // Walk from root folder itself (vault.getRoot() gives the vault root)
  check(vault.getRoot());
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

class TPSReportSyncSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    
    // Header with version info
    const header = containerEl.createEl("div", { cls: "tps-settings-header" });
    header.createEl("h2", { text: "TPSReport Sync", style: "margin-bottom: 0;" });
    const versionInfo = `v${this.plugin.manifest.version} (Updated: ${new Date().toLocaleTimeString()})`; 
    header.createEl("small", { text: versionInfo, style: "color: var(--text-muted);" });
    
    containerEl.createEl("br");

    // NOTE: The backend API base URL is fixed in production and is intentionally
    // NOT exposed as a user-editable field. It is forced to DEFAULT_API_BASE_URL
    // on load (see onload + saveSettings) so the shipped plugin always points at
    // the production API. This mirrors the Chrome extension and WordPress plugin.

    new Setting(containerEl)
      .setName("TPSReport API key")
      .setDesc("Your obs_ key generated from your TPSReport dashboard. Stored locally in Obsidian plugin data.")
      .addText((text) => {
        text.inputEl.type = "password";
        text
          .setPlaceholder("obs_...")
          .setValue(this.plugin.settings.apiKey)
          .onChange(async (value) => {
            this.plugin.settings.apiKey = (value || "").trim();
            await this.plugin.saveSettings();
          });
      });

    // Verify Connection Button
    const verifyContainer = containerEl.createDiv({ cls: "tps-verify-container" });
    verifyContainer.style.marginBottom = "1.5em";
    
    const verifyBtn = verifyContainer.createEl("button", { text: "Test connection" });
    
    const verifyStatus = verifyContainer.createEl("span", { cls: "tps-verify-status" });
    
    verifyBtn.onclick = async () => {
      verifyBtn.disabled = true;
      verifyStatus.textContent = " Verifying...";
      verifyStatus.style.color = "var(--text-muted)";
      
      try {
        const baseUrl = (this.plugin.settings.apiBaseUrl || "").trim();
        const apiKey = (this.plugin.settings.apiKey || "").trim();
        
        if (!baseUrl || !apiKey) {
          throw new Error("Please enter your API key first.");
        }
        
        const response = await fetch(`${baseUrl}/api/obsidian/auth/verify`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          }
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Authentication failed (${response.status}): ${errorText}`);
        }
        
        const data = await response.json();
        
        verifyStatus.empty();
        verifyStatus.createEl("strong", { text: "Valid!" });
        verifyStatus.appendText(` User: ${data.user_id} | Account: ${data.account_id}`);
        verifyStatus.style.color = "var(--text-success)";
        new Notice("Connection verified successfully.");
        
      } catch (err) {
        verifyStatus.empty();
        verifyStatus.createEl("strong", { text: "Failed:" });
        verifyStatus.appendText(` ${err.message}`);
        verifyStatus.style.color = "var(--text-error)";
        new Notice(`Verification failed: ${err.message}`);
      } finally {
        verifyBtn.disabled = false;
      }
    };

    new Setting(containerEl)
      .setName("Frontmatter ID field")
      .setDesc("Frontmatter key used for TPS identity (recommended: node_id).")
      .addText((text) =>
        text
          .setPlaceholder("node_id")
          .setValue(this.plugin.settings.frontmatterNodeIdKey)
          .onChange(async (value) => {
            this.plugin.settings.frontmatterNodeIdKey = (value || "").trim() || "node_id";
            await this.plugin.saveSettings();
          })
      );

    containerEl.createEl("h3", { text: "Default Report Settings" });
    containerEl.createEl("p", {
      text:
        "These defaults are used when publishing a new report from Obsidian. " +
        "You can override them per publish."
    });

    const allowedSharingPresets = this.plugin.getAllowedSharingPresets();
    const sharingOptions = {};
    allowedSharingPresets.forEach((preset) => {
      sharingOptions[preset.key] = preset.label;
    });

    new Setting(containerEl)
      .setName("Default sharing")
      .setDesc(
        allowedSharingPresets.some((preset) => preset.key === "team" || preset.key === "agency")
          ? "Private, Team, Agency, and Public map to the correct visibility, edit, and RAG scope settings."
          : "Private and Public are available for this solo workspace."
      )
      .addDropdown((dropdown) =>
        dropdown
          .addOptions(sharingOptions)
          .setValue(this.plugin.getDefaultSharingPresetKey())
          .onChange(async (value) => {
            applySharingPresetToSettings(this.plugin.settings, value || "private");
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Knowledge Base (RAG) enabled")
      .setDesc("Index report content for retrieval.")
      .addToggle((toggle) =>
        toggle.setValue(!!this.plugin.settings.defaultRagEnabled).onChange(async (value) => {
          this.plugin.settings.defaultRagEnabled = !!value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Content format")
      .setDesc("Default format for new report content.")
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({
            markdown: "Markdown",
            html: "HTML"
          })
          .setValue(this.plugin.settings.defaultContentFormat || "markdown")
          .onChange(async (value) => {
            this.plugin.settings.defaultContentFormat = value || "markdown";
            await this.plugin.saveSettings();
          })
      );

    const destinations = this.plugin.getReportDestinations();
    if (destinations.length > 1) {
      const options = {};
      destinations.forEach((dest) => {
        options[dest.key] = `${dest.label} (${dest.route_base})`;
      });
      new Setting(containerEl)
        .setName("Default report destination")
        .setDesc("Backend-enabled destination used when publishing new reports from Obsidian.")
        .addDropdown((dropdown) =>
          dropdown
            .addOptions(options)
            .setValue(this.plugin.getDefaultReportSource())
            .onChange(async (value) => {
              this.plugin.settings.defaultReportSource = value || "resourcesv3";
              await this.plugin.saveSettings();
            })
        );
    } else {
      new Setting(containerEl)
        .setName("Report destination")
        .setDesc(`Only ${destinations[0]?.label || "Resources V3"} is enabled for this account/workspace.`);
    }

    new Setting(containerEl)
      .setName("Refresh report destinations")
      .setDesc("Reload backend destination config for this Obsidian connection.")
      .addButton((button) =>
        button
          .setButtonText("Refresh")
          .onClick(async () => {
            await this.plugin.fetchObsidianConfig(true);
            this.display();
          })
      );

    containerEl.createEl("h3", { text: "Images (Offline-first sync)" });
    containerEl.createEl("p", {
      text:
        "This plugin never rewrites your local markdown during push. " +
        "Instead it transforms content in-memory for the server (local ![[img]] → remote URL). " +
        "On pull it can download remote images into your vault and restore offline ![[...]] embeds."
    });

    new Setting(containerEl)
      .setName("Enable image sync")
      .setDesc("Upload local embedded images on push; download remote images on pull.")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.imageSyncEnabled !== false).onChange(async (v) => {
          this.plugin.settings.imageSyncEnabled = !!v;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Assets folder")
      .setDesc("Where pulled/downloaded images are stored for offline viewing.")
      .addText((text) =>
        text.setPlaceholder("_TPS_Assets").setValue(this.plugin.settings.imageAssetsFolder || "_TPS_Assets").onChange(async (v) => {
          this.plugin.settings.imageAssetsFolder = (v || "").trim() || "_TPS_Assets";
          await this.plugin.saveSettings();
        })
      );

    containerEl.createEl("h3", { text: "Local folder sync mapping" });
    containerEl.createEl("p", {
      text:
        "Map any local vault folder, including subfolders, to a TPSReport cloud report. " +
        "Push and pull commands use this local mapping."
    });

    // Add refresh button and loading state container
    const mappingContainer = containerEl.createDiv({ cls: "tps-mapping-container" });
    const refreshContainer = mappingContainer.createDiv({ cls: "tps-refresh-container" });
    
    const refreshBtn = refreshContainer.createEl("button", { text: "Refresh Reports" });
    const loadingEl = refreshContainer.createEl("span", { text: " Loading...", cls: "tps-loading" });
    loadingEl.style.display = "none";
    
    const errorEl = mappingContainer.createEl("div", { cls: "tps-error" });
    errorEl.style.display = "none";
    errorEl.style.color = "var(--text-error)";
    errorEl.style.marginTop = "0.5em";

    // Container for folder mappings
    const foldersContainer = mappingContainer.createDiv({ cls: "tps-folders" });
    
    // Capture 'this' context
    const plugin = this.plugin;
    const app = this.app;
    
    const formatFolderPath = (path) => (path || "").split("/").filter(Boolean).join(" > ");
    const folderDepth = (path) => Math.max(0, (path || "").split("/").filter(Boolean).length - 1);
    const hasHiddenSegment = (path) => (path || "").split("/").some((part) => part.startsWith("."));
    const findMappedAncestor = (folderPath, mappings) => {
      let best = "";
      for (const mappedPath of Object.keys(mappings || {})) {
        const normalized = ensureFolderPath(mappedPath);
        if (!normalized || normalized === folderPath) continue;
        if (folderPath.startsWith(normalized + "/") && normalized.length > best.length) {
          best = normalized;
        }
      }
      return best || null;
    };
    
    const renderFolders = async (reports = null) => {
      foldersContainer.empty();
      
      const reportsLoaded = Array.isArray(reports);
      const reportList = reportsLoaded ? reports : (plugin.cloudReports || []);
      const reportsById = new Map((reportList || []).map((report) => [report.id, report]));
      
      // Get all visible folders in the vault so subfolder mappings are visible too.
      const localFolders = app.vault.getAllLoadedFiles()
        .filter((f) => f instanceof TFolder && f !== app.vault.getRoot())
        .filter((f) => !hasHiddenSegment(f.path))
        .sort((a, b) => a.path.localeCompare(b.path));
      
      if (localFolders.length === 0) {
        foldersContainer.createEl("p", { text: "No local folders found in this vault." });
        return;
      }

      const mappings = plugin.settings.folderToReportId || {};
      const headerEl = foldersContainer.createDiv({ cls: "tps-folder-row tps-folder-header" });
      headerEl.style.display = "flex";
      headerEl.style.alignItems = "center";
      headerEl.style.gap = "0.5em";
      headerEl.style.margin = "0.75em 0 0.5em";
      headerEl.style.padding = "0 0.5em";
      headerEl.style.fontSize = "0.85em";
      headerEl.style.color = "var(--text-muted)";
      headerEl.style.fontWeight = "600";
      const localHeader = headerEl.createEl("span", { text: "Local folder" });
      localHeader.style.flex = "0 0 280px";
      headerEl.createEl("span", { text: "" }).style.width = "1.5em";
      const cloudHeader = headerEl.createEl("span", { text: "TPSReport cloud report" });
      cloudHeader.style.flex = "1";
      
      for (const folder of localFolders) {
        const folderPath = folder.path;
        const currentMapping = mappings[folderPath];
        const mappedAncestor = currentMapping ? null : findMappedAncestor(folderPath, mappings);
        const mappedAncestorLabel = mappedAncestor ? formatFolderPath(mappedAncestor) : "";
        
        const rowEl = foldersContainer.createDiv({ cls: "tps-folder-row" });
        rowEl.style.display = "flex";
        rowEl.style.alignItems = "center";
        rowEl.style.gap = "0.5em";
        rowEl.style.marginBottom = "0.75em";
        rowEl.style.padding = "0.5em";
        rowEl.style.background = "var(--background-secondary)";
        rowEl.style.borderRadius = "4px";
        
        // Folder path
        const folderLabel = rowEl.createEl("span", { cls: "tps-folder-label" });
        folderLabel.style.flex = "0 0 280px";
        folderLabel.style.minWidth = "0";
        folderLabel.style.fontWeight = "600";
        folderLabel.style.paddingLeft = `${folderDepth(folderPath) * 12}px`;
        folderLabel.title = folderPath;
        folderLabel.createEl("span", { text: "[folder] " });
        const folderCode = folderLabel.createEl("code", { text: formatFolderPath(folderPath) });
        folderCode.style.whiteSpace = "normal";
        
        // Arrow
        const arrowEl = rowEl.createEl("span", { text: "->", cls: "tps-arrow" });
        arrowEl.style.width = "1.5em";
        arrowEl.style.textAlign = "center";
        
        // Report dropdown or status
        if (mappedAncestor) {
          const statusEl = rowEl.createEl("span", { 
            text: `Included in mapped folder: ${mappedAncestorLabel}`,
            cls: "tps-status" 
          });
          statusEl.style.flex = "1";
          statusEl.style.color = "var(--text-muted)";
        } else if (!reportsLoaded || reportList.length === 0) {
          let statusText = "Not mapped";
          if (currentMapping) {
            const report = reportsById.get(currentMapping);
            statusText = report ? `Mapped to: ${report.title || currentMapping}` : `Mapped report id: ${currentMapping}`;
          } else if (!reportsLoaded) {
            statusText = "Not mapped (refresh to choose an existing cloud report)";
          } else {
            statusText = "Not mapped (no cloud reports available)";
          }
          const statusEl = rowEl.createEl("span", { 
            text: statusText,
            cls: "tps-status" 
          });
          statusEl.style.flex = "1";
          statusEl.style.color = currentMapping ? "var(--text-normal)" : "var(--text-muted)";
        } else {
          const selectEl = rowEl.createEl("select", { cls: "dropdown" });
          selectEl.style.flex = "1";
          selectEl.style.minWidth = "200px";
          
          // Add blank option
          selectEl.createEl("option", { text: "Not mapped", value: "" });
          
          // Add report options
          for (const report of reports) {
            const opt = selectEl.createEl("option", { 
              text: report.title,
              value: report.id  // 🔥 USE ID, NOT PATH
            });
            if (currentMapping === report.id) {
              opt.selected = true;
            }
          }
          
          selectEl.value = currentMapping || "";
          
          selectEl.onchange = async () => {
            const newMapping = selectEl.value;
            if (newMapping) {
              plugin.settings.folderToReportId[folderPath] = newMapping;
            } else {
              delete plugin.settings.folderToReportId[folderPath];
            }
            await plugin.saveSettings();
            await renderFolders(reports);
            new Notice(`Mapping ${newMapping ? "saved" : "removed"}: ${folderPath}`);
          };
        }
        
        // Unmap button (only if mapped)
        if (currentMapping) {
          const unmapBtn = rowEl.createEl("button", { text: "Remove" });
          unmapBtn.style.marginLeft = "auto";
          unmapBtn.title = "Remove mapping";
          unmapBtn.onclick = async () => {
            delete plugin.settings.folderToReportId[folderPath];
            await plugin.saveSettings();
            await renderFolders(reports);
            new Notice(`Unmapped: ${folderPath}`);
          };
        }
      }
    };
    
    // Initial render. If a background report fetch already completed, show the dropdowns immediately.
    renderFolders(plugin.cloudReports && plugin.cloudReports.length > 0 ? plugin.cloudReports : null);
    
    // Refresh button handler
    refreshBtn.onclick = async () => {
      refreshBtn.disabled = true;
      loadingEl.style.display = "inline";
      errorEl.style.display = "none";
      
      try {
        const baseUrl = (plugin.settings.apiBaseUrl || "").trim();
        const apiKey = (plugin.settings.apiKey || "").trim();
        
        if (!baseUrl || !apiKey) {
          throw new Error("Please configure your API key first.");
        }
        
        const response = await fetch(`${baseUrl}/api/obsidian/reports`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          }
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch reports (${response.status}): ${errorText}`);
        }
        
        const data = await response.json();
        const reports = data.reports || [];
        
        // 🔥 CACHE THE REPORTS! This is used by push/pull commands
        plugin.cloudReports = reports;
        console.log(`✅ Cached ${reports.length} cloud reports:`, reports.map(r => ({ id: r.id, title: r.title })));
        
        // Auto-cleanup stale mappings for deleted reports
        await plugin.cleanupStaleMappings();
        
        if (reports.length === 0) {
          errorEl.textContent = "No cloud reports found. Publish a local folder as a new report, or create one in the web UI.";
          errorEl.style.display = "block";
          errorEl.style.color = "var(--text-muted)";
        }
        
        await renderFolders(reports);
        new Notice(`Loaded ${reports.length} report(s) from cloud`);
        
      } catch (err) {
        console.error("Failed to fetch reports:", err);
        errorEl.textContent = `❌ Error: ${err.message}`;
        errorEl.style.display = "block";
        errorEl.style.color = "var(--text-error)";
      } finally {
        refreshBtn.disabled = false;
        loadingEl.style.display = "none";
      }
    };
  }
}

module.exports = class TPSReportSyncPlugin extends Plugin {
  async onload() {
    this.settings = Object.assign(
      {
        apiBaseUrl: DEFAULT_API_BASE_URL,
        apiKey: "",
        frontmatterNodeIdKey: "node_id",
        folderToReportId: {},  // 🔥 USE ID INSTEAD OF PATH
        folderSyncStatus: {},    // folder_path -> {status: 'success'|'error'|'never', lastSyncAt: ISO, message: string}
        defaultReportId: "",
        lastPullAt: "",
        imageSyncEnabled: true,
        imageAssetsFolder: "_TPS_Assets",
        imageLedger: { by_local_path: {}, by_web_url: {} },
        defaultAccessLevel: "author",
        defaultEditScope: "author",
        defaultRagEnabled: false,
        defaultCollectionScope: "user",
        defaultContentFormat: "markdown",
        defaultReportSource: "resourcesv3"
      },
      await this.loadData()
    );
    // The backend API base URL is fixed in production and is NOT user-editable.
    // Reset any stale value that may linger from older builds or testing so the
    // shipped plugin always points at the production API. Mirrors the Chrome
    // extension (loadSettings) and WordPress plugin behaviour.
    if (this.settings.apiBaseUrl !== DEFAULT_API_BASE_URL) {
      this.settings.apiBaseUrl = DEFAULT_API_BASE_URL;
      try { await this.saveData(this.settings); } catch (_) {}
    }
    this.destinationConfig = {
      site_url: DEFAULT_SITE_URL,
      destinations: fallbackReportDestinations(),
      default_report_source: "resourcesv3",
      show_destination_picker: false,
      sharing: { allowed_presets: ["private", "public"], is_agency: false }
    };
    this.destinationConfigLoaded = false;
    this.imageSync = new ImageSyncManager(this);
    
    // Cache for cloud reports (populated by refresh button in settings)
    this.cloudReports = [];
    
    // Status bar for sync warnings
    this.statusBarItem = this.addStatusBarItem();
    this.statusBarItem.setText("TPS: Ready");
    this.statusBarItem.addClass("tps-status-bar");
    
    // Track remote changes state
    this.remoteChanges = { hasChanges: false, files: [] };
    
    // Register periodic check for remote changes (every 5 minutes)
    this.registerInterval(
      window.setInterval(() => {
        this.checkForRemoteChanges();      // Check for document changes
        this.fetchCloudReports();           // Refresh report list + auto-cleanup deleted reports
      }, 5 * 60 * 1000)
    );
    
    // Check on startup
    setTimeout(() => this.checkForRemoteChanges(), 3000);
    setTimeout(() => this.fetchObsidianConfig(true), 750);
    
    // Auto-fetch cloud reports on startup (for cache)
    setTimeout(() => this.fetchCloudReports(), 1000);

    // Register UI Events
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => this.onFileMenu(menu, file))
    );
    
    // File Explorer Decoration
    this.app.workspace.onLayoutReady(() => {
      this.decorateFileTree();
    });
    this.registerEvent(
      this.app.workspace.on("layout-change", () => this.decorateFileTree())
    );
    // Re-decorate when settings change (mapping added/removed)
    const originalSaveSettings = this.saveSettings.bind(this);
    this.saveSettings = async () => {
      await originalSaveSettings();
      this.decorateFileTree();
    };

    this.addSettingTab(new TPSReportSyncSettingTab(this.app, this));

    this.addCommand({
      id: "tpsreport-sync-active-report",
      name: "Sync active report (push and delete sync)",
      callback: async () => {
        const file = this.app.workspace.getActiveFile();
        if (!file) {
          new Notice("No active file");
          return;
        }
        const mapped = this.findMappedRoot(file);
        if (!mapped) {
          new Notice("Current file is not in a TPSReport-mapped folder.");
          return;
        }
        if (!(await this.preflightGate())) return;
        const ok = window.confirm(
          `Sync "${mapped.rootFolder.path}" to TPSReport?\n\n` +
            "This pushes local changes and runs delete sync: report nodes whose " +
            "local files were removed will be deleted from the remote report.\n\n" +
            "Continue?"
        );
        if (!ok) {
          new Notice("Sync cancelled.");
          return;
        }
        // Use the root folder we found
        await this.pushFolderByPath(mapped.rootFolder.path, true, this.settings.apiBaseUrl, this.settings.apiKey);
      }
    });

    this.addCommand({
      id: "tpsreport-sync-push-all-mapped",
      name: "Sync all mapped reports",
      callback: async () => {
        if (!(await this.preflightGate())) return;
        return this.cmdPushAllMappedFoldersSafeDeletes();
      }
    });

    this.addCommand({
      id: "tpsreport-sync-verify",
      name: "Verify connection",
      callback: async () => this.cmdVerify()
    });

    this.addCommand({
      id: "tpsreport-sync-set-mapping-current-folder",
      name: "Set mapping for current folder",
      callback: async () => this.cmdSetMappingForCurrentFolder()
    });

    // Removed confusing commands:
    // - tpsreport-sync-push-current-folder
    // - tpsreport-sync-push-current-folder-apply-deletes
    // - tpsreport-sync-push-all-mapped-folders-safe-deletes (replaced with cleaner version)
    
    this.addCommand({
      id: "tpsreport-sync-pull-active-report",
      name: "Pull updates for active report",
      callback: async () => {
        const file = this.app.workspace.getActiveFile();
        if (!file) { new Notice("No active file"); return; }
        const mapped = this.findMappedRoot(file);
        if (!mapped) { new Notice("Current file is not in a TPSReport-mapped folder."); return; }
        
        // Find section path from report ID
        const report = (this.cloudReports || []).find(r => r.id === mapped.reportId);
        if (!report) { new Notice("Report info not found (try Refresh Reports)"); return; }
        
        // Pull full report tree for this mapped report (node_id, not section_path).
        await this.cmdPullFullTreeApply(mapped.reportId);
      }
    });

    this.addCommand({
      id: "tpsreport-sync-pull-full-tree",
      name: "Pull full report (apply to vault)",
      callback: async () => this.cmdPullFullTreeApply()
    });

    this.addCommand({
      id: "tpsreport-sync-pull-changes-since",
      name: "Pull changes since last pull (apply to vault)",
      callback: async () => this.cmdPullChangesSinceApply()
    });

    this.addCommand({
      id: "tpsreport-sync-generate-structure-map",
      name: "Regenerate structure map for current folder",
      callback: async () => this.cmdGenerateStructureMapForCurrentFolder()
    });

    this.addCommand({
      id: "tpsreport-sync-push-structure-map",
      name: "Push structure map order for current folder",
      callback: async () => this.cmdPushStructureMapForCurrentFolder()
    });

    this.addCommand({
      id: "tpsreport-sync-gatekeeper",
      name: "Run health check",
      callback: async () => this.cmdRunGatekeeper(true)
    });

    this.addCommand({
      id: "tpsreport-sync-autoheal",
      name: "Auto-heal KB metadata (fix what's mechanical)",
      callback: async () => this.cmdAutoHealAll()
    });

    this.addCommand({
      id: "tpsreport-sync-resolve-conflicts",
      name: "Resolve conflicts",
      callback: async () => this.cmdResolveConflicts()
    });
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  requireConfigured() {
    const baseUrl = (this.settings.apiBaseUrl || "").trim();
    const apiKey = (this.settings.apiKey || "").trim();
    if (!baseUrl) throw new Error("Missing API Base URL (plugin settings)");
    if (!apiKey || !apiKey.startsWith("obs_")) throw new Error("Missing or invalid obs_ API key (plugin settings)");
    return { baseUrl, apiKey };
  }

  // ---- UI & Helpers ---------------------------------------------------------------

  findMappedRoot(fileOrFolder) {
    if (!fileOrFolder) return null;
    let current = fileOrFolder instanceof TFolder ? fileOrFolder : fileOrFolder.parent;
    
    // Walk up until we find a mapped folder
    while (current) {
      const reportId = (this.settings.folderToReportId || {})[current.path];
      if (reportId) {
        return { 
          rootFolder: current, 
          reportId: reportId 
        };
      }
      if (current.path === "/") break; // Stop at root
      current = current.parent;
    }
    return null;
  }

  onFileMenu(menu, file) {
    // Only show for folders or files inside mapped folders
    const mapped = this.findMappedRoot(file);
    if (mapped) {
      menu.addSeparator();
      menu.addItem((item) => {
        item
          .setTitle("⚡ Push to TPS")
          .setIcon("upload-cloud")
          .onClick(() => {
            new PushOptionsModal(this.app, this, mapped.rootFolder, mapped.reportId).open();
          });
      });
      menu.addItem((item) => {
        item
          .setTitle("📥 Pull from TPS")
          .setIcon("download-cloud")
          .onClick(() => {
            this.cmdPullFullTreeApply(mapped.reportId);
          });
      });
    } else if (file instanceof TFolder) {
      // Unmapped folder: Offer to publish as new report
      menu.addSeparator();
      menu.addItem((item) => {
        item
          .setTitle("🚀 Publish as New Report")
          .setIcon("upload")
          .onClick(async () => {
            await this.fetchObsidianConfig(true);
            new PublishReportModal(this.app, this, file).open();
          });
      });
      menu.addItem((item) => {
        item
          .setTitle("🔗 Map to Existing Report")
          .setIcon("link")
          .onClick(async () => {
             // Use existing helper logic
             const current = (this.settings.folderToReportId || {})[file.path] || "";
             const reportId = window.prompt(`Enter TPS report_id for "${file.name}"`, current);
             if (reportId) {
               this.settings.folderToReportId[file.path] = reportId.trim();
               await this.saveSettings();
               new Notice(`✅ Mapped: ${file.name}`);
             }
          });
      });
    }
  }

  decorateFileTree() {
    // Wait for layout
    const explorer = this.app.workspace.getLeavesOfType("file-explorer")[0];
    if (!explorer) return;

    const mappings = this.settings.folderToReportId || {};
    const syncStatus = this.settings.folderSyncStatus || {};
    const mappedPaths = new Set(Object.keys(mappings));

    // Iterate DOM elements in file explorer
    // Note: This is a bit hacky but standard for Obsidian plugins
    const fileItems = explorer.view.fileItems; // Internal API
    if (!fileItems) return;

    for (const [path, item] of Object.entries(fileItems)) {
      if (!item.el) continue;

      // Remove old classes
      item.el.removeClass("tps-mapped-root");
      item.el.removeClass("tps-mapped-child");
      item.el.removeClass("tps-sync-success");
      item.el.removeClass("tps-sync-error");
      item.el.removeClass("tps-sync-never");

      // Check if root
      if (mappedPaths.has(path)) {
        item.el.addClass("tps-mapped-root");
        // Determine sync state
        const status = (syncStatus[path] || {}).status || "never";
        item.el.addClass(`tps-sync-${status}`);
        // Add icon if not present
        let iconEl = item.el.querySelector(".tps-icon");
        if (!iconEl) {
          iconEl = item.selfEl.createSpan({ cls: "tps-icon" });
          item.selfEl.prepend(iconEl); // Put before text
        }
      } else {
        // Check if child
        // Optimized: Check if path starts with any mapped path
        for (const root of mappedPaths) {
          if (path.startsWith(root + "/")) {
            item.el.addClass("tps-mapped-child");
            break;
          }
        }
        // Cleanup icon if it was unmapped
        const iconEl = item.el.querySelector(".tps-icon");
        if (iconEl) iconEl.remove();
      }
    }
  }

  getReportDestinations() {
    const destinations = Array.isArray(this.destinationConfig?.destinations)
      ? this.destinationConfig.destinations
      : [];
    const normalized = destinations.map(normalizeReportDestination);
    return normalized.length ? normalized : fallbackReportDestinations();
  }

  getAllowedSharingPresets() {
    return sharingPresetsForKeys(this.destinationConfig?.sharing?.allowed_presets);
  }

  getDefaultSharingPresetKey() {
    return coerceSharingPresetKey(
      sharingPresetKeyFromSettings(this.settings),
      this.getAllowedSharingPresets()
    );
  }

  getDefaultReportSource() {
    const destinations = this.getReportDestinations();
    const keys = new Set(destinations.map((dest) => dest.key));
    const backendDefault = (this.destinationConfig?.default_report_source || "").toString().trim().toLowerCase();
    const localDefault = (this.settings.defaultReportSource || "").toString().trim().toLowerCase();
    if (localDefault && keys.has(localDefault)) return localDefault;
    if (backendDefault && keys.has(backendDefault)) return backendDefault;
    return destinations.find((dest) => dest.is_default)?.key || destinations[0]?.key || "resourcesv3";
  }

  routeBaseForReportSource(reportSource) {
    const source = (reportSource || this.getDefaultReportSource() || "resourcesv3").toString().trim().toLowerCase();
    const match = this.getReportDestinations().find((dest) => dest.key === source);
    return match?.route_base || routeBaseFromReportSource(source);
  }

  async fetchObsidianConfig(force = false) {
    if (!force && this.destinationConfigLoaded && this.destinationConfig?.destinations?.length) {
      return this.destinationConfig;
    }
    try {
      const { baseUrl, apiKey } = this.requireConfigured();
      const res = await apiFetch(baseUrl, apiKey, "/api/obsidian/config");
      const destinations = Array.isArray(res.destinations)
        ? res.destinations.map(normalizeReportDestination)
        : fallbackReportDestinations();
      this.destinationConfig = {
        ...res,
        destinations,
        default_report_source: res.default_report_source || destinations.find((dest) => dest.is_default)?.key || "resourcesv3",
        show_destination_picker: destinations.length > 1,
        sharing: res.sharing || { allowed_presets: ["private", "public"], is_agency: false }
      };
      this.destinationConfigLoaded = true;
      const defaultSource = this.getDefaultReportSource();
      if (defaultSource !== this.settings.defaultReportSource) {
        this.settings.defaultReportSource = defaultSource;
        await this.saveSettings();
      }
      const allowedSharingKey = this.getDefaultSharingPresetKey();
      if (allowedSharingKey !== sharingPresetKeyFromSettings(this.settings)) {
        applySharingPresetToSettings(this.settings, allowedSharingKey);
        await this.saveSettings();
      }
      return this.destinationConfig;
    } catch (e) {
      console.warn("Failed to fetch Obsidian TPS config; using Resources V3 fallback:", e.message || e);
      this.destinationConfig = this.destinationConfig || {
        site_url: DEFAULT_SITE_URL,
        destinations: fallbackReportDestinations(),
        default_report_source: "resourcesv3",
        show_destination_picker: false,
        sharing: { allowed_presets: ["private", "public"], is_agency: false }
      };
      return this.destinationConfig;
    }
  }

  async cmdVerify() {
    try {
      const { baseUrl, apiKey } = this.requireConfigured();
      const res = await apiFetch(baseUrl, apiKey, "/api/obsidian/auth/verify", { method: "POST" });
      new Notice(`✅ Connected: account=${res.account_id} user=${res.user_id}`);
    } catch (e) {
      console.error(e);
      new Notice(`❌ Verify failed: ${e.message || String(e)}`);
    }
  }

  async cmdListReports() {
    try {
      const { baseUrl, apiKey } = this.requireConfigured();
      const res = await apiFetch(baseUrl, apiKey, "/api/obsidian/reports");
      const titles = (res.reports || []).map((r) => r.title || r.path || r._id).slice(0, 10).join(", ");
      new Notice(`📚 Reports (${res.count || 0}): ${titles || "(none)"}`);
      console.log("reports", res);
    } catch (e) {
      console.error(e);
      new Notice(`❌ List reports failed: ${e.message || String(e)}`);
    }
  }

  async fetchCloudReports() {
    try {
      const { baseUrl, apiKey } = this.requireConfigured();
      const res = await apiFetch(baseUrl, apiKey, "/api/obsidian/reports");
      this.cloudReports = res.reports || [];
      console.log(`✅ [Auto-fetch] Cached ${this.cloudReports.length} cloud reports:`, 
        this.cloudReports.map(r => ({ id: r.id, title: r.title })));
      
      // Auto-cleanup: Remove stale folder mappings for deleted reports
      await this.cleanupStaleMappings();
    } catch (e) {
      console.warn("⚠️ Failed to auto-fetch cloud reports (non-critical):", e.message);
      // Don't show a notice - this is background refresh
      // User will see a better error when they try to push/pull
    }
  }

  async fetchReportRagStatus(reportId) {
    return this.fetchReportSettings(reportId);
  }

  async fetchReportSettings(reportId) {
    const { baseUrl, apiKey } = this.requireConfigured();
    return apiFetch(
      baseUrl,
      apiKey,
      `/api/obsidian/reports/${encodeURIComponent(reportId)}/settings`
    );
  }

  async updateReportSettings(reportId, patch) {
    const { baseUrl, apiKey } = this.requireConfigured();
    const body = {};
    if (patch.description !== undefined) body.description = patch.description;
    if (patch.report_source !== undefined) body.report_source = patch.report_source;
    if (patch.sharing_preset !== undefined) body.sharing_preset = patch.sharing_preset;
    if (patch.content_format_default !== undefined) body.content_format_default = patch.content_format_default;
    if (patch.rag_enabled !== undefined) body.rag_enabled = !!patch.rag_enabled;
    if (patch.queue_reindex !== undefined) body.queue_reindex = !!patch.queue_reindex;

    const res = await apiFetch(
      baseUrl,
      apiKey,
      `/api/obsidian/reports/${encodeURIComponent(reportId)}/settings`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      }
    );

    const cached = (this.cloudReports || []).find((r) => r.id === reportId);
    if (cached) {
      if (patch.rag_enabled !== undefined) cached.rag_enabled = !!patch.rag_enabled;
      if (patch.report_source !== undefined) cached.report_source = patch.report_source;
    }
    return res;
  }

  async updateReportRagSettings(reportId, { ragEnabled, queueReindex = false }) {
    return this.updateReportSettings(reportId, {
      rag_enabled: !!ragEnabled,
      queue_reindex: !!queueReindex,
    });
  }

  async triggerReportReindex(reportId, maxParallel = 25) {
    const { baseUrl, apiKey } = this.requireConfigured();
    return apiFetch(
      baseUrl,
      apiKey,
      `/api/obsidian/reports/${encodeURIComponent(reportId)}/rag/reindex`,
      {
        method: "POST",
        body: JSON.stringify({ max_parallel: maxParallel }),
      }
    );
  }

  async cleanupStaleMappings() {
    if (!this.settings.folderToReportId) return;
    
    const cloudReportIds = new Set((this.cloudReports || []).map(r => r.id));
    const staleMappings = [];
    
    // Check each folder mapping
    for (const [folderPath, reportId] of Object.entries(this.settings.folderToReportId)) {
      if (!cloudReportIds.has(reportId)) {
        staleMappings.push({ folderPath, reportId });
      }
    }
    
    // Auto-remove stale mappings
    if (staleMappings.length > 0) {
      for (const { folderPath, reportId } of staleMappings) {
        delete this.settings.folderToReportId[folderPath];
        console.warn(`🗑️ Auto-removed stale mapping: ${folderPath} → ${reportId} (report deleted from cloud)`);
      }
      
      await this.saveSettings();
      
      // Notify user
      new Notice(
        `⚠️ ${staleMappings.length} report(s) were deleted from cloud\n\n` +
        `Removed stale folder mappings:\n` +
        staleMappings.map(m => `• ${m.folderPath}`).join('\n') + '\n\n' +
        `ℹ️ If you didn't delete these, contact support.\n` +
        `To re-publish: Right-click folder → "Publish as New Report"`,
        15000 // Show for 15 seconds
      );
    }
  }

  async cmdPublishAsNewReport(
    folder,
    title,
    description,
    accessLevel,
    editScope,
    ragEnabled,
    collectionScope,
    contentFormatDefault,
    reportSource
  ) {
    try {
      const { baseUrl, apiKey } = this.requireConfigured();
      
      new Notice("📤 Creating report...");
      
      // Step 1: Create report via API
      const createRes = await apiFetch(baseUrl, apiKey, "/api/obsidian/reports", {
        method: "POST",
        body: JSON.stringify({
          title: title,
          description: description || "",
          tags: ["obsidian"],
          access_level: accessLevel || "author",
          edit_scope: editScope || "author",
          rag_enabled: !!ragEnabled,
          collection_scope: collectionScope || "user",
          content_format_default: contentFormatDefault || "markdown",
          report_source: reportSource || this.getDefaultReportSource() || "resourcesv3"
        })
      });
      
      if (createRes.status !== "success" || !createRes.report) {
        throw new Error("Report creation failed");
      }
      
      const report = createRes.report;
      console.log("✅ Report created:", report);
      
      // Step 2: Auto-map folder to new report
      this.settings.folderToReportId[folder.path] = report.id;
      await this.saveSettings();
      console.log(`✅ Mapped folder '${folder.path}' to report '${report.id}'`);
      
      // Step 3: Add new report to cache immediately (avoid re-fetch race condition)
      if (!this.cloudReports) {
        this.cloudReports = [];
      }
      this.cloudReports.push(report);
      console.log(`✅ Added new report to cache: ${report.id}`);
      
      // Step 4: Push content (isNewReport=true strips stale node_ids so backend creates fresh nodes)
      new Notice(`📤 Uploading content...`);
      await this.pushFolderByPath(folder.path, false, baseUrl, apiKey, true);
      
      // Step 5: Success notice with link
      new Notice(
        `✅ Published '${report.title}'\n` +
        `🌐 ${report.web_url}\n` +
        `✏️ Edit access in web UI`,
        8000  // Show for 8 seconds
      );
      
      console.log(`✅ Publish complete:`, {
        title: report.title,
        slug: report.slug,
        web_url: report.web_url
      });
      
    } catch (e) {
      console.error("❌ Publish failed:", e);
      
      // Check for specific error types
      if (e.message && e.message.includes("already exists")) {
        new Notice(`❌ A report with this title already exists. Please choose a different title.`, 6000);
      } else {
        new Notice(`❌ Publish failed: ${e.message || String(e)}`, 6000);
      }
      
      throw e;  // Re-throw so modal can handle it
    }
  }

  async cmdSetMappingForCurrentFolder() {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      new Notice("No active file");
      return;
    }
    const folder = activeFile.parent;
    if (!folder || !(folder instanceof TFolder)) {
      new Notice("Active file has no folder");
      return;
    }
    const current = (this.settings.folderToReportId || {})[folder.path] || "";
    const reportId = window.prompt(`Enter TPS report_id for vault folder "${folder.path}"`, current);
    if (!reportId) return;
    this.settings.folderToReportId[folder.path] = reportId.trim();
    await this.saveSettings();
    new Notice(`✅ Mapping saved: ${folder.path} → ${reportId.trim()}`);
  }

  async cmdPushCurrentFolder(applyDeletes) {
    try {
      const { baseUrl, apiKey } = this.requireConfigured();
      // Gatekeeper first (hard block on errors)
      const g = await this.cmdRunGatekeeper(false);
      if (g && g.errors && g.errors.length) {
        new Notice("🚫 Gatekeeper blocked sync. Fix errors first.");
        return;
      }
      const activeFile = this.app.workspace.getActiveFile();
      if (!activeFile) throw new Error("No active file");
      const folder = activeFile.parent;
      if (!folder || !(folder instanceof TFolder)) throw new Error("Active file has no folder");

      const reportId = (this.settings.folderToReportId || {})[folder.path];
      if (!reportId) throw new Error(`No mapping for folder "${folder.path}". Set mapping first.`);
      
      // Resolve reportId to get section_path from cached cloud reports
      console.log(`🔍 Looking for reportId: ${reportId}`);
      console.log(`📋 Cached reports:`, this.cloudReports);
      
      const report = (this.cloudReports || []).find(r => r.id === reportId);
      if (!report) {
        // Report was deleted from cloud - auto-cleanup mapping
        console.warn(`🗑️ Report ${reportId} not found in cloud - removing stale mapping for: ${folder.path}`);
        
        delete this.settings.folderToReportId[folder.path];
        await this.saveSettings();
        
        new Notice(
          `⚠️ Report was deleted from cloud\n\n` +
          `Removed stale folder mapping for:\n${folder.path}\n\n` +
          `ℹ️ If you didn't delete this, contact support.\n` +
          `To re-publish: Right-click folder → "Publish as New Report"`,
          12000
        );
        
        throw new Error("Report was deleted from cloud. Folder mapping removed. Right-click folder to re-publish.");
      }
      const sectionPath = report.section_path;

      const mdFiles = await listMarkdownFilesRecursive(folder);
      const allFolders = await listFoldersRecursive(folder);

      new Notice(`↻ Syncing ${mdFiles.length} files + ${allFolders.length - 1} folders (apply_deletes=${applyDeletes})...`);

      const nodeKey = nodeIdKey(this);
      const snapshots = [];
      const filenameToHash = new Map();
      
      // Helper: Get relative path from synced folder root
      const getRelativePath = (file, rootFolder) => {
        const rootPath = ensureFolderPath(rootFolder.path);
        if (file.path.startsWith(rootPath + "/")) {
          return file.path.slice(rootPath.length + 1);
        }
        return file.name; // Fallback
      };
      
      const getRelativeFolderPath = (folderItem, rootFolder) => {
        const rootPath = ensureFolderPath(rootFolder.path);
        if (folderItem.path === rootPath) return ""; // Root itself
        if (folderItem.path.startsWith(rootPath + "/")) {
          return folderItem.path.slice(rootPath.length + 1);
        }
        return folderItem.name; // Fallback
      };
      
      // Helper to match file by relative path
      const findFileByRelativePath = (relativePath) => {
        return mdFiles.find((f) => {
          const fRelPath = getRelativePath(f, folder);
          return fRelPath === relativePath;
        });
      };
      
      // Step 1: Send folder structure (even if empty)
      for (const folderItem of allFolders) {
        const relPath = getRelativeFolderPath(folderItem, folder);
        if (!relPath) continue; // Skip root itself
        
        // Send a marker file to represent this folder/section
        snapshots.push({
          node_id: null,
          filename: `${relPath}/.tps_folder`,
          is_empty_section: true,
          content: "",
          content_hash: "",
          frontmatter: {},
          local_mtime: new Date(folderItem.stat?.mtime || Date.now()).toISOString()
        });
      }
      
      // Step 2: Send markdown files (parallel processing for speed)
      const fileSnapshots = await Promise.all(
        mdFiles.map(async (f) => {
          // SKIP any .tps_folder files if they somehow exist on disk
          if (f.name === ".tps_folder" || f.name === ".tps_folder.md") {
            console.log(`⏭️ Skipping .tps_folder file: ${f.path}`);
            return null;
          }
          
          const raw = await this.app.vault.read(f);
          const parsed = parseFrontmatter(raw);
          const fm = parsed.frontmatter || {};
          const nodeId = typeof fm[nodeKey] === "string" && fm[nodeKey] ? fm[nodeKey] : null;
          const localMtime = new Date(f.stat.mtime).toISOString();
          const safeFm = stripSyncFrontmatterFields(fm);
          
          // Get relative path preserving folder structure
          const relativePath = getRelativePath(f, folder);
          
          const indexType = classifyIndexFile(f.name, relativePath, fm);
          
          const transformedBody = await this.imageSync.transformBodyForPush({
            body: parsed.body || "",
            sourceMarkdownPath: f.path,
            sectionPath,
            baseUrl,
            apiKey,
            allowUploads: true
          });
          const contentHash = await sha256String(transformedBody);
          const metaHash = await computeMetaHash(fm);
          filenameToHash.set(relativePath, contentHash);
          
          return {
            node_id: nodeId,
            filename: relativePath,
            content: transformedBody,
            content_hash: contentHash,
            meta_hash: metaHash,
            frontmatter: safeFm,
            local_mtime: localMtime,
            is_index_file: !!indexType,
            index_type: indexType
          };
        })
      );
      
      // Filter out nulls (skipped files) and add to snapshots
      snapshots.push(...fileSnapshots.filter(s => s !== null));

      const res = await apiFetch(baseUrl, apiKey, "/api/obsidian/sync/reconcile-section", {
        method: "POST",
        body: JSON.stringify({
          report_id: reportId,
          vault_root_folder: folder.path,
          files: snapshots,
          apply_deletes: applyDeletes,
        }),
      });

      const created = res.created || [];
      // Parallel frontmatter updates for created files
      await Promise.all(
        created.map(async (c) => {
          const file = findFileByRelativePath(c.filename);
          if (!file) return;
          await patchFileFrontmatter(this.app, file, {
            [nodeKey]: c.node_id,
            sync_status: "synced",
            last_synced: isoNow(),
            tps_content_hash: filenameToHash.get(c.filename) || null,
            tps_meta_hash: c.meta_hash || null
          });
        })
      );

      // Mark updated files as synced (refresh content hash + status)
      const updatedList = res.updated || [];
      await Promise.all(
        updatedList.map(async (u) => {
          const file = findFileByRelativePath(u.filename);
          if (!file) return;
          await patchFileFrontmatter(this.app, file, {
            sync_status: "synced",
            last_synced: isoNow(),
            tps_content_hash: filenameToHash.get(u.filename) || null,
            tps_meta_hash: u.meta_hash || null
          });
        })
      );

      const conflicts = res.conflicts || [];
      if (conflicts.length) {
        // Mark local files as conflict with reason (parallel)
        await Promise.all(
          conflicts.map(async (c) => {
            const file = findFileByRelativePath(c.filename);
            if (!file) return;
            await patchFileFrontmatter(this.app, file, {
              sync_status: "conflict",
              tps_conflict_reason: c.reason || "conflict"
            });
          })
        );
        new Notice(`⚠ ${conflicts.length} conflicts. Pull from cloud to generate conflict copies, then resolve.`);
        console.warn("conflicts", conflicts);
      } else {
        new Notice(`✅ Synced. Updated=${(res.updated || []).length} Created=${created.length} Deleted=${(res.deleted || []).length}`);
      }
    } catch (e) {
      console.error(e);
      new Notice(`❌ Push failed: ${e.message || String(e)}`);
    }
  }

  async cmdPushAllMappedFoldersSafeDeletes() {
    try {
      const { baseUrl, apiKey } = this.requireConfigured();
      const mappings = this.settings.folderToReportId || {};
      const folders = Object.keys(mappings);
      if (!folders.length) throw new Error("No folder mappings configured.");

      const ok = window.confirm(
        `This will push ALL mapped folders in two passes:\n` +
          `Pass 1: reconcile apply_deletes=false (safe)\n` +
          `Pass 2: reconcile apply_deletes=true (cleanup)\n\n` +
          `Folders: ${folders.join(", ")}\n\nProceed?`
      );
      if (!ok) return;

      const gate = await this.cmdRunGatekeeper(false);
      if (gate && gate.errors && gate.errors.length) {
        new Notice("🚫 Gatekeeper blocked sync. Fix errors first.");
        return;
      }

      // Pass 1: reconcile all with apply_deletes=false
      new Notice(`↻ Pass 1/2: reconciling ${folders.length} folders (no deletes)...`);
      for (const folderPath of folders) {
        await this.pushFolderByPath(folderPath, false, baseUrl, apiKey);
      }

      // Pass 2: reconcile all with apply_deletes=true
      new Notice(`↻ Pass 2/2: reconciling ${folders.length} folders (apply deletes)...`);
      for (const folderPath of folders) {
        await this.pushFolderByPath(folderPath, true, baseUrl, apiKey);
      }

      new Notice("✅ Push all complete (two-pass)");
    } catch (e) {
      console.error(e);
      new Notice(`❌ Push all failed: ${e.message || String(e)}`);
    }
  }

  async pushFolderByPath(folderPath, applyDeletes, baseUrl, apiKey, isNewReport = false, reportSource = null, ragOptions = null) {
    const folderAbs = this.app.vault.getAbstractFileByPath(folderPath);
    if (!folderAbs || !(folderAbs instanceof TFolder)) {
      throw new Error(`Mapped folder not found in vault: ${folderPath}`);
    }
      const reportId = (this.settings.folderToReportId || {})[folderPath];
    if (!reportId) {
      throw new Error(`Missing report_id mapping for folder: ${folderPath}`);
    }
    
    // Resolve reportId to get section_path from cached cloud reports
    console.log(`🔍 [pushFolderByPath] Looking for reportId: ${reportId}`);
    const report = (this.cloudReports || []).find(r => r.id === reportId);
    if (!report) {
      // Report was deleted from cloud - auto-cleanup mapping
      console.warn(`🗑️ Report ${reportId} not found in cloud - removing stale mapping for: ${folderPath}`);
      
      delete this.settings.folderToReportId[folderPath];
      await this.saveSettings();
      
      new Notice(
        `⚠️ Report was deleted from cloud\n\n` +
        `Removed stale folder mapping for:\n${folderPath}\n\n` +
        `ℹ️ If you didn't delete this, contact support.\n` +
        `To re-publish: Right-click folder → "Publish as New Report"`,
        12000
      );
      
      throw new Error("Report was deleted from cloud. Folder mapping removed. Right-click folder to re-publish.");
    }
    const sectionPath = report.section_path;

    const mdFiles = await listMarkdownFilesRecursive(folderAbs);
    const allFolders = await listFoldersRecursive(folderAbs);
    const nodeKey = nodeIdKey(this);

    // Helper: Get relative path from synced folder root
    const getRelativePath = (file, rootFolder) => {
      const rootPath = ensureFolderPath(rootFolder.path);
      if (file.path.startsWith(rootPath + "/")) {
        return file.path.slice(rootPath.length + 1);
      }
      return file.name; // Fallback
    };
    
    const getRelativeFolderPath = (folder, rootFolder) => {
      const rootPath = ensureFolderPath(rootFolder.path);
      if (folder.path === rootPath) return ""; // Root itself
      if (folder.path.startsWith(rootPath + "/")) {
        return folder.path.slice(rootPath.length + 1);
      }
      return folder.name; // Fallback
    };

    const snapshots = [];
    const filenameToHash = new Map();
    
    // Step 1: Send folder structure (even if empty)
    for (const folder of allFolders) {
      const relPath = getRelativeFolderPath(folder, folderAbs);
      if (!relPath) continue; // Skip root itself
      
      // Send a marker file to represent this folder/section
      snapshots.push({
        node_id: null, // Folders typically don't have node_ids in frontmatter
        filename: `${relPath}/.tps_folder`, // Special marker
        is_empty_section: true, // Flag for backend
        content: "",
        content_hash: "",
        frontmatter: {},
        local_mtime: new Date(folder.stat?.mtime || Date.now()).toISOString()
      });
    }
    
    // Step 2: Send markdown files
    for (const f of mdFiles) {
      // SKIP any .tps_folder files if they somehow exist on disk
      if (f.name === ".tps_folder" || f.name === ".tps_folder.md") {
        console.log(`⏭️ Skipping .tps_folder file: ${f.path}`);
        continue;
      }
      
      const raw = await this.app.vault.read(f);
      const parsed = parseFrontmatter(raw);
      const fm = parsed.frontmatter || {};
      const nodeId = typeof fm[nodeKey] === "string" && fm[nodeKey] ? fm[nodeKey] : null;
      const localMtime = new Date(f.stat.mtime).toISOString();
      const safeFm = stripSyncFrontmatterFields(fm);
      
      // Get relative path preserving folder structure
      const relativePath = getRelativePath(f, folderAbs);
      
      const indexType = classifyIndexFile(f.name, relativePath, fm);
      
      const transformedBody = await this.imageSync.transformBodyForPush({
        body: parsed.body || "",
        sourceMarkdownPath: f.path,
        sectionPath,
        baseUrl,
        apiKey,
        allowUploads: true
      });
      const contentHash = await sha256String(transformedBody);
      const metaHash = await computeMetaHash(fm);
      filenameToHash.set(relativePath, contentHash);
      snapshots.push({
        node_id: nodeId,
        filename: relativePath,
        content: transformedBody,
        content_hash: contentHash,
        meta_hash: metaHash,
        frontmatter: safeFm,
        local_mtime: localMtime,
        is_index_file: !!indexType,
        index_type: indexType
      });
    }

    // For new report publishes, strip stale node_ids so backend always creates fresh nodes
    const snapshotsToSend = isNewReport
      ? snapshots.map(s => ({ ...s, node_id: null }))
      : snapshots;
    const res = await apiFetch(baseUrl, apiKey, "/api/obsidian/sync/reconcile-section", {
      method: "POST",
      body: JSON.stringify({
        report_id: reportId,
        vault_root_folder: folderPath,
        files: snapshotsToSend,
        apply_deletes: applyDeletes,
        report_source: reportSource || undefined,
      }),
    });

    // Helper to match file by relative path
    const findFileByRelativePath = (relativePath) => {
      return mdFiles.find((f) => {
        const fRelPath = getRelativePath(f, folderAbs);
        return fRelPath === relativePath;
      });
    };

    const created = res.created || [];
    for (const c of created) {
      const file = findFileByRelativePath(c.filename);
      if (!file) continue;
      await patchFileFrontmatter(this.app, file, {
        [nodeKey]: c.node_id,
        sync_status: "synced",
        last_synced: isoNow(),
        tps_content_hash: filenameToHash.get(c.filename) || null
      });
    }

    const updatedList = res.updated || [];
    for (const u of updatedList) {
      const file = findFileByRelativePath(u.filename);
      if (!file) continue;
      await patchFileFrontmatter(this.app, file, {
        sync_status: "synced",
        last_synced: isoNow(),
        tps_content_hash: filenameToHash.get(u.filename) || null
      });
    }

    const conflicts = res.conflicts || [];
    if (conflicts.length) {
      console.warn("conflicts", { folderPath, conflicts });
      new Notice(`⚠ Conflicts in ${folderPath}: ${conflicts.length} (see console)`);
    }

    // Record sync success status
    this.settings.folderSyncStatus = this.settings.folderSyncStatus || {};
    this.settings.folderSyncStatus[folderPath] = {
      status: "success",
      lastSyncAt: new Date().toISOString(),
      message: `Created: ${(res.created || []).length}, Updated: ${(res.updated || []).length}`,
    };
    await this.saveSettings();
    this.decorateFileTree();

    const ragEnabled = ragOptions?.ragEnabled !== false;
    const shouldReindex = ragOptions?.reindexAfterPush && ragEnabled;
    if (shouldReindex) {
      try {
        const reindexRes = await this.triggerReportReindex(reportId);
        const dispatch = reindexRes?.dispatch || {};
        const indexing = reindexRes?.indexing || {};
        const started = dispatch.workflows_started ?? 0;
        const pending = indexing.pending_reindex ?? 0;
        const chunks = indexing.atlas_chunks ?? 0;
        if (dispatch.temporal_connected === false) {
          new Notice(
            `✅ Push complete · RAG queued (${pending} pages pending). Indexer will catch up when Temporal is available.`,
            8000
          );
        } else {
          new Notice(
            `✅ Push complete · RAG re-index started (${started} workflows, ${pending} pending, ${chunks} chunks now)`,
            8000
          );
        }
      } catch (reindexErr) {
        console.warn("[TPS] RAG re-index after push failed:", reindexErr);
        new Notice(
          `✅ Push complete, but RAG re-index failed: ${reindexErr.message || String(reindexErr)}`,
          10000
        );
      }
    }
  }

  async cmdRunGatekeeper(showModal) {
    const nodeKey = nodeIdKey(this);
    const errors = [];
    const warnings = [];
    const info = [];

    // Scan vault markdown files (excluding .obsidian). SCOPING: only check files
    // under a mapped KB folder — never a client's personal/daily notes. If no
    // folders are mapped yet (fresh setup), fall back to the whole vault.
    const allMd = this.app.vault.getMarkdownFiles().filter((f) => !isInObsidianSystemPath(f.path));
    const mappedRoots = Object.keys(this.settings.folderToReportId || {}).map((p) => normalizePath(p));
    const isUnderMappedRoot = (p) => {
      const np = normalizePath(p);
      return mappedRoots.some((r) => np === r || np.startsWith(r.endsWith("/") ? r : r + "/"));
    };
    const reportPath = this.healthReportPath();
    const scoped = mappedRoots.length ? allMd.filter((f) => isUnderMappedRoot(f.path)) : allMd;
    const mdFiles = scoped.filter((f) => normalizePath(f.path) !== normalizePath(reportPath));

    // Per-KB custom field schema: read kb_schema from each mapped folder's
    // 00_CONTEXT.md (or 00_index.md). Maps a KB root -> { field: {type, required} }.
    const kbSchemaByRoot = new Map();
    for (const root of mappedRoots) {
      for (const ctx of ["00_CONTEXT.md", "00_index.md", "00_guidance.md"]) {
        const af = this.app.vault.getAbstractFileByPath(root ? `${root}/${ctx}` : ctx);
        if (af instanceof TFile) {
          try {
            const raw = await this.app.vault.read(af);
            const fm = mergeFrontmatterBlocks(extractLeadingFrontmatterBlocks(raw).blocks);
            if (fm && typeof fm.kb_schema === "object" && fm.kb_schema) {
              kbSchemaByRoot.set(root, fm.kb_schema);
            }
          } catch (e) {
            /* ignore unreadable context */
          }
          break;
        }
      }
    }
    const schemaForFile = (p) => {
      const np = normalizePath(p);
      let best = null;
      let bestLen = -1;
      for (const [root, schema] of kbSchemaByRoot.entries()) {
        if ((np === root || np.startsWith(root.endsWith("/") ? root : root + "/")) && root.length > bestLen) {
          best = schema;
          bestLen = root.length;
        }
      }
      return best || {};
    };

    const idToFiles = new Map();
    const missingIdFiles = [];
    const orphanFiles = [];
    const doubleFmFiles = [];
    const bomFiles = [];
    const synonymHits = [];      // { path, bad, good }
    const missingCoreFiles = []; // { path, missing: [...] }
    const canonicalOwner = new Map(); // topic -> first path
    const dupCanonical = [];     // { path, topic, owner }
    const customMissing = [];    // { path, field }
    const customTypeErr = [];    // { path, field, type }

    for (const f of mdFiles) {
      const raw = await this.app.vault.read(f);

      // Multi-block frontmatter detection (the metadata-bleed bug). Uses the
      // BOM-aware extractor so a zero-width char before a 2nd `---` is caught.
      const { blocks, hadBom } = extractLeadingFrontmatterBlocks(raw);
      if (blocks.length > 1) doubleFmFiles.push(f.path);
      if (hadBom) bomFiles.push(f.path);

      const frontmatter = mergeFrontmatterBlocks(blocks);

      const id = frontmatter && typeof frontmatter[nodeKey] === "string" ? frontmatter[nodeKey] : null;
      if (!id) {
        missingIdFiles.push(f.path);
      } else {
        if (!idToFiles.has(id)) idToFiles.set(id, []);
        idToFiles.get(id).push(f.path);
      }

      // Synonym traps (a value in the wrong key is silently ignored by retrieval).
      for (const k of Object.keys(frontmatter)) {
        const good = KB_KEY_SYNONYMS[k];
        if (good && frontmatter[good] === undefined) {
          synonymHits.push({ path: f.path, bad: k, good });
        }
      }

      // Missing core retrieval keys — skip index/guidance docs.
      const isIndexLike =
        /(^|\/)00_/.test(f.path) ||
        !kbValueIsEmpty(frontmatter.guidance_type) ||
        ["section", "guidance"].includes(String(frontmatter.index_type || "").toLowerCase());
      if (!isIndexLike) {
        const missing = KB_REQUIRED_CORE_KEYS.filter((k) => kbValueIsEmpty(frontmatter[k]));
        if (missing.length) missingCoreFiles.push({ path: f.path, missing });

        // Per-KB custom fields (declared in 00_CONTEXT kb_schema).
        const customSchema = schemaForFile(f.path);
        for (const [field, specRaw] of Object.entries(customSchema)) {
          const spec = specRaw && typeof specRaw === "object" ? specRaw : {};
          const present = !kbValueIsEmpty(frontmatter[field]);
          if (spec.required && !present) {
            customMissing.push({ path: f.path, field });
          }
          if (present && spec.type && !kbValueMatchesType(frontmatter[field], spec.type)) {
            customTypeErr.push({ path: f.path, field, type: spec.type });
          }
        }
      }

      // canonical_for uniqueness (accepts scalar or list)
      const cf = frontmatter.canonical_for;
      const cfTopics = Array.isArray(cf) ? cf : (typeof cf === "string" && cf.trim() ? [cf] : []);
      for (const topic of cfTopics) {
        const t = String(topic).trim().toLowerCase();
        if (!t) continue;
        if (canonicalOwner.has(t) && canonicalOwner.get(t) !== f.path) {
          dupCanonical.push({ path: f.path, topic: t, owner: canonicalOwner.get(t) });
        } else if (!canonicalOwner.has(t)) {
          canonicalOwner.set(t, f.path);
        }
      }

      // Orphan heuristic: file in vault root (no folder) OR mapped folder missing
      if (!f.parent || !(f.parent instanceof TFolder) || f.parent.path === "/") {
        orphanFiles.push(f.path);
      }
    }

    // Double frontmatter — the metadata-bleed bug. Offer a one-click merge+strip.
    if (doubleFmFiles.length) {
      const filesCopy = [...doubleFmFiles];
      errors.push({
        code: "DOUBLE_FRONTMATTER",
        message: `${filesCopy.length} file(s) have more than one leading "---" block (or a BOM-hidden second block). The extra YAML renders into the page body. Merge into a single block.`,
        files: filesCopy.slice(0, 50),
        actions: [
          {
            label: "Auto-fix: merge into one frontmatter block",
            run: async () => {
              let fixed = 0;
              for (const p of filesCopy) {
                const af = this.app.vault.getAbstractFileByPath(p);
                if (!(af instanceof TFile)) continue;
                const raw = await this.app.vault.read(af);
                const { blocks, body } = extractLeadingFrontmatterBlocks(raw);
                if (blocks.length < 2) continue;
                const merged = cleanFrontmatterObject(mergeFrontmatterBlocks(blocks));
                const yamlText =
                  typeof stringifyYaml === "function"
                    ? stringifyYaml(merged)
                    : Object.entries(merged).map(([k, v]) => `${k}: ${renderScalarYamlValue(v)}`).join("\n") + "\n";
                const rebuilt = `---\n${yamlText}${yamlText.endsWith("\n") ? "" : "\n"}---\n${body.replace(/^\n+/, "")}`;
                await this.app.vault.modify(af, rebuilt);
                fixed++;
              }
              new Notice(`Merged frontmatter in ${fixed} file(s).`);
            }
          }
        ]
      });
    }

    if (bomFiles.length) {
      warnings.push({
        code: "BOM_PRESENT",
        message: `${bomFiles.length} file(s) contain a UTF-8 BOM / zero-width char that can hide a frontmatter fence from the renderer.`,
        files: bomFiles.slice(0, 50)
      });
    }

    if (synonymHits.length) {
      warnings.push({
        code: "UNKNOWN_KEY",
        message: `${synonymHits.length} synonym key(s) TPSReport does not read (value is silently ignored by retrieval).`,
        files: synonymHits.slice(0, 50).map((h) => `${h.path} — "${h.bad}" should be "${h.good}"`)
      });
    }

    if (missingCoreFiles.length) {
      warnings.push({
        code: "MISSING_CORE_KEY",
        message: `${missingCoreFiles.length} content file(s) are missing core retrieval keys (summary/keywords/hyde_questions/retrieval_hint/intents/scenarios).`,
        files: missingCoreFiles.slice(0, 50).map((m) => `${m.path} — missing: ${m.missing.join(", ")}`)
      });
    }

    if (dupCanonical.length) {
      errors.push({
        code: "DUP_CANONICAL",
        message: `${dupCanonical.length} duplicate canonical_for claim(s) — two docs can't both be the single source of truth for a topic.`,
        files: dupCanonical.slice(0, 50).map((d) => `${d.path} — "${d.topic}" already owned by ${d.owner}`)
      });
    }

    if (customMissing.length) {
      errors.push({
        code: "CUSTOM_REQUIRED_MISSING",
        message: `${customMissing.length} file(s) missing a KB-required custom field (declared in 00_CONTEXT kb_schema).`,
        files: customMissing.slice(0, 50).map((c) => `${c.path} — requires "${c.field}"`)
      });
    }

    if (customTypeErr.length) {
      errors.push({
        code: "WRONG_TYPE",
        message: `${customTypeErr.length} custom field value(s) have the wrong YAML type vs the KB's kb_schema.`,
        files: customTypeErr.slice(0, 50).map((c) => `${c.path} — "${c.field}" should be ${c.type}`)
      });
    }

    // Duplicate IDs
    for (const [id, files] of idToFiles.entries()) {
      if (files.length > 1) {
        const filesCopy = [...files];
        errors.push({
          code: "DUPLICATE_NODE_ID",
          message: `Duplicate ${nodeKey}="${id}" found in ${files.length} files`,
          files: filesCopy,
          actions: [
            {
              label: "Auto-fix: remove ID from all but first",
              run: async () => {
                const keep = filesCopy[0];
                const toFix = filesCopy.slice(1);
                for (const p of toFix) {
                  const af = this.app.vault.getAbstractFileByPath(p);
                  if (!(af instanceof TFile)) continue;
                  await patchFileFrontmatter(this.app, af, { [nodeKey]: undefined, sync_status: "pending" });
                }
                new Notice(`Fixed duplicates. Kept ID on: ${keep}`);
              }
            }
          ]
        });
      }
    }

    if (missingIdFiles.length) {
      warnings.push({
        code: "MISSING_NODE_ID",
        message: `${missingIdFiles.length} files missing ${nodeKey}. They will be treated as NEW on sync.`,
        files: missingIdFiles.slice(0, 50)
      });
    }

    if (orphanFiles.length) {
      info.push({
        code: "ORPHAN_FILES",
        message: `${orphanFiles.length} files appear to be in root / no folder mapping. Consider organizing into report folders.`,
        files: orphanFiles.slice(0, 50)
      });
    }

    const results = { errors, warnings, info };

    // Persistent hand-off. Obsidian Notices vanish in seconds, so they can't be
    // the system of record. We write a durable vault file the user can see in the
    // file explorer AND the next LLM/agent round can read + fix from.
    try {
      await this.writeKbHealthReport(results);
    } catch (e) {
      console.warn("[TPS] writeKbHealthReport failed", e);
    }

    const errN = errors.length;
    const warnN = warnings.length;
    if (errN + warnN === 0) {
      new Notice("✅ KB Health: all checks passed.", 6000);
    } else {
      new Notice(
        `KB Health: ${errN} error(s), ${warnN} warning(s). Opened ${this.healthReportPath()} — fix list + auto-heal there.`,
        9000
      );
    }

    if (showModal) {
      new GatekeeperModal(this.app, this, results).open();
    }
    return results;
  }

  healthReportPath() {
    return (this.settings.healthReportPath || "_KB_HEALTH.md").trim() || "_KB_HEALTH.md";
  }

  // Run before a destructive push. Writes the durable report, and if there are
  // hard ERRORS, surfaces them (modal + report) and returns false so the caller
  // can pause. Warnings never block. Set settings.gateOnPush=false to disable.
  async preflightGate() {
    if (this.settings.gateOnPush === false) return true;
    const results = await this.cmdRunGatekeeper(false); // writes _KB_HEALTH.md
    if (!results.errors.length) return true;
    new Notice(
      `Push paused: ${results.errors.length} KB error(s). Use "Auto-heal all fixable" or fix ${this.healthReportPath()}, then push again.`,
      10000
    );
    new GatekeeperModal(this.app, this, results).open();
    return false;
  }

  // All findings that carry an auto-fix action, flattened.
  collectAutoFixActions(results) {
    const out = [];
    for (const bucket of ["errors", "warnings", "info"]) {
      for (const it of results[bucket] || []) {
        for (const a of it.actions || []) out.push({ code: it.code, action: a });
      }
    }
    return out;
  }

  // Run every available auto-fix, then re-scan so the report/modal refresh.
  async cmdAutoHealAll() {
    const results = await this.cmdRunGatekeeper(false);
    const fixes = this.collectAutoFixActions(results);
    if (!fixes.length) {
      new Notice("Nothing auto-fixable. Remaining items need an LLM/human (see report).");
      return await this.cmdRunGatekeeper(true);
    }
    let ok = 0;
    for (const { code, action } of fixes) {
      try {
        await action.run();
        ok++;
      } catch (e) {
        console.error("[TPS] auto-heal failed for", code, e);
      }
    }
    new Notice(`Auto-healed ${ok}/${fixes.length} fixable item(s). Re-scanning…`, 6000);
    return await this.cmdRunGatekeeper(true);
  }

  buildKbHealthMarkdown(results) {
    const { errors, warnings, info } = results;
    const ts = isoNow();
    const errN = errors.length;
    const warnN = warnings.length;
    const status = errN === 0 && warnN === 0 ? "✅ HEALTHY" : errN > 0 ? "❌ ERRORS" : "⚠️ WARNINGS";

    const machine = {
      generated_at: ts,
      status: errN === 0 && warnN === 0 ? "healthy" : errN > 0 ? "errors" : "warnings",
      counts: { errors: errN, warnings: warnN, info: info.length },
      findings: []
    };
    const pushMachine = (sev, it) => {
      machine.findings.push({
        severity: sev,
        code: it.code,
        message: it.message,
        auto_fixable: !!(it.actions && it.actions.length),
        files: it.files || []
      });
    };
    for (const it of errors) pushMachine("error", it);
    for (const it of warnings) pushMachine("warning", it);
    for (const it of info) pushMachine("info", it);

    const lines = [];
    lines.push("---");
    lines.push("tps_artifact: kb_health_report");
    lines.push("do_not_sync: true");
    lines.push("---");
    lines.push("");
    lines.push(`# KB Health Report — ${status}`);
    lines.push("");
    lines.push(`Generated: ${ts}`);
    lines.push("");
    lines.push(`**${errN} error(s) · ${warnN} warning(s) · ${info.length} info**`);
    lines.push("");
    lines.push("> This file is auto-generated by the TPSReport Gatekeeper. It is the");
    lines.push("> durable record of KB metadata health (Obsidian notifications vanish).");
    lines.push("> An LLM/agent should read the JSON block at the bottom, fix the items,");
    lines.push("> then re-run **TPSReport: Run gatekeeper health check**. When everything");
    lines.push("> passes, this file is cleared automatically. Use **Auto-heal all");
    lines.push("> fixable** for the mechanical fixes first.");
    lines.push("");

    const section = (title, items) => {
      lines.push(`## ${title}`);
      if (!items.length) {
        lines.push("");
        lines.push("_None._");
        lines.push("");
        return;
      }
      for (const it of items) {
        const tag = it.actions && it.actions.length ? "🔧 auto-fixable" : "✍️ needs LLM/human";
        lines.push(`### \`${it.code}\` — ${tag}`);
        lines.push("");
        lines.push(it.message);
        if (it.files && it.files.length) {
          lines.push("");
          for (const f of it.files.slice(0, 100)) lines.push(`- [ ] ${f}`);
        }
        lines.push("");
      }
    };
    section("Errors (block a clean push)", errors);
    section("Warnings (recommended)", warnings);
    if (info.length) section("Info", info);

    lines.push("## Machine-readable (for the next agent round)");
    lines.push("");
    lines.push("```json");
    lines.push(JSON.stringify(machine, null, 2));
    lines.push("```");
    lines.push("");
    return lines.join("\n");
  }

  async writeKbHealthReport(results) {
    const path = this.healthReportPath();
    const existing = this.app.vault.getAbstractFileByPath(path);
    const clean = results.errors.length === 0 && results.warnings.length === 0;

    // When healthy, remove the report so a stale file never lingers.
    if (clean) {
      if (existing instanceof TFile) await this.app.vault.delete(existing);
      return;
    }

    const md = this.buildKbHealthMarkdown(results);
    if (existing instanceof TFile) {
      await this.app.vault.modify(existing, md);
    } else {
      await this.app.vault.create(path, md);
    }
  }

  async cmdResolveConflicts() {
    const conflicts = await this.scanConflicts();
    new ConflictResolverModal(this.app, this, conflicts).open();
  }

  async scanConflicts() {
    const nodeKey = nodeIdKey(this);
    const out = [];
    const files = this.app.vault.getMarkdownFiles().filter((f) => !isInObsidianSystemPath(f.path));
    for (const f of files) {
      const raw = await this.app.vault.read(f);
      const { frontmatter } = parseFrontmatter(raw);
      if (!frontmatter) continue;
      const status = frontmatter.sync_status || frontmatter.tps_sync_status;
      if (status !== "conflict") continue;
      out.push({
        path: f.path,
        node_id: typeof frontmatter[nodeKey] === "string" ? frontmatter[nodeKey] : null,
        reason: frontmatter.tps_conflict_reason || "conflict",
        remote_copy_path: frontmatter.tps_remote_conflict_path || null
      });
    }
    return out;
  }

  async checkForRemoteChanges() {
    try {
      const { baseUrl, apiKey } = this.requireConfigured();
      const mappings = this.settings.folderToReportId || {};
      if (!Object.keys(mappings).length) {
        this.updateStatusBar("Ready", false);
        return;
      }
      
      // Check for remote changes in all mapped sections
      const changedFiles = [];
      const nodeKey = nodeIdKey(this);
      
      for (const [folderPath, reportId] of Object.entries(mappings)) {
        // Resolve reportId to section_path
        const report = (this.cloudReports || []).find(r => r.id === reportId);
        if (!report) continue;  // Skip if report not in cache
        const sectionPath = report.section_path;
        const folder = this.app.vault.getAbstractFileByPath(folderPath);
        if (!folder || !(folder instanceof TFolder)) continue;
        
        const mdFiles = await listMarkdownFilesRecursive(folder);
        for (const f of mdFiles) {
          const raw = await this.app.vault.read(f);
          const { frontmatter } = parseFrontmatter(raw);
          const nodeId = frontmatter && typeof frontmatter[nodeKey] === "string" ? frontmatter[nodeKey] : null;
          if (!nodeId) continue;
          
          const localHash = frontmatter.tps_content_hash;
          if (!localHash) continue;
          
          // Quick check: has server version changed?
          try {
            const res = await apiFetch(baseUrl, apiKey, `/api/obsidian/sync/check-hash?node_id=${nodeId}`);
            if (res.hash && res.hash !== localHash) {
              changedFiles.push(f.path);
            }
          } catch (e) {
            // Ignore errors (offline, etc.)
          }
        }
      }
      
      this.remoteChanges = { hasChanges: changedFiles.length > 0, files: changedFiles };
      
      if (changedFiles.length > 0) {
        this.updateStatusBar(`🔴 ${changedFiles.length} remote change(s)`, true);
      } else {
        this.updateStatusBar("Ready", false);
      }
    } catch (e) {
      // Silent fail (likely not configured yet)
    }
  }
  
  updateStatusBar(text, isWarning) {
    if (!this.statusBarItem) return;
    this.statusBarItem.setText(`TPS: ${text}`);
    if (isWarning) {
      this.statusBarItem.addClass("tps-warning");
      this.statusBarItem.title = "Remote changes detected. Click to pull.";
      // Make it clickable
      this.statusBarItem.onclick = () => this.cmdPullFullTreeApply();
    } else {
      this.statusBarItem.removeClass("tps-warning");
      this.statusBarItem.title = "TPSReport Sync";
      this.statusBarItem.onclick = null;
    }
  }

  async markFilePending(filePath, nodeId) {
    const af = this.app.vault.getAbstractFileByPath(filePath);
    if (!af || !(af instanceof TFile)) throw new Error("File not found");
    const nodeKey = nodeIdKey(this);
    const patch = { sync_status: "pending" };
    if (nodeId) patch[nodeKey] = nodeId;
    await patchFileFrontmatter(this.app, af, patch);
  }

  async applyRemoteOverwrite(filePath) {
    const af = this.app.vault.getAbstractFileByPath(filePath);
    if (!af || !(af instanceof TFile)) throw new Error("File not found");
    const raw = await this.app.vault.read(af);
    const { frontmatter } = parseFrontmatter(raw);
    const remotePath = frontmatter ? frontmatter.tps_remote_conflict_path : null;
    if (!remotePath) throw new Error("No remote conflict copy recorded in frontmatter");
    const remoteAf = this.app.vault.getAbstractFileByPath(remotePath);
    if (!remoteAf || !(remoteAf instanceof TFile)) throw new Error("Remote copy file missing");
    const remoteRaw = await this.app.vault.read(remoteAf);
    const nodeKey = nodeIdKey(this);
    const remoteParsed = parseFrontmatter(remoteRaw);
    const remoteHash = remoteParsed.frontmatter?.tps_content_hash || await sha256String(remoteParsed.body || remoteRaw);
    const patched = upsertFrontmatter(remoteRaw, {
      [nodeKey]: frontmatter[nodeKey],
      sync_status: "synced",
      last_synced: isoNow(),
      tps_content_hash: remoteHash,
      tps_conflict_reason: undefined,
      tps_remote_conflict_path: undefined
    });
    await this.app.vault.modify(af, patched);
  }

  // ---- Pull / Apply (Reverse Sync) -------------------------------------------------

  findMappedVaultFolderForSection(sectionPath) {
    // 1. Find report with this section_path
    const report = (this.cloudReports || []).find(r => r.section_path === sectionPath);
    if (!report) return null;
    
    // 2. Find which folder is mapped to this report's ID
    const mappings = this.settings.folderToReportId || {};
    for (const [vaultFolder, reportId] of Object.entries(mappings)) {
      if (reportId === report.id) return vaultFolder;
    }
    return null;
  }

  buildLocalPathForNode(node, sectionPath) {
    // node.path is TPS canonical; we map it under the vault folder for sectionPath.
    const folder = this.findMappedVaultFolderForSection(sectionPath);
    if (!folder) return null;
    const title = node.title || "Untitled";
    return `${ensureFolderPath(folder)}/${title}.md`;
  }

  async ensureArchiveFolder() {
    await ensureFolderExists(this.app, "_TPS_Archive");
  }

  async cmdPullFullTreeApply(presetReportId) {
    try {
      const { baseUrl, apiKey } = this.requireConfigured();
      let reportId = (presetReportId || this.settings.defaultReportId || "").trim();
      if (!reportId) {
        reportId = window.prompt("Enter TPS report_id to pull (node_id)", this.settings.defaultReportId || "");
      }
      if (!reportId) return;
      reportId = reportId.trim();
      this.settings.defaultReportId = reportId;
      await this.saveSettings();

      new Notice("↧ Pulling full report tree...");
      const res = await apiFetch(
        baseUrl,
        apiKey,
        `/api/obsidian/sync/full-tree?report_id=${encodeURIComponent(reportId.trim())}&include_content=true`
      );
      await this.applyFullTreeToVault(res, { baseUrl, apiKey, reportId: reportId.trim() });
      new Notice(`✅ Pull applied. Nodes=${(res.nodes || []).length}`);
    } catch (e) {
      console.error(e);
      new Notice(`❌ Pull full-tree failed: ${e.message || String(e)}`);
    }
  }

  async cmdPullChangesSinceApply() {
    try {
      const { baseUrl, apiKey } = this.requireConfigured();
      const reportId = (this.settings.defaultReportId || "").trim();
      if (!reportId) throw new Error("Set defaultReportId first (run Pull full report once).");

      const lastPull = this.settings.lastPullAt || null;
      const since = lastPull || new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      new Notice(`↧ Pulling changes since ${since}...`);
      const res = await apiFetch(
        baseUrl,
        apiKey,
        `/api/obsidian/sync/changes-since?report_id=${encodeURIComponent(reportId)}&since=${encodeURIComponent(since)}`
      );
      // Best-effort: if anything changed, re-pull full tree for now (simple + robust)
      const any = (res.node_changes || []).length + (res.doc_changes || []).length;
      if (!any) {
        new Notice("✓ No changes");
        this.settings.lastPullAt = isoNow();
        await this.saveSettings();
        return;
      }
      const full = await apiFetch(
        baseUrl,
        apiKey,
        `/api/obsidian/sync/full-tree?report_id=${encodeURIComponent(reportId)}&include_content=true`
      );
      await this.applyFullTreeToVault(full, { baseUrl, apiKey, reportId });
      this.settings.lastPullAt = isoNow();
      await this.saveSettings();
      new Notice(`✅ Pull applied. Changed items=${any}`);
    } catch (e) {
      console.error(e);
      new Notice(`❌ Pull changes failed: ${e.message || String(e)}`);
    }
  }

  async archivePullOrphanDuplicates(rootVault, nodeKey, nodes, localIdToFile) {
    await this.ensureArchiveFolder();
    const serverIds = new Set(nodes.map((n) => n._id));
    const canonicalByNodeId = new Map();
    for (const n of nodes) {
      const existing = localIdToFile.get(n._id);
      let canonical = null;
      // Prefer the local Obsidian path when we already have a mapped file — never
      // archive it just because Mongo vault_relative_path differs (title vs numbered).
      if (existing) {
        canonical = existing.path;
      } else if (n.vault_relative_path) {
        canonical = vaultPathFromRelative(rootVault, n.vault_relative_path);
      }
      if (canonical) canonicalByNodeId.set(n._id, canonical);
    }

    const prefix = ensureFolderPath(rootVault);
    const allMd = this.app.vault.getMarkdownFiles().filter(
      (f) =>
        !isInObsidianSystemPath(f.path) &&
        (f.path === prefix || f.path.startsWith(prefix + "/"))
    );

    for (const f of allMd) {
      const raw = await this.app.vault.read(f);
      const { frontmatter } = parseFrontmatter(raw);
      const nid =
        frontmatter && typeof frontmatter[nodeKey] === "string" ? frontmatter[nodeKey] : null;

      if (nid && serverIds.has(nid)) {
        const canonical = canonicalByNodeId.get(nid);
        if (canonical && f.path !== canonical) {
          const archivePath = await ensureUniqueFilePath(
            this.app,
            `_TPS_Archive/${sanitizeName(f.name)}`
          );
          try {
            await this.app.fileManager.renameFile(f, archivePath);
          } catch (e) {
            // ignore
          }
        }
        continue;
      }
      if (nid) continue;

      const titleKey = (frontmatter?.title || titleFromVaultFilename(f.path)).trim().toLowerCase();
      if (!titleKey) continue;
      for (const [, canonicalPath] of canonicalByNodeId.entries()) {
        const canonFile = this.app.vault.getAbstractFileByPath(canonicalPath);
        if (!canonFile || !(canonFile instanceof TFile)) continue;
        const canonRaw = await this.app.vault.read(canonFile);
        const { frontmatter: canonFm } = parseFrontmatter(canonRaw);
        const canonTitle = (canonFm?.title || titleFromVaultFilename(canonicalPath)).trim().toLowerCase();
        if (canonTitle && titleKey === canonTitle) {
          const archivePath = await ensureUniqueFilePath(
            this.app,
            `_TPS_Archive/${sanitizeName(f.name)}`
          );
          try {
            await this.app.fileManager.renameFile(f, archivePath);
          } catch (e) {
            // ignore
          }
          break;
        }
      }
    }
  }

  async applyFullTreeToVault(fullTree, pullCtx) {
    const baseUrl = pullCtx ? pullCtx.baseUrl : null;
    const apiKey = pullCtx ? pullCtx.apiKey : null;
    const reportId = pullCtx ? pullCtx.reportId : null;
    const nodeKey = nodeIdKey(this);
    const nodes = fullTree.nodes || [];
    const docs = fullTree.documents || {};
    // Robust reverse sync:
    // - Supports nested TPS tree changes using parent_id chains
    // - Applies under each mapped section root (folderToReportId)
    // - Conflict detection: preserves local edits with conflict copies + resolve UI

    const nodesById = new Map();
    const childrenByParent = new Map();
    for (const n of nodes) {
      nodesById.set(n._id, n);
      const pid = n.parent_id || null;
      if (!childrenByParent.has(pid)) childrenByParent.set(pid, []);
      childrenByParent.get(pid).push(n);
    }

    // Local map: node_id -> file + frontmatter
    const localFiles = this.app.vault.getMarkdownFiles().filter((f) => !isInObsidianSystemPath(f.path));
    const localIdToFile = new Map();
    const localIdToFrontmatter = new Map();
    for (const f of localFiles) {
      const raw = await this.app.vault.read(f);
      const { frontmatter } = parseFrontmatter(raw);
      const nid = frontmatter && typeof frontmatter[nodeKey] === "string" ? frontmatter[nodeKey] : null;
      if (nid) {
        localIdToFile.set(nid, f);
        localIdToFrontmatter.set(nid, frontmatter || {});
      }
    }

    const mappings = this.settings.folderToReportId || {};
    const nowIso = isoNow();

    // Helper: build ancestor chain (section/report nodes only) from root section to node
    const getAncestorSections = (node) => {
      const chain = [];
      let cur = node;
      while (cur && cur.parent_id) {
        const parent = nodesById.get(cur.parent_id);
        if (!parent) break;
        if (parent.type === "section" || parent.type === "report") chain.push(parent);
        cur = parent;
      }
      return chain.reverse();
    };

    const isDescendantOf = (nodeId, rootId) => {
      let cur = nodesById.get(nodeId);
      while (cur && cur.parent_id) {
        if (cur.parent_id === rootId) return true;
        cur = nodesById.get(cur.parent_id);
      }
      return false;
    };

    const buildFrontmatterWithNodeMeta = (node, doc) => {
      const baseFm = doc?.frontmatter || {};
      const guidance = node.guidance || {};
      const merged = { ...baseFm };

      if (guidance.research_notes) merged.research_notes = guidance.research_notes;
      if (guidance.research_brief && !merged.research_notes) merged.research_notes = guidance.research_brief;
      if (guidance.llm_instructions) merged.llm_instructions = guidance.llm_instructions;
      if (guidance.source_materials?.length) merged.source_materials = guidance.source_materials;
      if (guidance.content_structure?.length) merged.content_structure = guidance.content_structure;
      if (guidance.model_preferences && Object.keys(guidance.model_preferences).length) {
        merged.model_preferences = guidance.model_preferences;
      }

      for (const key of RAG_FM_KEYS) {
        if (node[key] !== undefined && node[key] !== null) {
          merged[key] = node[key];
        }
      }

      if (node.type === "report") merged.index_type = "report";
      if (node.type === "section") merged.index_type = "section";

      return merged;
    };

    const writeContainerIndexFile = async (node, doc, indexPath, legacyGuidancePath) => {
      const docRecord = doc || { markdown: "", content_hash: "", meta_content_hash: null };

      const remoteParsed = parseFrontmatter(docRecord.markdown || "");
      let offlineBody = remoteParsed.body || docRecord.markdown || "";
      if (baseUrl && apiKey && reportId) {
        offlineBody = await this.imageSync.transformBodyForPull({
          body: offlineBody,
          baseUrl,
          apiKey,
          reportId
        });
      }

      const remoteHash = docRecord.content_hash || (await sha256String(offlineBody));
      const remoteMetaHash =
        docRecord.meta_content_hash ||
        (await computeMetaHash(buildFrontmatterWithNodeMeta(node, docRecord)));
      const metaFm = {
        [nodeKey]: node._id,
        ...buildFrontmatterWithNodeMeta(node, docRecord),
        sync_status: "synced",
        last_synced: nowIso,
        tps_content_hash: remoteHash,
        tps_meta_hash: remoteMetaHash
      };
      const indexContent = upsertFrontmatter(offlineBody, metaFm);

      const existingIndex = this.app.vault.getAbstractFileByPath(indexPath);
      if (existingIndex) {
        await this.app.vault.modify(existingIndex, indexContent);
      } else {
        await this.app.vault.create(indexPath, indexContent);
      }

      if (legacyGuidancePath) {
        const legacy = this.app.vault.getAbstractFileByPath(legacyGuidancePath);
        if (legacy && legacy.path !== indexPath) {
          await this.app.vault.delete(legacy);
        }
      }
    };

    const nodeHasSyncMeta = (node) => {
      const guidance = node.guidance || {};
      const hasGuidance = Object.values(guidance).some((v) => {
        if (v == null) return false;
        if (typeof v === "string") return !!v.trim();
        if (Array.isArray(v)) return v.length > 0;
        if (typeof v === "object") return Object.keys(v).length > 0;
        return true;
      });
      const hasRag = RAG_FM_KEYS.some((k) => {
        const v = node[k];
        if (v == null) return false;
        if (typeof v === "string") return !!v.trim();
        if (Array.isArray(v)) return v.length > 0;
        return true;
      });
      return hasGuidance || hasRag;
    };

    const deleteContainerIndexFiles = async (indexPath, legacyGuidancePath) => {
      for (const p of [indexPath, legacyGuidancePath]) {
        if (!p) continue;
        const existing = this.app.vault.getAbstractFileByPath(p);
        if (existing) {
          await this.app.vault.delete(existing);
        }
      }
    };
    
    // Apply for each mapping root
    for (const [vaultFolder, reportId] of Object.entries(mappings)) {
      // Resolve reportId to section_path
      const report = (this.cloudReports || []).find(r => r.id === reportId);
      if (!report) continue;  // Skip if report not in cache
      const sectionPath = report.section_path;
      const rootNode = nodes.find((n) => n.path === sectionPath && (n.type === "section" || n.type === "report"));
      if (!rootNode) continue;
      const rootId = rootNode._id;
      const rootVault = ensureFolderPath(vaultFolder);
      await ensureFolderExists(this.app, rootVault);

      // Report index (00_Index.md at vault root)
      const reportDoc = docs[rootId];
      const reportIndexPath = `${rootVault}/00_Index.md`;
      const reportLegacyPath = `${rootVault}/00_Guidance.md`;
      if ((reportDoc && rootNode.has_content !== false) || nodeHasSyncMeta(rootNode)) {
        await writeContainerIndexFile(rootNode, reportDoc, reportIndexPath, reportLegacyPath);
      } else {
        await deleteContainerIndexFiles(reportIndexPath, reportLegacyPath);
      }

      // Section index files (00_Index.md per section folder)
      for (const n of nodes) {
        if (n.type !== "section") continue;
        if (n._id === rootId) continue;
        if (!isDescendantOf(n._id, rootId)) continue;
        const ancestors = getAncestorSections(n).filter((a) => a._id !== rootId);
        const relFolders = ancestors.map((a) => sanitizeName(a.title || "Section"));
        const existingSectionFile = localIdToFile.get(n._id) || null;
        let fullFolder;
        if (existingSectionFile) {
          const parent = existingSectionFile.parent;
          fullFolder = parent && parent instanceof TFolder ? parent.path : resolveSectionVaultFolder(n, rootVault, sectionPath, relFolders);
        } else {
          fullFolder = resolveSectionVaultFolder(n, rootVault, sectionPath, relFolders);
        }
        await ensureFolderExists(this.app, fullFolder);

        const sectionDoc = docs[n._id];
        const sectionIndexPath = `${fullFolder}/00_Index.md`;
        const sectionLegacyPath = `${fullFolder}/00_Guidance.md`;
        if ((sectionDoc && n.has_content !== false) || nodeHasSyncMeta(n)) {
          await writeContainerIndexFile(n, sectionDoc, sectionIndexPath, sectionLegacyPath);
        } else {
          await deleteContainerIndexFiles(sectionIndexPath, sectionLegacyPath);
        }
      }

      // Apply pages
      for (const n of nodes) {
        if (n.type !== "page") continue;
        if (!isDescendantOf(n._id, rootId) && n.parent_id !== rootId) continue;
        const nodeId = n._id;
        const doc = docs[nodeId];
        if (!doc || typeof doc.markdown !== "string") continue;

        // Build desired folder path from vault_relative_path / node.path (preserve local numbering)
        const ancestors = getAncestorSections(n).filter((a) => a._id !== rootId);
        const relFolders = ancestors.map((a) => sanitizeName(a.title || "Section"));
        const parentSection = ancestors.length ? ancestors[ancestors.length - 1] : null;
        const parentFolder = parentSection
          ? resolveSectionVaultFolder(parentSection, rootVault, sectionPath, relFolders.slice(0, -1))
          : rootVault;
        const existing = localIdToFile.get(nodeId) || null;
        // If we already track a local file for this node, keep it EXACTLY in place.
        // Never run it through ensureUniqueFilePath (that bumps "(2)" every pull because
        // the file's own path already exists). Only de-dupe truly new files.
        const desiredPath = existing
          ? existing.path
          : await ensureUniqueFilePath(
              this.app,
              resolveVaultFilePath(n, rootVault, sectionPath, null, parentFolder)
            );
        const desiredFolder = desiredPath.split("/").slice(0, -1).join("/");
        await ensureFolderExists(this.app, desiredFolder);

        // Remote markdown is treated as BODY-ONLY (our push now sends body-only).
        const remoteParsed = parseFrontmatter(doc.markdown || "");
        const remoteBody = remoteParsed.body || "";
        const remoteHash = doc.content_hash || (await sha256String(remoteBody));
        const remoteMetaHash =
          doc.meta_content_hash ||
          (await computeMetaHash(buildFrontmatterWithNodeMeta(n, doc)));
        const desiredName = desiredPath.split("/").pop().replace(/\.md$/i, "");

        let offlineBody = remoteBody;
        if (baseUrl && apiKey && reportId) {
          offlineBody = await this.imageSync.transformBodyForPull({ body: remoteBody, baseUrl, apiKey, reportId });
        }

        if (existing) {
          const localRaw = await this.app.vault.read(existing);
          const localParsed = parseFrontmatter(localRaw);
          const localFm = localParsed.frontmatter;
          const storedHash = localFm ? localFm.tps_content_hash : null;
          const storedMetaHash = localFm ? localFm.tps_meta_hash : null;
          // Compute "virtual remote" hash by transforming local body (without uploads).
          const localVirtualBody = await this.imageSync.transformBodyForPush({
            body: localParsed.body || "",
            sourceMarkdownPath: existing.path,
            sectionPath,
            baseUrl: baseUrl || "",
            apiKey: apiKey || "",
            allowUploads: false
          });
          const localHash = await sha256String(localVirtualBody);
          const localMetaHash = await computeMetaHash(localFm || {});

          const localChanged = storedHash && localHash !== storedHash;
          const remoteChanged = storedHash && remoteHash !== storedHash;
          const localMetaChanged = storedMetaHash && localMetaHash !== storedMetaHash;
          const remoteMetaChanged = storedMetaHash && remoteMetaHash && remoteMetaHash !== storedMetaHash;
          const contentDiverged = storedHash && localChanged && remoteChanged && localHash !== remoteHash;
          const metaDiverged = storedMetaHash && remoteMetaChanged && localMetaChanged && localMetaHash !== remoteMetaHash;
          const diverged = contentDiverged || metaDiverged;

          if (diverged || (!storedHash && localHash !== remoteHash)) {
            // Conflict: create remote copy + mark local as conflict
            const stamp = nowIso.slice(0, 10);
            const remoteCopyPath = await ensureUniqueFilePath(
              this.app,
              `${desiredFolder}/${desiredName} (REMOTE conflict ${stamp}).md`
            );
            const remotePatched = upsertFrontmatter(offlineBody, {
              ...buildFrontmatterWithNodeMeta(n, doc),
              [nodeKey]: nodeId,
              sync_status: "conflict_remote",
              last_synced: nowIso,
              tps_content_hash: remoteHash,
              tps_meta_hash: remoteMetaHash
            });
            await this.app.vault.create(remoteCopyPath, remotePatched);

            await patchFileFrontmatter(this.app, existing, {
              [nodeKey]: nodeId,
              sync_status: "conflict",
              tps_conflict_reason: "local_and_remote_changed",
              tps_remote_conflict_path: remoteCopyPath,
              tps_remote_conflict_hash: remoteHash
            });

            // Move local file to desired path (best-effort) so structure is correct
            if (existing.path !== desiredPath) {
              const destFolder = desiredPath.split("/").slice(0, -1).join("/");
              await ensureFolderExists(this.app, destFolder);
              await this.app.fileManager.renameFile(existing, desiredPath);
            }
            continue;
          }

          // If remote changed and local didn't, overwrite local with remote.
          if (storedHash && !localChanged && remoteChanged) {
            const patched = upsertFrontmatter(offlineBody, {
              ...buildFrontmatterWithNodeMeta(n, doc),
              [nodeKey]: nodeId,
              sync_status: "synced",
              last_synced: nowIso,
              tps_content_hash: remoteHash,
              tps_meta_hash: remoteMetaHash
            });
            await this.app.vault.modify(existing, patched);
          } else if (storedHash && localChanged && !remoteChanged) {
            // Local changed only: keep local, mark pending push
            await patchFileFrontmatter(this.app, existing, { sync_status: "pending" });
          } else {
            // Hashes agree but body may still differ (e.g. server has image URLs, local
            // never got offline wikilinks). Apply offline body when it changed.
            const guidanceFields = buildFrontmatterWithNodeMeta(n, doc);
            const localBody = localParsed.body || "";
            if (offlineBody !== localBody) {
              const patched = upsertFrontmatter(offlineBody, {
                ...guidanceFields,
                [nodeKey]: nodeId,
                sync_status: "synced",
                last_synced: nowIso,
                tps_content_hash: remoteHash,
                tps_meta_hash: remoteMetaHash
              });
              await this.app.vault.modify(existing, patched);
            } else {
              await patchFileFrontmatter(this.app, existing, {
                ...guidanceFields,
                [nodeKey]: nodeId,
                sync_status: "synced",
                last_synced: nowIso,
                tps_content_hash: remoteHash,
                tps_meta_hash: remoteMetaHash
              });
            }
          }

          if (existing.path !== desiredPath) {
            const destFolder = desiredPath.split("/").slice(0, -1).join("/");
            await ensureFolderExists(this.app, destFolder);
            await this.app.fileManager.renameFile(existing, desiredPath);
          }
        } else {
          const patched = upsertFrontmatter(offlineBody, {
            ...buildFrontmatterWithNodeMeta(n, doc),
            [nodeKey]: nodeId,
            sync_status: "synced",
            last_synced: nowIso,
            tps_content_hash: remoteHash,
            tps_meta_hash: remoteMetaHash
          });
          await this.app.vault.create(desiredPath, patched);
        }
      }

      await this.archivePullOrphanDuplicates(rootVault, nodeKey, nodes, localIdToFile);

      // Archive only truly stale files under this mapping root (unknown node_id on server)
      await this.ensureArchiveFolder();
      const serverIds = new Set(nodes.map((n) => n._id));
      for (const [nid, file] of localIdToFile.entries()) {
        if (serverIds.has(nid)) continue;
        if (file.path !== rootVault && !file.path.startsWith(rootVault + "/")) continue;
        const rel = file.path.startsWith(rootVault + "/")
          ? file.path.slice(rootVault.length + 1)
          : file.name;
        const rebound = nodes.find(
          (n) => n.vault_relative_path && normalizePath(n.vault_relative_path) === normalizePath(rel)
        );
        if (rebound) {
          await patchFileFrontmatter(this.app, file, { [nodeKey]: rebound._id, sync_status: "pending" });
          continue;
        }
        const archivePath = await ensureUniqueFilePath(this.app, `_TPS_Archive/${sanitizeName(file.name)}`);
        try {
          await this.app.fileManager.renameFile(file, archivePath);
        } catch (e) {
          // ignore
        }
      }
    }
  }

  // ---- Structure Maps --------------------------------------------------------------

  async cmdGenerateStructureMapForCurrentFolder() {
    try {
      const { baseUrl, apiKey } = this.requireConfigured();
      const activeFile = this.app.workspace.getActiveFile();
      if (!activeFile) throw new Error("No active file");
      const folder = activeFile.parent;
      if (!folder || !(folder instanceof TFolder)) throw new Error("Active file has no folder");

      const reportId = (this.settings.folderToReportId || {})[folder.path];
      if (!reportId) throw new Error(`No mapping for folder "${folder.path}". Set mapping first.`);
      
      // Resolve reportId to section_path
      const report = (this.cloudReports || []).find(r => r.id === reportId);
      if (!report) {
        throw new Error(`Report with id ${reportId} not found in cache. Try refreshing reports.`);
      }
      const sectionPath = report.section_path;

      const res = await apiFetch(
        baseUrl,
        apiKey,
        `/api/obsidian/structure?section_path=${encodeURIComponent(sectionPath)}`
      );

      const ordered = res.ordered || [];
      const lines = [];
      lines.push(`# ${folder.name} — Structure`);
      lines.push("");
      ordered.forEach((item, i) => {
        // Obsidian wikilink by title
        lines.push(`${i + 1}. [[${item.title}]]`);
      });
      lines.push("");
      lines.push("> This file controls ordering in TPSReport.");
      lines.push("> Edit the list above to reorder pages, then run: Push 00_Structure.md order.");
      lines.push("");

      const targetPath = `${ensureFolderPath(folder.path)}/00_Structure.md`;
      const existing = this.app.vault.getAbstractFileByPath(targetPath);
      if (existing && existing instanceof TFile) {
        await this.app.vault.modify(existing, lines.join("\n"));
      } else {
        await this.app.vault.create(targetPath, lines.join("\n"));
      }
      new Notice("✅ 00_Structure.md regenerated");
    } catch (e) {
      console.error(e);
      new Notice(`❌ Generate structure map failed: ${e.message || String(e)}`);
    }
  }

  async cmdPushStructureMapForCurrentFolder() {
    try {
      const { baseUrl, apiKey } = this.requireConfigured();
      const activeFile = this.app.workspace.getActiveFile();
      if (!activeFile) throw new Error("No active file");
      const folder = activeFile.parent;
      if (!folder || !(folder instanceof TFolder)) throw new Error("Active file has no folder");

      const reportId = (this.settings.folderToReportId || {})[folder.path];
      if (!reportId) throw new Error(`No mapping for folder "${folder.path}". Set mapping first.`);
      
      // Resolve reportId to section_path
      const report = (this.cloudReports || []).find(r => r.id === reportId);
      if (!report) {
        throw new Error(`Report with id ${reportId} not found in cache. Try refreshing reports.`);
      }
      const sectionPath = report.section_path;

      const structurePath = `${ensureFolderPath(folder.path)}/00_Structure.md`;
      const file = this.app.vault.getAbstractFileByPath(structurePath);
      if (!file || !(file instanceof TFile)) throw new Error("00_Structure.md not found in this folder. Generate it first.");

      const text = await this.app.vault.read(file);
      // Parse lines like: "1. [[Title]]"
      const titles = [];
      for (const line of (text || "").split(/\r?\n/)) {
        const m = line.match(/^\s*\d+\.\s+\[\[([^\]]+)\]\]\s*$/);
        if (m && m[1]) titles.push(m[1].trim());
      }
      if (!titles.length) throw new Error("No ordered wikilinks found in 00_Structure.md");

      // Map titles -> node_id by reading each file's frontmatter
      const nodeKey = nodeIdKey(this);
      const orderedNodeIds = [];
      for (const title of titles) {
        const target = this.app.vault.getAbstractFileByPath(`${ensureFolderPath(folder.path)}/${title}.md`);
        if (!target || !(target instanceof TFile)) continue;
        const raw = await this.app.vault.read(target);
        const { frontmatter } = parseFrontmatter(raw);
        const nid = frontmatter && typeof frontmatter[nodeKey] === "string" ? frontmatter[nodeKey] : null;
        if (nid) orderedNodeIds.push(nid);
      }
      if (!orderedNodeIds.length) throw new Error("Could not resolve any node_ids from the ordered list (missing frontmatter IDs?)");

      await apiFetch(
        baseUrl,
        apiKey,
        `/api/obsidian/structure?section_path=${encodeURIComponent(sectionPath)}`,
        { method: "POST", body: JSON.stringify({ ordered_node_ids: orderedNodeIds }) }
      );

      new Notice(`✅ Order pushed (${orderedNodeIds.length} items)`);
    } catch (e) {
      console.error(e);
      new Notice(`❌ Push structure map failed: ${e.message || String(e)}`);
    }
  }
};
