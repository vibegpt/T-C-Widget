export type PolicyInput = {
  mode: "seller" | "policy_page" | "text";
  sellerUrl: string;
  policyText: string | null;
};

export class InputError extends Error {}

export function publicUrl(value: unknown): string {
  if (typeof value !== "string" || value.length > 2048) throw new InputError("A valid HTTP(S) URL is required");
  let url: URL;
  try { url = new URL(value); } catch { throw new InputError("A valid HTTP(S) URL is required"); }
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) {
    throw new InputError("Use a public HTTP(S) URL without credentials");
  }
  url.hash = "";
  return url.href;
}

export function parsePolicyInput(body: unknown): PolicyInput {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new InputError("A JSON object is required");
  const b = body as Record<string, unknown>;
  const text = b.policy_text ?? b.text;
  const seller = b.seller_url ?? b.sellerUrl;
  const page = b.url;
  if (text !== undefined) {
    if (typeof text !== "string" || text.trim().length < 50 || text.length > 100_000) {
      throw new InputError("Policy text must contain between 50 and 100,000 characters");
    }
    return { mode: "text", sellerUrl: seller !== undefined || page !== undefined ? publicUrl(seller ?? page) : "direct text analysis", policyText: text.trim() };
  }
  if (seller !== undefined && page !== undefined) throw new InputError("Provide either seller_url or url, not both");
  if (seller !== undefined) return { mode: "seller", sellerUrl: publicUrl(seller), policyText: null };
  if (page !== undefined) return { mode: "policy_page", sellerUrl: publicUrl(page), policyText: null };
  throw new InputError("Provide seller_url for discovery, url for a policy page, or policy_text");
}

export function inputFromMessage(message:unknown): Record<string,unknown> {
  const parts=(message as {parts?:Array<{kind:string;data?:Record<string,unknown>;text?:string}>})?.parts;
  if(!Array.isArray(parts))throw new InputError('Message with parts required');
  const data=parts.find(p=>p.kind==='data')?.data;
  if(data)return data;
  const text=parts.find(p=>p.kind==='text')?.text;
  if(typeof text!=='string')throw new InputError('Provide structured input or policy text');
  // Only an entire URL is a URL command. Embedded links belong to the supplied text.
  if(/^https?:\/\/\S+$/.test(text.trim())) {
    const url=new URL(text.trim());
    return url.pathname==='/'?{seller_url:url.href}:{url:url.href};
  }
  return {policy_text:text};
}
