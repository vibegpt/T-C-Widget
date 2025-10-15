"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

/**
 * LegalEasy: Default Terms Summary View
 * ------------------------------------
 * Drop this component into your app (Cursor/Vercel) and render <LegalEasySummaryDefault />
 * wherever your widget mounts. It shows a concise, skimmable summary with a
 * Show More toggle. Pass different data via props or plug in your parser output.
 */

// Types for strongly-typed data injection
export type SummaryBullet = {
  icon?: string; // emoji or Tailwind-friendly icon string
  label: string; // short heading e.g. "Your Rights"
  text: string;  // one-line gist
};

export type DetailItem = {
  title: string;
  body: string;
};

export type LegalEasySummaryProps = {
  title?: string;
  bullets: SummaryBullet[]; // 3–5 bullets works best
  details: DetailItem[];    // expanded content
  className?: string;
};

export function LegalEasySummaryCard({
  title = "⚖️ Terms Summary",
  bullets,
  details,
  className = "",
}: LegalEasySummaryProps) {
  const [open, setOpen] = useState(false);

  return (
    <section
      role="region"
      aria-label="Terms Summary"
      className={`w-full max-w-xl rounded-2xl border bg-white shadow-sm p-4 sm:p-5 ${className}`}
    >
      <header className="flex items-center justify-between mb-3">
        <h2 className="text-base sm:text-lg font-semibold">{title}</h2>
      </header>

      {/* Always-visible bullets */}
      <ul className="space-y-2 text-sm leading-relaxed">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2">
            <span aria-hidden>{b.icon ?? "•"}</span>
            <div>
              <b className="mr-1">{b.label}:</b>
              <span>{b.text}</span>
            </div>
          </li>
        ))}
      </ul>

      {/* Toggle */}
      <button
        type="button"
        aria-expanded={open}
        aria-controls="le-details"
        onClick={() => setOpen(!open)}
        className="mt-3 inline-flex items-center gap-2 text-blue-600 hover:underline"
      >
        {open ? (
          <>
            <ChevronUp className="h-4 w-4" /> Show Less
          </>
        ) : (
          <>
            <ChevronDown className="h-4 w-4" /> Show More
          </>
        )}
      </button>

      {/* Expanded details */}
      {open && (
        <div
          id="le-details"
          className="mt-3 space-y-3 text-sm text-gray-700"
        >
          {details.map((d, i) => (
            <div key={i}>
              <b>{d.title}:</b> {d.body}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * DEFAULT VIEW with Zora-specific content (from the Terms you shared).
 * Use this as the ready-to-run widget view. Replace `bullets` / `details`
 * with your parser output to make it fully dynamic.
 */
export default function LegalEasySummaryDefault() {
  const bullets: SummaryBullet[] = [
    {
      icon: "✅",
      label: "Your Rights",
      text: "You keep wallet & token ownership (you hold the keys).",
    },
    {
      icon: "❌",
      label: "Their Rights",
      text: "Zora can change terms & suspend accounts at any time.",
    },
    {
      icon: "⚠️",
      label: "Risks & Gotchas",
      text: "Transactions are final; tokens are volatile; liability capped at $100.",
    },
    {
      icon: "📜",
      label: "Disputes",
      text: "Binding arbitration (no class actions). Opt out within 30 days by mail.",
    },
  ];

  const details: DetailItem[] = [
    {
      title: "Ownership & Licenses",
      body:
        "You own your content & tokens. You grant Zora a broad license to display/promote content to operate the service.",
    },
    {
      title: "Account Control",
      body:
        "Zora may suspend or terminate accounts, block tokens/features, and update Terms without prior notice.",
    },
    {
      title: "On-Chain Risk",
      body:
        "Gas fees are non-refundable, wallet/seed loss = asset loss, bridging & L2 (7-day exits) carry risks, third parties run infrastructure (e.g., sequencer).",
    },
    {
      title: "Token Positioning",
      body:
        "Tokens are framed as collectibles, not investments or securities. No profit promises; high volatility expected.",
    },
    {
      title: "Arbitration",
      body:
        "Disputes go to JAMS arbitration; class actions and jury trials are waived. You can opt out within 30 days by mailing a letter to Zora's legal address.",
    },
    {
      title: "Liability Cap",
      body:
        "Zora's liability is limited to the greater of $100 or what you paid them directly for the specific service.",
    },
  ];

  return (
    <LegalEasySummaryCard
      bullets={bullets}
      details={details}
    />
  );
}

/**
 * DYNAMIC PARSER INTEGRATION
 * --------------------------
 * Wire your existing Terms parser to this widget by passing a normalized
 * structure. Below is a light-normalizer that maps a flexible parsed JSON
 * into bullets/details + auto risk flags (for banners/telemetry).
 */

// Enhanced type definitions for comprehensive terms parsing
export type SectionKey =
  | "eligibility" | "compliance" | "wallet" | "services" | "tokens" | "fees"
  | "risks" | "disputes" | "liability" | "termination" | "modifications"
  | "privacy" | "ip" | "dmca" | "third_party" | "governing_law"
  | "california_notice" | "zora_network";

export type ParsedTerms = {
  product?: string;             // e.g., "Zora"
  updatedAt?: string;           // ISO date if detected
  jurisdiction?: string[];      // e.g., ["Delaware", "USA"]
  sections: Array<{
    key: SectionKey;
    title: string;
    bullets?: string[];         // short, plain-English lines for the widget
    body?: string;              // concise paragraph version
    facts?: Record<string, any>;// normalized, machine-readable fields (below)
  }>;
};

export type RiskFlags = {
  arbitration?: boolean;
  classActionWaiver?: boolean;
  liabilityCap?: number | null;
  terminationAtWill?: boolean;
  walletSelfCustody?: boolean;
  irreversibleTxs?: boolean;
  bridgingL2Risks?: boolean;
  // optional extras
  optOutDays?: number | null;
};

export function mapParsedToSummary(
  parsed: ParsedTerms
): {
  bullets: SummaryBullet[];
  details: DetailItem[];
  risks: RiskFlags;
} {
  const get = (k: SectionKey) => parsed.sections?.find(s => s.key === k);
  
  // Map new section keys to logical groupings
  const wallet = get("wallet");
  const services = get("services");
  const risks = get("risks");
  const disputes = get("disputes");
  const liability = get("liability");
  const termination = get("termination");
  const compliance = get("compliance");

  const liabilityCap = Number(
    liability?.facts?.liabilityCap ?? 
    risks?.facts?.liabilityCap ?? 
    disputes?.facts?.liabilityCap ?? 
    NaN
  );

  const optOutDays = Number(
    disputes?.facts?.optOutDays ?? 
    disputes?.facts?.optOutPeriod ?? 
    NaN
  );

  const riskFlags: RiskFlags = {
    arbitration: Boolean(
      disputes?.facts?.arbitration || 
      /arbitration|JAMS/i.test(disputes?.body ?? "")
    ),
    classActionWaiver: Boolean(
      disputes?.facts?.classActionWaiver || 
      /class action/i.test(disputes?.body ?? "")
    ),
    liabilityCap: isFinite(liabilityCap) ? liabilityCap : null,
    terminationAtWill: Boolean(
      termination?.facts?.canSuspendAnytime || 
      /suspend|terminate/i.test(termination?.body ?? "")
    ),
    walletSelfCustody: Boolean(
      wallet?.facts?.selfCustody || 
      /wallet|keys|seed phrase/i.test(wallet?.body ?? "")
    ),
    irreversibleTxs: Boolean(
      risks?.facts?.irreversibleTxs || 
      /irreversible|final|non-refundable/i.test(risks?.body ?? "")
    ),
    bridgingL2Risks: Boolean(
      risks?.facts?.bridgingL2 || 
      /bridge|rollup|L2|optimism/i.test(risks?.body ?? "")
    ),
    optOutDays: isFinite(optOutDays) ? optOutDays : null,
  };

  // Create bullets from key sections
  const bullets: SummaryBullet[] = [
    // User rights (wallet, services)
    (wallet || services) && {
      icon: "✅",
      label: wallet?.title || services?.title || "Your Rights",
      text: (wallet?.bullets?.[0] || services?.bullets?.[0] || 
             wallet?.body || services?.body || 
             "You keep control of your wallet & assets."),
    },
    
    // Platform rights (termination, compliance)
    (termination || compliance) && {
      icon: "❌",
      label: termination?.title || compliance?.title || "Their Rights",
      text: (termination?.bullets?.[0] || compliance?.bullets?.[0] || 
             termination?.body || compliance?.body || 
             "Platform can change terms/suspend accounts."),
    },
    
    // Risks
    risks && {
      icon: "⚠️",
      label: risks.title || "Risks & Gotchas",
      text: (risks.bullets?.[0] || 
             risks.body || 
             "Transactions are final; tokens volatile; you bear technical risk."),
    },
    
    // Disputes
    disputes && {
      icon: "📜",
      label: disputes.title || "Disputes",
      text: (disputes.bullets?.[0] || 
             disputes.body || 
             "Binding arbitration; no class actions; 30‑day mail-in opt out."),
    },
  ].filter(Boolean) as SummaryBullet[];

  // Create details from all sections
  const details: DetailItem[] = [];
  for (const sec of parsed.sections ?? []) {
    const body = [
      ...(sec.bullets ?? []),
      sec.body ? String(sec.body) : "",
    ]
      .filter(Boolean)
      .join(" ");
    if (body) details.push({ title: sec.title, body });
  }

  return { bullets, details, risks: riskFlags };
}

/** Top-of-widget risk banner (optional) */
export function RiskBanner({ risks }: { risks: RiskFlags }) {
  const shouldShow =
    risks.arbitration || risks.classActionWaiver ||
    (typeof risks.liabilityCap === "number") || risks.terminationAtWill ||
    (typeof risks.optOutDays === "number");
  if (!shouldShow) return null;
  return (
    <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm">
      <div className="font-semibold">⚠️ Heads up</div>
      <ul className="list-disc ml-5 mt-1 space-y-1">
        {risks.arbitration && (
          <li>Disputes go to binding arbitration (limited court access).</li>
        )}
        {risks.classActionWaiver && (
          <li>Class actions are waived.</li>
        )}
        {typeof risks.liabilityCap === "number" && (
          <li>Liability cap: ${risks.liabilityCap.toLocaleString?.() ?? risks.liabilityCap}</li>
        )}
        {risks.terminationAtWill && (
          <li>Platform can suspend/terminate accounts at its discretion.</li>
        )}
        {typeof risks.optOutDays === "number" && (
          <li>Opt-out period: {risks.optOutDays} days to avoid arbitration.</li>
        )}
      </ul>
    </div>
  );
}

/**
 * Fully dynamic widget facade. Pass your parser JSON and (optionally)
 * event callbacks for analytics.
 */
export function LegalEasySummaryDynamic({
  parsed,
  title = "⚖️ Terms Summary",
  onToggle,
  onEvent,
  className,
}: {
  parsed: ParsedTerms;
  title?: string;
  onToggle?: (open: boolean) => void;
  onEvent?: (evt: { type: string; payload?: any }) => void;
  className?: string;
}) {
  const { bullets, details, risks } = mapParsedToSummary(parsed);
  const [open, setOpen] = useState(false);

  return (
    <section className={`w-full max-w-xl ${className ?? ""}`}>
      <RiskBanner risks={risks} />
      <LegalEasySummaryCard
        title={title}
        bullets={bullets}
        details={details}
        className=""
      />
    </section>
  );
}

/**
 * BRANDABLE PROMPT / CTA (inline or toast)
 * ----------------------------------------
 * Use this when you want a tiny, brand-colored prompt with a custom icon and
 * a short CTA label (e.g., just "Yes"). It pairs with the summary card above.
 */
import type { ReactNode, CSSProperties } from "react";

export function LegalEasyPrompt({
  question = "Want a quick plain‑English summary of these terms?",
  ctaLabel = "Yes",
  cancelLabel = "No",
  brandColor = "#7C3AED", // grape/purple default
  brandIcon = null, // e.g., <YourLogoIcon className="h-4 w-4" /> or "★"
  onAccept,
  onDismiss,
  className = "",
  styleOverrides,
}: {
  question?: string;
  ctaLabel?: string;        // ← set to "Yes" per request
  cancelLabel?: string;
  brandColor?: string;      // ← your brand hex (e.g., #00B3A6)
  brandIcon?: ReactNode;    // ← your brand icon (SVG/emoji/ReactNode)
  onAccept?: () => void;
  onDismiss?: () => void;
  className?: string;
  styleOverrides?: {
    borderRadius?: string;
    fontFamily?: string;
    fontSize?: string;
    lineHeight?: string;
    color?: string;
    buttonHeight?: number;
  };
}) {
  const styleVars = { "--le-brand": brandColor } as CSSProperties;
  const h = styleOverrides?.buttonHeight ?? 40;
  const radius = styleOverrides?.borderRadius;
  const fontFamily = styleOverrides?.fontFamily;
  const fontSize = styleOverrides?.fontSize;
  const lineHeight = styleOverrides?.lineHeight;
  const color = styleOverrides?.color;
  const btnBase = "flex-1 inline-flex justify-center items-center gap-2 rounded-md border px-3 text-sm font-medium";

  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border bg-white p-3 shadow-sm ${className}`}
      style={{
        ...styleVars,
        borderRadius: radius,
        fontFamily: fontFamily,
        fontSize: fontSize,
        lineHeight: lineHeight,
        color: color,
      }}
    >
      <div className="flex items-center gap-2 text-sm">
        {brandIcon ? (
          <span
            aria-hidden
            className="inline-flex items-center justify-center h-5 w-5 rounded-md"
            style={{ backgroundColor: "var(--le-brand)", color: "white" }}
          >
            {brandIcon}
          </span>
        ) : null}
        <span className="font-medium">{question}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onAccept}
          className={btnBase}
          style={{ height: h, backgroundColor: "var(--le-brand)", color: "white", borderColor: "var(--le-brand)" }}
        >
          {ctaLabel}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className={btnBase}
          style={{ height: h }}
        >
          {cancelLabel}
        </button>
      </div>
    </div>
  );
}

/**
 * Example: placing the prompt above the T&Cs, with branded color/icon and "Yes" label.
 */
export function LegalEasyPromptExample() {
  const [showSummary, setShowSummary] = useState(false);
  return (
    <div className="space-y-3">
      {!showSummary && (
        <LegalEasyPrompt
          question="Want a quick summary of these terms?"
          ctaLabel="Yes"                     // ← your request
          cancelLabel="No"
          brandColor="#00B3A6"             // ← your brand color
          brandIcon={<span>◆</span>}        // ← your brand icon (SVG/emoji/ReactNode)
          onAccept={() => setShowSummary(true)}
          onDismiss={() => setShowSummary(false)}
        />
      )}

      {showSummary && (
        <LegalEasySummaryDefault />
      )}
    </div>
  );
}

/**
 * AUTO‑ALIGNING PROMPT (non‑breaking addition)
 * -------------------------------------------
 * New components that adapt to host layout without changing existing APIs.
 * - LegalEasyPromptAligned: measures nearby styles and renders a matching prompt
 * - LegalEasyAutoPrompt: finds Terms/Agree elements and mounts the aligned prompt
 */
export function LegalEasyPromptAligned({
  brandColor = "#00B3A6",
  brandIcon = <span>◆</span>,
  question = "Want a summary of these terms?",
  ctaLabel = "Yes",
  cancelLabel = "No",
  referSelector,
  onAccept,
  onDismiss,
}: {
  brandColor?: string;
  brandIcon?: React.ReactNode;
  question?: string;
  ctaLabel?: string;
  cancelLabel?: string;
  /** CSS selector to measure (Agree button or a sibling). Optional. */
  referSelector?: string;
  onAccept?: () => void;
  onDismiss?: () => void;
}) {
  const [style, setStyle] = useState<{
    borderRadius?: string;
    fontFamily?: string;
    fontSize?: string;
    lineHeight?: string;
    color?: string;
    buttonHeight?: number;
  }>({});

  useState(() => {
    const refEl = referSelector ? (document.querySelector(referSelector) as HTMLElement | null) : null;
    const ref = refEl || (document.activeElement as HTMLElement | null) || document.body;
    const cs = getComputedStyle(ref);
    const rect = ref.getBoundingClientRect?.();
    setStyle({
      borderRadius: cs.getPropertyValue('border-radius') || '12px',
      fontFamily: cs.getPropertyValue('font-family') || undefined,
      fontSize: cs.getPropertyValue('font-size') || undefined,
      lineHeight: cs.getPropertyValue('line-height') || undefined,
      color: cs.getPropertyValue('color') || undefined,
      buttonHeight: Math.max(36, Math.round(rect?.height || 40)),
    });
  });

  const h = style.buttonHeight ?? 40;

  return (
    <div
      className="flex flex-col gap-2 rounded-xl border bg-white p-3 shadow-sm"
      style={{
        borderRadius: style.borderRadius,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
        color: style.color,
      }}
    >
      <div className="flex items-center gap-2 text-sm">
        <span
          aria-hidden
          className="inline-flex items-center justify-center h-5 w-5 rounded-md"
          style={{ backgroundColor: brandColor, color: "white" }}
        >
          {brandIcon}
        </span>
        <span className="font-medium">{question}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onAccept}
          className="flex-1 inline-flex justify-center items-center gap-2 rounded-md border px-3 text-sm font-medium"
          style={{ height: h, backgroundColor: brandColor, color: "white", borderColor: brandColor }}
        >
          {ctaLabel}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="flex-1 inline-flex justify-center items-center gap-2 rounded-md border px-3 text-sm font-medium"
          style={{ height: h }}
        >
          {cancelLabel}
        </button>
      </div>
    </div>
  );
}

export function LegalEasyAutoPrompt({
  brandColor = "#00B3A6",
  brandIcon = <span>◆</span>,
  question = "Want a summary of these terms?",
  ctaLabel = "Yes",
  cancelLabel = "No",
  termsSelectors = ['#terms', '.terms', '[data-terms]', '[aria-label*="terms" i]'],
  agreeSelectors = ['button', '[role="button"]', 'input[type="submit"]', '[name*="agree" i]', '[id*="agree" i]'],
}: {
  brandColor?: string;
  brandIcon?: React.ReactNode;
  question?: string;
  ctaLabel?: string;
  cancelLabel?: string;
  termsSelectors?: string[];
  agreeSelectors?: string[];
}) {
  const hostRef = useState<HTMLDivElement | null>(null)[0];
  const [ready, setReady] = useState(false);
  const [referSel, setReferSel] = useState<string | undefined>();

  useState(() => {
    function findOne(selectors: string[]) {
      for (const s of selectors) {
        const el = document.querySelector(s) as HTMLElement | null;
        if (el && el.offsetParent) return el;
      }
      return null;
    }

    const terms = findOne(termsSelectors);
    const agree = findOne(agreeSelectors);
    const target = (agree || terms) as HTMLElement | null;

    if (hostRef && target && target.parentNode) {
      // Insert right before the agree button if present, else above terms
      target.parentNode.insertBefore(hostRef, target);
      setReferSel(agree ? agreeSelectors.join(',') : termsSelectors.join(','));
      setReady(true);
    } else {
      // Fallback: render where placed
      setReady(true);
    }
  });

  return (
    <div ref={(el) => { if (hostRef !== el) hostRef = el; }} className="w-full max-w-full">
      {ready && (
        <LegalEasyPromptAligned
          brandColor={brandColor}
          brandIcon={brandIcon}
          question={question}
          ctaLabel={ctaLabel}
          cancelLabel={cancelLabel}
          referSelector={referSel}
        />
      )}
    </div>
  );
}

/**
 * Auto Prompt + Summary Reveal
 * ----------------------------
 * Mounts the aligned Yes/No prompt and, on Yes, reveals the summary card.
 * Pass `parsed` if you have normalized parser output; otherwise the default view renders.
 */
export function LegalEasyAutoPromptWithSummary({
  brandColor = "#00B3A6",
  brandIcon = <span>◆</span>,
  question = "Want a summary of these terms?",
  ctaLabel = "Yes",
  cancelLabel = "No",
  parsed,
  termsSelectors = ['#terms', '.terms', '[data-terms]', '[aria-label*="terms" i]'],
  agreeSelectors = ['button', '[role="button"]', 'input[type="submit"]', '[name*="agree" i]', '[id*="agree" i]'],
  onAccept,
  onDismiss,
}: {
  brandColor?: string;
  brandIcon?: React.ReactNode;
  question?: string;
  ctaLabel?: string;
  cancelLabel?: string;
  parsed?: ParsedTerms;
  termsSelectors?: string[];
  agreeSelectors?: string[];
  onAccept?: () => void;
  onDismiss?: () => void;
}) {
  const hostRef = useState<HTMLDivElement | null>(null)[0];
  const [ready, setReady] = useState(false);
  const [referSel, setReferSel] = useState<string | undefined>();
  const [accepted, setAccepted] = useState(false);

  useState(() => {
    function findOne(selectors: string[]) {
      for (const s of selectors) {
        const el = document.querySelector(s) as HTMLElement | null;
        if (el && el.offsetParent) return el;
      }
      return null;
    }

    const terms = findOne(termsSelectors);
    const agree = findOne(agreeSelectors);
    const target = (agree || terms) as HTMLElement | null;

    if (hostRef && target && target.parentNode) {
      target.parentNode.insertBefore(hostRef, target);
      setReferSel(agree ? agreeSelectors.join(',') : termsSelectors.join(','));
      setReady(true);
    } else {
      setReady(true);
    }
  });

  return (
    <div ref={(el) => { if (hostRef !== el) hostRef = el; }} className="w-full max-w-full">
      {!accepted && ready && (
        <LegalEasyPromptAligned
          brandColor={brandColor}
          brandIcon={brandIcon}
          question={question}
          ctaLabel={ctaLabel}
          cancelLabel={cancelLabel}
          referSelector={referSel}
          onAccept={() => setAccepted(true)}
          onDismiss={() => setAccepted(false)}
        />
      )}

      {accepted && (
        parsed ? (
          <LegalEasySummaryDynamic parsed={parsed} />
        ) : (
          <LegalEasySummaryDefault />
        )
      )}
    </div>
  );
}

/**
 * STEP 2 — Deterministic Parser Engine (TypeScript)
 * -------------------------------------------------
 * Export `parseTerms(text)` returning { parsed, risks, debug }.
 * This is rules-first (no LLM), matching the widget schema.
 */

// Helpers
function toISODate(input?: string | null): string | undefined {
  if (!input) return undefined;
  const d = new Date(input as any);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return undefined;
}
function cleanText(raw: string): string {
  return raw.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
}
function dollarsToNumber(s: string): number | null {
  const m = s.replace(/[\,\s]/g, '').match(/\x24?(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

// Lightweight sectionizer
type RawSection = { title: string; body: string };
function splitIntoSections(text: string): RawSection[] {
  const lines = text.split(/\n|\r/);
  const sections: RawSection[] = [];
  let current: RawSection | null = null;
  const heading = /^(\d+\.|[A-Z][\w\s/&-]{0,60}):?$/;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (heading.test(line)) {
      if (current) sections.push(current);
      current = { title: line.replace(/:$/, ''), body: '' };
    } else {
      if (!current) current = { title: 'General', body: '' };
      current.body += (current.body ? '\n' : '') + line;
    }
  }
  if (current) sections.push(current);
  return sections.length ? sections : [{ title: 'General', body: text }];
}

// Extractors
const ex = {
  product(text: string) {
    const m = text.match(/\b([A-Z][A-Za-z0-9.&\-\s]{1,40})\b(?=\s+Terms)/);
    return m && m[1] ? m[1].trim() : undefined;
  },
  updatedAt(text: string) {
    const m = text.match(/Last updated\s+([A-Za-z]{3,9}\s+\d{1,2},\s*\d{4}|\d{4}-\d{2}-\d{2})/i);
    return toISODate(m ? m[1] : undefined);
  },
  jurisdiction(text: string): string[] | undefined {
    const m = text.match(/governed by.*?law.*?(Delaware|California|New York|England|Wales|Ontario|Texas)/i);
    return m ? [m[1]] : undefined;
  },
  ageMin(text: string) {
    const m = text.match(/at least\s+(\d{1,2})\s+years? of age/i);
    return m ? Number(m[1]) : undefined;
  },
  sanctions(text: string) { return /(sanctions|embargoed jurisdiction)/i.test(text) || undefined; },
  selfCustody(text: string) { return /(do not|no)\s+(have )?custody.*(wallet|keys|assets)/i.test(text) || undefined; },
  gasFeesNonRefundable(text: string) { return /(gas|network) fees?.*?(non[-\s]?refundable|final)/i.test(text) || undefined; },
  irreversibleTxs(text: string) { return /(transactions? (are )?final|irreversible)/i.test(text) || undefined; },
  bridgingL2(text: string) { return /(bridge|rollup|layer[-\s]?two|OP\s*Stack|sequencer|dispute period)/i.test(text) || undefined; },
  arbitration(text: string) { return /(binding,?\s*(?:individual\s*)?arbitration|arbitration.*(?:JAMS|AAA|ICC))/i.test(text) || undefined; },
  arbitrationProvider(text: string) { const m = text.match(/(JAMS|AAA|ICC)/i); return m ? m[1].toUpperCase() : undefined; },
  classActionWaiver(text: string) {
    // require class-actionish wording near "waive/waiver/participate"
    return /waiv(e|er).{0,40}class (action|representative)|class (action|proceeding).{0,30}(waiv|not participate)/i
      .test(text) || undefined;
  },
  optOutDays(text: string) { const m = text.match(/opt[-\s]?out[^\d]{0,40}?(\d{1,3})\s+days?/i); return m ? Number(m[1]) : undefined; },
  liabilityCap(text: string) {
    // anchor to "liability" nearby, capture the numeric, prefer the first money amount
    const m = text.match(/(?:maximum|aggregate|overall).{0,40}liability.{0,40}(\x24\s?[\d,]+|\d+\s*dollars?)/i);
    if (m) {
      const n = dollarsToNumber(m[1]);
      if (n) return n;
    }
    
    // After computing liabilityCap above:
    if (!m) {
      const m2 = text.match(/greater\s+of\s+(\x24\s?[\d,]+)[^\.]{0,60}(amount (you )?paid|fees? paid)/i);
      const n2 = m2 ? dollarsToNumber(m2[1]) : null;
      if (n2) return n2;
    }
    
    return undefined;
  },
  terminateAtWill(text: string) { return /(suspend|terminate).*(any\s*time|sole\s*discretion)/i.test(text) || undefined; },
  modificationsImmediate(text: string) { return /(revise|update|change) (these )?terms.*(without prior notice|effective immediately)/i.test(text) || undefined; },
  notSecurity(text: string) { return /(not intended to be a\s*['\"]?security|not (an )?investment)/i.test(text) || undefined; },
  noInvestmentAdvice(text: string) { return /(no (investment|legal|tax) advice)/i.test(text) || undefined; },
  dmcaEmail(text: string) { const m = text.match(/dmca@[^\s)>,;]+/i); return m ? m[0].toLowerCase() : undefined; },
  dmcaAddress(text: string) { const m = text.match(/110\s+Green\s+Street[^\n]+/i); return m ? m[0] : undefined; },
  governingLaw(text: string) { const m = text.match(/governed by\s+the\s+laws?\s+of\s+([A-Za-z\s]+)/i); return m ? m[1].trim() : undefined; },
  venue(text: string) { const m = text.match(/state and federal courts located in\s+the\s+State\s+of\s+([A-Za-z\s]+)/i); return m ? m[1].trim() : undefined; },
  ccp1542(text: string) { return /california\s+civil\s+code\s+§?\s*1542/i.test(text) || undefined; },
  zoraStack(text: string) { return /OP\s*Stack/i.test(text) ? 'OP Stack' : undefined; },
  sequencer(text: string) { return /ConduitXYZ,?\s*Inc\./i.test(text) ? 'ConduitXYZ, Inc.' : undefined; },
  disputeDays(text: string) { return /seven[-\s]?day\s+[""']?dispute period[""']?/i.test(text) ? 7 : undefined; },
};

export function parseTerms(raw: string, opts?: { productHint?: string }) {
  const text = cleanText(raw);
  splitIntoSections(raw); // reserved for future weighting

  const product = (opts && opts.productHint) || ex.product(text);
  const updatedAt = ex.updatedAt(text);
  const jurisdiction = ex.jurisdiction(text);

  const outSections: ParsedTerms['sections'] = [] as any;

  const ageMin = ex.ageMin(text);
  if (ageMin) outSections.push({ key: 'eligibility', title: 'Eligibility', bullets: ['You must be at least ' + ageMin + '.'], facts: { ageMin } });

  const selfCustody = ex.selfCustody(text);
  const gasNonRefund = ex.gasFeesNonRefundable(text);
  const irreversible = ex.irreversibleTxs(text);
  if (selfCustody || gasNonRefund || irreversible) {
    const bullets: string[] = [];
    if (selfCustody) bullets.push('Platform is not a custodian; you hold your keys.');
    if (gasNonRefund) bullets.push('Gas/network fees are non-refundable.');
    if (irreversible) bullets.push('On-chain transactions are final/irreversible.');
    outSections.push({ key: 'wallet', title: 'Wallet & Self-Custody', bullets, facts: { selfCustody: !!selfCustody, noCustodyByPlatform: !!selfCustody, gasFeesNonRefundable: !!gasNonRefund } });
  }

  const notSecurity = ex.notSecurity(text);
  const noInv = ex.noInvestmentAdvice(text);
  if (notSecurity || noInv) {
    const bullets: string[] = [];
    if (notSecurity) bullets.push('Tokens framed as collectibles, not securities/investments.');
    if (noInv) bullets.push('No investment/legal/tax advice.');
    outSections.push({ key: 'tokens', title: 'Tokens', bullets, facts: { notSecurity: !!notSecurity, collectiblesOnly: !!notSecurity, noInvestmentAdvice: !!noInv } });
  }

  const bridging = ex.bridgingL2(text);
  if (irreversible || bridging) {
    const bullets: string[] = [];
    if (irreversible) bullets.push('Transactions are irreversible and volatile.');
    if (bridging) bullets.push('Bridging/L2 involves dispute/wait periods and technical risk.');
    outSections.push({ key: 'risks', title: 'Risks & Gotchas', bullets, facts: { irreversibleTxs: !!irreversible, bridgingL2: !!bridging } });
  }

  const arbitration = ex.arbitration(text);
  const provider = ex.arbitrationProvider(text);
  const classWaiver = ex.classActionWaiver(text);
  const optOutDays = ex.optOutDays(text);
  if (arbitration || classWaiver || optOutDays) {
    const bullets: string[] = [];
    if (arbitration || provider) bullets.push('Binding individual arbitration' + (provider ? ' (' + provider + ')' : '') + '; no class actions.');
    if (optOutDays) bullets.push('You can opt out within ' + optOutDays + ' days by mail.');
    outSections.push({ key: 'disputes', title: 'Dispute Resolution', bullets, facts: { arbitration: !!arbitration, arbitrationProvider: provider, classActionWaiver: !!classWaiver, optOutDays: (typeof optOutDays === "number" ? optOutDays : undefined) } });
  }

  const liabilityCap = ex.liabilityCap(text);
  if (typeof liabilityCap === "number") {
    outSections.push({ key: 'liability', title: 'Liability Limit', bullets: ['Liability cap: ' + '\x24' + liabilityCap.toLocaleString() + '.'], facts: { liabilityCap } });
  }

  const canSuspendAnytime = ex.terminateAtWill(text);
  if (canSuspendAnytime) outSections.push({ key: 'termination', title: 'Account Suspension/Termination', bullets: ['Platform may suspend/terminate at its discretion.'], facts: { canSuspendAnytime } });

  const termsChangeEffectiveImmediately = ex.modificationsImmediate(text);
  if (termsChangeEffectiveImmediately) outSections.push({ key: 'modifications', title: 'Changes to the Terms', bullets: ['Terms can change effective immediately without prior notice.'], facts: { termsChangeEffectiveImmediately } });

  if (/grant.*license|broad license/i.test(text)) outSections.push({ key: 'ip', title: 'Your Content & License', bullets: ['You grant the platform a broad license to operate/promote the service.'], facts: { broadLicenseToOperate: true } });

  const dmcaEmail = ex.dmcaEmail(text);
  const dmcaAddress = ex.dmcaAddress(text);
  if (dmcaEmail || dmcaAddress) {
    const bullets: string[] = [];
    if (dmcaEmail) bullets.push('DMCA email: ' + dmcaEmail + '.');
    if (dmcaAddress) bullets.push('DMCA mailing address present.');
    outSections.push({ key: 'dmca', title: 'DMCA', bullets, facts: { dmcaEmail, dmcaAddress } });
  }

  const governingLaw = ex.governingLaw(text) || (jurisdiction ? jurisdiction[0] : undefined);
  const venue = ex.venue(text) || governingLaw;
  if (governingLaw) outSections.push({ key: 'governing_law', title: 'Governing Law & Venue', bullets: [ (governingLaw + (venue ? '; venue ' + venue : '')) ], facts: { governingLaw, venue } });

  const ccp1542 = ex.ccp1542(text);
  if (ccp1542) outSections.push({ key: 'california_notice', title: 'California §1542', bullets: ['California Civil Code §1542 waiver present.'], facts: { ccp1542Waiver: true } });

  const stack = ex.zoraStack(text);
  const sequencer = ex.sequencer(text);
  const disputePeriodDays = ex.disputeDays(text);
  if (stack || sequencer || disputePeriodDays) {
    const bullets: string[] = [];
    if (stack) bullets.push(stack + ' rollup');
    if (sequencer) bullets.push('Sequencer operated by ' + sequencer + '.');
    if (disputePeriodDays) bullets.push('Withdrawals subject to a ' + disputePeriodDays + '-day dispute period.');
    outSections.push({ key: 'zora_network', title: 'Zora Network (L2)', bullets, facts: { stack, sequencerOperator: sequencer, disputePeriodDays } });
  }

  const risks: RiskFlags = {
    arbitration: !!arbitration,
    classActionWaiver: !!classWaiver,
    liabilityCap: (typeof liabilityCap === "number" ? liabilityCap : null),
    terminationAtWill: !!canSuspendAnytime,
    walletSelfCustody: !!selfCustody,
    irreversibleTxs: !!irreversible,
    bridgingL2Risks: !!bridging,
    optOutDays: (typeof optOutDays === "number" ? optOutDays : null),
  };

  const parsed: ParsedTerms = { product, updatedAt, jurisdiction, sections: outSections } as ParsedTerms;
  const debug = { matched: { product, updatedAt, jurisdiction, ageMin, selfCustody, gasNonRefund, irreversible, bridging, arbitration, provider, classWaiver, optOutDays, liabilityCap, canSuspendAnytime, termsChangeEffectiveImmediately, dmcaEmail, dmcaAddress, governingLaw, venue, ccp1542, stack, sequencer, disputePeriodDays } };

  return { parsed, risks, debug };
}

// Usage:
// const { parsed, risks } = parseTerms(termsText);
// <LegalEasySummaryDynamic parsed={parsed} />