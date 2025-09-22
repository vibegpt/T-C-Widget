import crypto from "node:crypto";

export type ClauseTag =
  | "data_use" | "data_sharing" | "cookies" | "auto_renewal" | "cancellation" | "fees"
  | "arbitration" | "jurisdiction" | "warranty" | "liability" | "age" | "ip"
  | "third_party" | "do_not_sell" | "other";

export type Risk = "R" | "Y" | "G";

export type ClauseOut = {
  tag: ClauseTag;
  risk: Risk;
  rationale: string;
  plain_english: string;
  text_excerpt?: string;
};

const TAXONOMY: ClauseTag[] = [
  "data_use","data_sharing","cookies","auto_renewal","cancellation","fees",
  "arbitration","jurisdiction","warranty","liability","age","ip","third_party",
  "do_not_sell","other"
];

export function chunkText(s: string, max = 6000) {
  const parts: string[] = [];
  let buf = "";
  for (const seg of s.split(/(?<=[\.\!\?])\s+/)) {
    if ((buf + " " + seg).length > max) {
      if (buf) parts.push(buf.trim());
      buf = seg;
    } else {
      buf = buf ? buf + " " + seg : seg;
    }
  }
  if (buf) parts.push(buf.trim());
  return parts;
}

export function buildPrompt(chunk: string) {
  return [
`You are a legal-to-plain-English converter and risk flagger.
Rewrite the following legal text into clear, neutral plain language (reading level grade 8–9).
Classify each point using one of these tags: ${TAXONOMY.join(", ")}.
Assign risk: "R" (harmful/onerous), "Y" (unclear/mixed), "G" (benign).

Output STRICT JSON (no commentary):

{ "clauses": [ { "tag":"<one of taxonomy>", "risk":"R|Y|G",
  "rationale":"<why>", "plain_english":"<2-5 bullets joined by \\n>",
  "text_excerpt":"<short quote from source>" } ] }

Rules:
- If unsure, use risk "Y" and explain.
- Quote exact phrases for text_excerpt (<= 240 chars).
- No legal advice; just explain plainly.`,
`SOURCE TEXT:\n${chunk}`
  ];
}

export async function callOpenAIJson(messages: string[]) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("Missing OPENAI_API_KEY");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: messages[0] },
        { role: "user",   content: messages[1] }
      ]
    })
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content from OpenAI");
  return JSON.parse(content);
}

export function safeParseClauses(obj: unknown): ClauseOut[] {
  const arr = Array.isArray(obj?.clauses) ? obj.clauses : [];
  const out: ClauseOut[] = [];
  for (const c of arr) {
    const tag = (TAXONOMY.includes(c?.tag) ? c.tag : "other") as ClauseTag;
    const risk = (["R","Y","G"].includes(c?.risk) ? c.risk : "Y") as Risk;
    const plain = String(c?.plain_english || "").trim();
    if (!plain) continue;
    const rationale = String(c?.rationale || "").trim();
    const excerpt = String(c?.text_excerpt || "").slice(0, 240);
    out.push({ tag, risk, rationale, plain_english: plain, text_excerpt: excerpt });
  }
  return out;
}

export function aggregatePage(clauses: ClauseOut[]) {
  const score = clauses.reduce((s, c) => s + (c.risk === "R" ? 2 : c.risk === "Y" ? 1 : 0), 0);
  const overall: Risk = score >= 6 ? "R" : score >= 3 ? "Y" : "G";
  const worst: Record<ClauseTag, Risk> = Object.fromEntries(
    TAXONOMY.map(t => [t, "G"])
  ) as any;
  for (const c of clauses) {
    const cur = worst[c.tag];
    if (c.risk === "R" || (c.risk === "Y" && cur === "G")) worst[c.tag] = c.risk;
  }
  const highlights = Object.entries(worst)
    .filter(([, r]) => r !== "G")
    .slice(0, 6)
    .map(([tag, risk]) => ({
      tag: tag as ClauseTag,
      risk: risk as Risk,
      summary: summarizeFirstLine(tag as ClauseTag, clauses)
    }));
  return { overall_risk: overall, highlights, clauses };
}

function summarizeFirstLine(tag: ClauseTag, clauses: ClauseOut[]) {
  const c = clauses.find(x => x.tag === tag);
  if (!c) return "Notable clause";
  const first = (c.plain_english.split("\n")[0] || c.plain_english).trim();
  return first.length > 140 ? first.slice(0, 137) + "..." : first;
}

export function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}
