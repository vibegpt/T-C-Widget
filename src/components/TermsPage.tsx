import { parseTerms } from "@/components/LegalEasySummary";
import { LegalEasySummaryDynamic } from "@/components/LegalEasySummary";

export default function TermsPage({ termsText }: { termsText: string }) {
  const { parsed } = parseTerms(termsText, { productHint: "Zora" });
  return <LegalEasySummaryDynamic parsed={parsed} />;
}
