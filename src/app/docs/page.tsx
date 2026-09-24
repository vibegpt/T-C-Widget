import type {Metadata} from 'next';
export const metadata:Metadata={title:'PolicyCheck API documentation',description:'Signed seller policy facts, evidence, provenance and integration instructions.'};
const sample=JSON.stringify({seller_url:'https://example.com',agent_id:'shopping-agent',transaction_ref:'order-123'},null,2);
const endpoints=[['POST /api/check','Signed facts through REST'],['POST /api/v1/signed-assessment','Same signed response contract'],['POST /api/a2a','JSON-RPC message/send'],['POST /api/x402/analyze','Paid x402 v2 analysis'],['POST /api/v1/verify','Signature validity and freshness'],['GET /.well-known/jwks.json','Ed25519 public keys'],['GET /api/clause-registry','Source-aware clause definitions']];
export default function Docs(){return <main className="max-w-4xl mx-auto px-6 py-16 text-slate-200 bg-[#0a0a0a] min-h-screen">
  <a href="/" className="text-violet-300">PolicyCheck</a>
  <h1 className="text-4xl font-bold my-6">Policy facts your agent can inspect</h1>
  <p>PolicyCheck extracts seller policies independently and returns signed facts with source excerpts. Your agent applies the buyer's purchase criteria.</p>
  <section id="quick-start" className="my-10"><h2 className="text-2xl mb-4">Quick start</h2>
    <p>POST JSON to <code>https://policycheck.tools/api/v1/signed-assessment</code>:</p>
    <pre className="my-4 p-4 bg-slate-900 rounded overflow-auto">{sample}</pre>
    <p>Use <code>seller_url</code> for discovery, <code>url</code> for exactly one policy page, or <code>policy_text</code> for supplied text. Text must contain 50–100,000 characters. Links inside supplied text are not followed.</p>
  </section>
  <section id="endpoints" className="my-10"><h2 className="text-2xl mb-4">Endpoints</h2><table className="w-full text-left"><tbody>{endpoints.map(([name,description])=><tr key={name} className="border-b border-slate-800"><td className="py-3 pr-5"><code>{name}</code></td><td>{description}</td></tr>)}</tbody></table></section>
  <section id="response-fields" className="my-10"><h2 className="text-2xl mb-4">Read the result</h2>
    <p><code>signed_assessment</code> contains policies, clauses, source provenance, coverage and limitations. Each non-null fact includes a matching evidence excerpt. Unknown values remain null. Clauses are marked as standard boilerplate only when their known clause type appears in a terms-of-service source.</p>
    <p className="mt-3">Statuses: <code>complete</code>, <code>partial</code>, <code>text_provided</code>, <code>no_content</code>, <code>no_facts</code>, <code>extraction_failed</code>. Complete refers to the requested retrieval scope; homepage discovery is limited to common paths. It is not a claim that every applicable policy was found. Supplied text is never labeled independently retrieved.</p>
    <p className="mt-3">Evidence is checked for presence in source text. Model-assisted interpretation can still be wrong. Preserve conditions and product exceptions when applying the facts. Confidence is extraction confidence, not merchant trust.</p>
  </section>
  <section id="signed-assessments" className="my-10"><h2 className="text-2xl mb-4">Signatures and freshness</h2>
    <p>Version 2.1 uses Ed25519 over recursively key-sorted JSON with no whitespace. Verify the envelope, not duplicated convenience fields, against the public keys from PolicyCheck's trusted domain. Compare seller, transaction context and expiry with your request.</p>
    <p className="mt-3">The verify endpoint returns <code>signature_valid</code> and <code>fresh</code> separately. <code>valid</code> requires both. A signature can remain authentic after the five-minute freshness period expires. It authenticates the issuer and content; it does not guarantee the merchant's claims.</p>
  </section>
  <section id="integration-patterns" className="my-10"><h2 className="text-2xl mb-4">MCP and A2A</h2>
    <pre className="my-4 p-4 bg-slate-900 rounded overflow-auto">npx -y policycheck-mcp@1.0.3</pre>
    <p>MCP tools: <code>check_seller_policies</code>, <code>analyze_seller</code>, <code>check_policy_text</code>. The previous tool name remains accepted as a compatibility alias. A2A accepts <code>message/send</code> with a data part containing the same input fields. Results are synchronous.</p>
  </section>
  <section id="endpoint-x402" className="my-10"><h2 className="text-2xl mb-4">Paid access</h2>
    <p>Use an x402 v2 client and the live 402 payment requirements. Evidence-backed partial results are billable and disclose limitations. No settlement occurs for no content, no extracted facts, extraction failure, or failure to prepare a signed result. Failed settlement never reports a successful payment.</p>
  </section>
  <section id="audit" className="my-10"><h2 className="text-2xl mb-4">Audit records</h2><p>Supply a private, high-entropy X-API-Key of at least 24 characters to partition your audit records. Keep it secret: it is a bearer credential for that partition. The response's audit_recorded field reports whether persistence succeeded. Anonymous records cannot be retrieved through the public audit endpoints. Records are retained for 90 days; audit storage failure does not invalidate a signature.</p></section>
  <p className="mt-10"><a href="/skill.md" className="text-violet-300">Agent instructions</a> · <a href="/openapi.json" className="text-violet-300">OpenAPI schema</a> · <a href="/webmcp-demo" className="text-violet-300">WebMCP demo</a></p>
</main>;}
