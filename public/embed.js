/* public/embed.js — Legal Easy widget (EN-only baseline) */
(function () {
  // ---------- Styles ----------
  const STYLE = `
  .le-container{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:600px;border:1px solid #e5e7eb;border-radius:12px;background:#fff;color:#111827}
  .le-container.dark{background:#0b1220;color:#e5e7eb;border-color:#374151}
  .le-section{padding:16px}
  .le-section + .le-section{border-top:1px solid #e5e7eb}
  .le-container.dark .le-section + .le-section{border-top-color:#374151}
  .le-header{display:flex;align-items:center;gap:10px;margin-bottom:8px}
  .le-header img{height:20px}
  .le-title{font-size:16px;font-weight:700;margin:0}
  .le-subtle{font-size:12px;color:#6b7280}
  .le-container.dark .le-subtle{color:#94a3b8}
  .le-risk-row{display:flex;align-items:center;gap:8px}

  /* badges */
  .le-badge{display:inline-flex;align-items:center;gap:6px;padding:2px 8px;border-radius:999px;font-size:12px;line-height:18px;font-weight:600;background:#eef2ff;color:#1f2937}
  .le-badge-dot{width:8px;height:8px;border-radius:50%;background:currentColor}
  .le-badge--red{background:#fee2e2;color:#b91c1c}
  .le-badge--amber{background:#fef3c7;color:#b45309}
  .le-badge--green{background:#dcfce7;color:#15803d}

  /* highlights */
  .le-highlights{background:#f3f4f6;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden}
  .le-container.dark .le-highlights{background:#111827;border-color:#374151}
  .le-highlight{padding:10px 12px;border-bottom:1px solid #e5e7eb}
  .le-container.dark .le-highlight{border-color:#374151}
  .le-highlight:last-child{border-bottom:0}
  .le-highlight-title{display:flex;align-items:center;gap:8px;margin:0 0 6px 0;font-size:14px;font-weight:600;color:#111827}
  .le-container.dark .le-highlight-title{color:#e5e7eb}
  .le-highlight-text{margin:0;font-size:14px;color:#374151}
  .le-container.dark .le-highlight-text{color:#cbd5e1}

  /* clauses */
  .le-clauses{margin-top:8px}
  .le-clause{border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:12px;background:#fff}
  .le-container.dark .le-clause{background:#1f2937;border-color:#374151}
  .le-clause-header{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;font-weight:600;color:#111827}
  .le-container.dark .le-clause-header{color:#e5e7eb}
  .le-clause ul{margin:0 0 0 20px}
  .le-legend{margin-top:8px;font-size:12px;color:#6b7280}
  .le-container.dark .le-legend{color:#94a3b8}
  `;

  function injectStyleOnce() {
    if (document.getElementById("le-style")) return;
    const s = document.createElement("style");
    s.id = "le-style";
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  // ---------- Helpers ----------
  function riskToBadgeClass(risk) {
    const r = String(risk || "").toUpperCase();
    if (r === "R" || r === "HIGH") return "le-badge le-badge--red";
    if (r === "Y" || r === "MEDIUM") return "le-badge le-badge--amber";
    return "le-badge le-badge--green"; // G/LOW/default
  }

  function makeBadge(risk, label) {
    const span = document.createElement("span");
    span.className = riskToBadgeClass(risk);
    span.setAttribute("role", "img");
    span.setAttribute("aria-label", label || `Risk ${String(risk).toUpperCase()}`);
    const dot = document.createElement("span");
    dot.className = "le-badge-dot";
    const text = document.createElement("span");
    text.textContent = label || `Risk: ${String(risk).toUpperCase()}`;
    span.append(dot, text);
    return span;
  }

  // Normalize any kind of clause text into string[]
  function toLines(value) {
    if (Array.isArray(value)) return value;

    if (typeof value === "string") {
      // try JSON first
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && Array.isArray(parsed.en)) return parsed.en;
      } catch {
        /* not JSON */
      }
      return value
        .split(/\r?\n+/)
        .map((s) => s.trim())
        .filter(Boolean);
    }

    if (value && typeof value === "object") {
      if (Array.isArray(value.en)) return value.en;
    }

    return [];
  }

  function el(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text != null) e.textContent = text;
    return e;
  }

  // ---------- Rendering ----------
  function renderSummary(target, data, options = {}) {
    injectStyleOnce();

    const container = el("div", "le-container");
    container.setAttribute("role", "region");
    container.setAttribute("aria-live", "polite");
    if (options.dark) container.classList.add("dark");

    // Header
    const head = el("div", "le-section");
    const header = el("div", "le-header");
    if (options.logo) {
      const logo = document.createElement("img");
      logo.src = options.logo;
      logo.alt = "Logo";
      header.appendChild(logo);
    }
    const titleWrap = el("div");
    const title = el("h3", "le-title", data.policyTitle || "Policy Summary");
    const subtle = el(
      "div",
      "le-subtle",
      `Risk: ${prettyRisk(data.overallRisk || "G")}  (${(data.locale || "en").toLowerCase()})`
    );
    // risk chip next to title
    const riskRow = el("div", "le-risk-row");
    riskRow.appendChild(title);
    riskRow.appendChild(makeBadge(data.overallRisk, `Risk: ${String(data.overallRisk || "").toUpperCase()}`));

    titleWrap.appendChild(riskRow);
    titleWrap.appendChild(subtle);
    header.appendChild(titleWrap);
    head.appendChild(header);
    container.appendChild(head);

    // Highlights
    const highlightsSection = el("div", "le-section");
    const hTitle = el("div", "le-subtle", "Key Highlights");
    const highlights = el("div", "le-highlights");
    (data.highlights || []).forEach((h) => {
      const row = el("div", "le-highlight");
      const t = el("div", "le-highlight-title");
      t.appendChild(el("span", "", h.tag || "highlight"));
      t.appendChild(makeBadge(h.risk, `Risk: ${String(h.risk || "").toUpperCase()}`));
      const p = el("p", "le-highlight-text", h.summary || "");
      row.append(t, p);
      highlights.appendChild(row);
    });
    highlightsSection.append(hTitle, highlights);
    container.appendChild(highlightsSection);

    // Clauses
    const clausesSection = el("div", "le-section");
    clausesSection.appendChild(el("div", "le-subtle", "Policy Clauses"));

    const clausesWrapper = el("div", "le-clauses");
    (data.clauses || []).forEach((c) => {
      const box = el("div", "le-clause");

      const header2 = el("div", "le-clause-header");
      header2.appendChild(el("span", "", c.tag || "clause"));
      header2.appendChild(makeBadge(c.risk, `Risk: ${String(c.risk || "").toUpperCase()}`));
      box.appendChild(header2);

      const ul = document.createElement("ul");
      const lines =
        toLines(c.plain_english ?? c.bullets ?? c.summary ?? c.snippet ?? "");
      if (lines.length === 0) {
        const li = document.createElement("li");
        li.textContent = "No details available for this clause.";
        ul.appendChild(li);
      } else {
        lines.forEach((line) => {
          const li = document.createElement("li");
          li.textContent = String(line);
          ul.appendChild(li);
        });
      }
      box.appendChild(ul);
      clausesWrapper.appendChild(box);
    });

    // Optional legend
    const legend = el(
      "div",
      "le-legend",
      "Legend: High = red • Medium = amber • Low = green"
    );

    clausesSection.append(clausesWrapper, legend);
    container.appendChild(clausesSection);

    // Mount
    target.innerHTML = "";
    target.appendChild(container);
  }

  function prettyRisk(r) {
    const x = String(r || "").toUpperCase();
    if (x === "R" || x === "HIGH") return "High";
    if (x === "Y" || x === "MEDIUM") return "Medium";
    return "Low";
  }

  // ---------- Data fetch ----------
  async function fetchSummary(baseUrl, publicId, lang = "en") {
    const u = new URL(`/api/embed/${publicId}`, baseUrl);
    u.searchParams.set("lang", lang);
    const res = await fetch(u.toString());
    if (!res.ok) {
      const err = await safeJson(res);
      throw new Error((err && err.error) || `HTTP ${res.status}`);
    }
    return res.json();
  }

  async function safeJson(res) {
    try {
      return await res.clone().json();
    } catch {
      return null;
    }
  }

  // ---------- Public API ----------
  async function create(targetOrSelector, opts = {}) {
    const target =
      typeof targetOrSelector === "string"
        ? document.querySelector(targetOrSelector)
        : targetOrSelector;
    if (!target) throw new Error("LegalEasy: target element not found");

    const {
      publicId,
      lang = "en",
      dark = false,
      logo,
      baseUrl = window.location.origin,
    } = opts;

    if (!publicId) throw new Error("LegalEasy: publicId is required");

    // Basic loading state
    injectStyleOnce();
    target.innerHTML =
      '<div class="le-section le-subtle">Loading policy summary…</div>';

    const data = await fetchSummary(baseUrl, publicId, lang);
    renderSummary(target, data, { dark, logo });
  }

  // auto-init via data attributes
  async function autoInitFromAttributes() {
    const nodes = document.querySelectorAll("[data-legal-easy]");
    if (!nodes.length) return;

    for (const node of nodes) {
      const publicId = node.getAttribute("data-public-id");
      const lang = node.getAttribute("data-lang") || "en";
      const dark = (node.getAttribute("data-dark") || "false") === "true";
      const logo = node.getAttribute("data-logo") || undefined;
      const baseUrl = node.getAttribute("data-base-url") || window.location.origin;

      if (!publicId) {
        node.textContent = "LegalEasy: data-public-id is required";
        continue;
      }
      try {
        await create(node, { publicId, lang, dark, logo, baseUrl });
      } catch (e) {
        node.textContent = `LegalEasy error: ${e.message || e}`;
      }
    }
  }

  window.LegalEasy = { create };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoInitFromAttributes);
  } else {
    autoInitFromAttributes();
  }
})();