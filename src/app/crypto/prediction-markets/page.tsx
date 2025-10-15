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
  users?: string;
  custody?: string;
  kyc?: string;
  blockchain?: string;
  verified: boolean;
  licensed: boolean;
  licenseRegions?: string[];
  audited: boolean;
  proofOfReserves: boolean;
  fiatSupport: boolean;
  lastUpdated: string;
  detailUrl: string;
}

function calculatePolicyScore(policies: any[]): number {
  if (!policies || policies.length === 0) return 5;
  const goodPolicies = policies.filter((p: any) => p.category === 'good').length;
  const badPolicies = policies.filter((p: any) => p.category === 'bad').length;
  const total = policies.length;
  const ratio = (goodPolicies - badPolicies) / total;
  return Math.round(5 + (ratio * 5));
}

async function getPredictionMarkets() {
  const query = `*[_type == "predictionMarket" && featured == true] | order(displayOrder asc){
    _id,
    name,
    "slug": slug.current,
    description,
    "image": image.asset->url,
    founded,
    jurisdiction,
    tradingVolume,
    users,
    overallRating,
    riskScore,
    quickSummary,
    termsUrl,
    policies,
    keyTakeaways
  }`;

  try {
    const data = await client.fetch(query);

    if (!data || data.length === 0) {
      return [];
    }

    const platforms: Platform[] = data.map((market: any) => {
      const riskScore = market.riskScore || 5;
      const color: "green" | "yellow" | "red" =
        riskScore <= 3 ? "green" : riskScore <= 6 ? "yellow" : "red";
      const riskLabel =
        riskScore <= 2 ? "Very Low Risk" :
        riskScore <= 4 ? "Low Risk" :
        riskScore <= 6 ? "Moderate Risk" :
        riskScore <= 8 ? "High Risk" : "Very High Risk";

      // Determine custody and KYC based on platform characteristics
      const isRegulated = market.overallRating === 'good';
      const isDecentralized = market.jurisdiction === 'Decentralized' || !market.jurisdiction;

      return {
        name: market.name,
        founded: market.founded,
        hq: market.jurisdiction || 'Decentralized',
        summary: market.description || market.quickSummary || '',
        logo: market.image || '/logos/placeholder.png',
        risk: `${riskScore}/10`,
        riskScore,
        riskLabel,
        color,
        riskComponents: {
          policies: calculatePolicyScore(market.policies),
          security: isDecentralized ? 6 : 8,
          compliance: isRegulated ? 9 : isDecentralized ? 3 : 5,
        },
        volume24h: market.tradingVolume || '',
        users: market.users || '',
        custody: isDecentralized ? 'Non-custodial' : 'Custodial',
        kyc: isRegulated ? 'Required' : isDecentralized ? 'None' : 'Geoblocked (US)',
        blockchain: isDecentralized ? 'Polygon' : undefined,
        verified: true,
        licensed: isRegulated,
        licenseRegions: isRegulated ? [market.jurisdiction] : [],
        audited: true,
        proofOfReserves: false,
        fiatSupport: isRegulated,
        lastUpdated: new Date().toISOString().split('T')[0],
        detailUrl: `/crypto/prediction-markets/${market.slug}`,
      };
    });

    return platforms;
  } catch (error) {
    console.error('Error fetching prediction markets from Sanity:', error);
    return [];
  }
}

export default async function PredictionMarketsPage() {
  const platforms = await getPredictionMarkets();

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <EnhancedPlatformList
        platforms={platforms}
        type="prediction-market"
        accentColor="purple"
        title={<>Prediction Markets <span className="text-purple-600">Terms & Policies</span></>}
        subtitle="Understand betting restrictions, payout conditions, and user rights across prediction market platforms. Know the risks before you wager."
        backLink={{ url: "/crypto", label: "Back to Crypto" }}
      />

      {/* Info Banner */}
      <div className="max-w-7xl mx-auto px-6 pb-16">
        <div className="bg-purple-900/20 border border-purple-800 rounded-lg p-6">
          <h3 className="text-xl font-bold text-foreground mb-3">Prediction Market Considerations</h3>
          <ul className="space-y-2 text-foreground/70">
            <li className="flex items-start">
              <span className="text-purple-600 mr-2">•</span>
              <span>Regulatory status varies widely - some platforms may be illegal in your jurisdiction</span>
            </li>
            <li className="flex items-start">
              <span className="text-purple-600 mr-2">•</span>
              <span>Market resolution can be subjective and disputed, affecting payouts</span>
            </li>
            <li className="flex items-start">
              <span className="text-purple-600 mr-2">•</span>
              <span>Low liquidity markets may have extreme price slippage</span>
            </li>
            <li className="flex items-start">
              <span className="text-purple-600 mr-2">•</span>
              <span>Decentralized platforms offer no recourse for incorrect resolutions</span>
            </li>
            <li className="flex items-start">
              <span className="text-purple-600 mr-2">•</span>
              <span>KYC requirements and geographic restrictions can change without notice</span>
            </li>
          </ul>
        </div>
      </div>

      <Footer />
    </div>
  );
}
