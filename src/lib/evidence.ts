import { createHash } from 'node:crypto';

export const normalizeSourceText = (text: string) => text.replace(/\s+/g, ' ').trim();
export const textHash = (text: string) => 'sha256:' + createHash('sha256').update(text).digest('hex');

/** Offsets are UTF-16 code units into the normalized analyzed text, end exclusive. */
export function locateEvidence(sourceId: string, quote: string, text: string) {
  const normalizedText = normalizeSourceText(text);
  const normalizedQuote = normalizeSourceText(quote);
  const start = normalizedText.indexOf(normalizedQuote);
  if (normalizedQuote.length < 8 || normalizedQuote.length > 1000 || start < 0) return null;
  return {
    source_id: sourceId, quote: normalizedQuote, start_char: start,
    end_char: start + normalizedQuote.length, quote_hash: textHash(normalizedQuote),
    analyzed_text_hash: textHash(normalizedText), validation: 'exact_substring' as const,
  };
}

/** Necessary numeric support only; this is not a semantic truth/entailment check. */
export function numericQuoteSupports(field: string, value: number, quote: string): boolean {
  const numbers=[...quote.matchAll(/\b\d+(?:[.,]\d+)*\b/g)].map(m=>Number(m[0].replace(/,/g,'')));
  if (numbers.includes(value)) return true;
  // Unambiguous unit conversions often used by merchant policies.
  const conversion=field==='duration_months'?12:/days/.test(field)?7:null;
  const unit=field==='duration_months'?'years?':'weeks?';
  if (conversion && [...quote.matchAll(new RegExp('\\b(\\d+)\\s+'+unit+'\\b','gi'))].some(m=>Number(m[1])*conversion===value)) return true;
  // Accept written small numbers, but conservatively discard unsupported numerals.
  const words=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve'];
  return value<=12 && Number.isInteger(value) && new RegExp('\\b'+words[value]+'\\b','i').test(quote);
}
