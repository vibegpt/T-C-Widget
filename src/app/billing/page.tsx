export default function BillingPage() {
  return <main className="mx-auto max-w-2xl px-6 py-20 text-slate-100">
    <h1 className="text-3xl font-semibold">PolicyCheck API billing</h1>
    <p className="mt-6">Completed a credit purchase? Your balance updates after payment confirmation. Returning to this page does not itself confirm payment.</p>
    <p className="mt-4">Your agent can check the balance at <code>GET /api/v1/billing/usage</code> using your API key.</p>
    <p className="mt-4">Keep your API key private. Do not paste it into this page or put it in a URL.</p>
    <a className="mt-8 inline-block underline" href="/agent-service.md">API setup and billing guide</a>
  </main>;
}
