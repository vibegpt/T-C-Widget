import { JSDOM } from "jsdom";
import crypto from "node:crypto";

/**
 * Fetch HTML and extract main article-like content using Readability.
 * Falls back to full text if Readability yields nothing.
 */
export async function fetchAndExtract(url: string) {
  const res = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; LegalEasyBot/1.0; +https://legaleasy.app)",
      "accept": "text/html,application/xhtml+xml"
    }
  });
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  }
  const html = await res.text();
  const dom = new JSDOM(html, { url });
  // Lazy import to avoid ESM default issues
  const { Readability } = await import("@mozilla/readability");
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  // Prefer Readability content; else fallback to body text
  const rawText =
    (article?.textContent || "")
      .replace(/\r/g, "")
      .replace(/\t/g, " ")
      .replace(/\u00A0/g, " ") // nbsp
      .trim() ||
    dom.window.document.body.textContent?.trim() ||
    "";

  // Normalize whitespace, collapse multiples
  const normalized = normalizeText(rawText);

  const hash = sha256(normalized);
  return {
    title: article?.title || dom.window.document.title || "",
    text: normalized,
    content_hash: `sha256:${hash}`,
    approx_length: normalized.length
  };
}

export function normalizeText(input: string) {
  return input
    .replace(/\s+/g, " ")
    .replace(/[ \n]+$/g, "")
    .trim();
}

export function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}