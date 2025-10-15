import Navigation from '@/components/navigation';
import Footer from '@/components/footer';
import { client } from '@/lib/sanity';
import EnhancedPlatformList from '@/components/EnhancedPlatformList';

interface Platform {
  name: string;
  founded?: string;
  hq?: string;
  summary: string;
  logo: string;
  risk: string;
  riskScore: number;
  riskLabel: string;
  color: "green" | "yellow" | "red";
  riskComponents: {
    policies: number;
    security: number;
    compliance: number;
  };
  volume24h?: string;
  custody?: string;
  kyc?: string;
  fees?: {
    maker: number;
    taker: number;
  };
  verified: boolean;
  licensed: boolean;
  licenseRegions?: string[];
  audited: boolean;
  proofOfReserves: boolean;
  fiatSupport: boolean;
  lastUpdated: string;
  detailUrl: string;
}

async function getCEXs() {
  const query = `*[_type == "cex" && featured == true] | order(displayOrder asc){
    _id,
    name,
    "slug": slug.current,
    description,
    "image": image.asset->url,
    founded,
    jurisdiction,
    overallRating,
    riskScore,
    quickSummary,
    termsUrl,
    policies,
    keyTakeaways
  }`;

  try {
    const data = await client.fetch(query);

    // If no data from Sanity, return empty array
    if (!data || data.length === 0) {
      return [];
    }

    // Transform Sanity data to Platform format
    const platforms: Platform[] = data.map((exchange: any) => {
      const riskScore = exchange.riskScore || 5;
      const color: "green" | "yellow" | "red" =
        riskScore <= 3 ? "green" : riskScore <= 6 ? "yellow" : "red";
      const riskLabel =
        riskScore <= 2 ? "Very Low Risk" :
        riskScore <= 4 ? "Low Risk" :
        riskScore <= 6 ? "Moderate Risk" :
        riskScore <= 8 ? "High Risk" : "Very High Risk";

      return {
        name: exchange.name,
        founded: exchange.founded,
        hq: exchange.jurisdiction,
        summary: exchange.description || exchange.quickSummary || '',
        logo: exchange.image || '/logos/placeholder.png',
        risk: `${riskScore}/10`,
        riskScore,
        riskLabel,
        color,
        riskComponents: {
          policies: calculatePolicyScore(exchange.policies),
          security: 7, // Default - can be enhanced later
          compliance: exchange.overallRating === 'good' ? 8 : exchange.overallRating === 'mixed' ? 5 : 3,
        },
        volume24h: '', // Not in schema yet
        custody: 'Custodial', // Default for CEX
        kyc: 'Required', // Default for CEX
        verified: true,
        licensed: exchange.overallRating === 'good',
        licenseRegions: exchange.jurisdiction ? [exchange.jurisdiction] : [],
        audited: exchange.overallRating === 'good',
        proofOfReserves: false, // Not in schema yet
        fiatSupport: true, // Default for CEX
        lastUpdated: new Date().toISOString().split('T')[0],
        detailUrl: `/crypto/cex/${exchange.slug}`,
      };
    });

    return platforms;
  } catch (error) {
    console.error('Error fetching CEXs from Sanity:', error);
    return [];
  }
}

function calculatePolicyScore(policies: any[]): number {
  if (!policies || policies.length === 0) return 5;

  const goodPolicies = policies.filter((p: any) => p.category === 'good').length;
  const badPolicies = policies.filter((p: any) => p.category === 'bad').length;
  const total = policies.length;

  // Score from 0-10 based on ratio of good to bad
  const ratio = (goodPolicies - badPolicies) / total;
  return Math.round(5 + (ratio * 5)); // Maps -1 to 0, 0 to 5, 1 to 10
}

export default async function CEXPage() {
  const exchanges = await getCEXs();

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <EnhancedPlatformList
        platforms={exchanges}
        type="cex"
        accentColor="blue"
        title={<>Centralized Exchanges <span className="text-blue-600">(CEX)</span></>}
        subtitle="Compare terms, policies, and trader rights across major centralized cryptocurrency exchanges. Know your rights before you deposit."
        backLink={{ url: "/crypto/dex", label: "View DEXs" }}
      />

      {/* Info Banner */}
      <div className="max-w-7xl mx-auto px-6 pb-16">
        <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-6">
          <h3 className="text-xl font-bold text-foreground mb-3">Understanding CEX Risks</h3>
          <ul className="space-y-2 text-foreground/70">
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>Exchanges can freeze accounts without prior notice or detailed explanation</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>Withdrawal limits may be imposed during high volatility</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>Terms of service can change with minimal notification</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>Not your keys, not your crypto - exchanges control your funds</span>
            </li>
          </ul>
        </div>
      </div>

      <Footer />
    </div>
  );
}
