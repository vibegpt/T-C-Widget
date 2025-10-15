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
  tvl?: string;
  blockchain?: string;
  verified: boolean;
  licensed: boolean;
  audited: boolean;
  proofOfReserves: boolean;
  fiatSupport: boolean;
  lastUpdated: string;
  detailUrl: string;
}

async function getDEXs() {
  const query = `*[_type == "dex" && featured == true] | order(displayOrder asc){
    _id,
    name,
    "slug": slug.current,
    description,
    "image": image.asset->url,
    blockchain,
    tvl,
    displayOrder
  }`;

  try {
    const data = await client.fetch(query);

    if (!data || data.length === 0) {
      return [];
    }

    const platforms: Platform[] = data.map((dex: any) => {
      const riskScore = 5; // DEXs get moderate default risk
      const color: "green" | "yellow" | "red" = "yellow";
      const riskLabel = "Moderate Risk";

      return {
        name: dex.name,
        hq: "Decentralized",
        summary: dex.description || '',
        logo: dex.image || '/logos/placeholder.png',
        risk: `${riskScore}/10`,
        riskScore,
        riskLabel,
        color,
        riskComponents: {
          policies: 6,
          security: 7,
          compliance: 4,
        },
        tvl: dex.tvl || '',
        blockchain: dex.blockchain || 'Ethereum',
        verified: true,
        licensed: false, // DEXs typically aren't licensed
        audited: true, // Assume most major DEXs are audited
        proofOfReserves: false, // Not applicable for DEXs
        fiatSupport: false, // DEXs don't support fiat
        lastUpdated: new Date().toISOString().split('T')[0],
        detailUrl: `/crypto/dex/${dex.slug}`,
      };
    });

    return platforms;
  } catch (error) {
    console.error('Error fetching DEXs from Sanity:', error);
    return [];
  }
}

export default async function DEXPage() {
  const dexs = await getDEXs();

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <EnhancedPlatformList
        platforms={dexs}
        type="dex"
        accentColor="purple"
        title={<>Decentralized Exchanges <span className="text-purple-600">(DEX)</span></>}
        subtitle="Understand smart contract risks, protocol governance, and your rights when trading on DEXs. Non-custodial doesn't mean risk-free."
        backLink={{ url: "/crypto/cex", label: "View CEXs" }}
      />

      {/* Info Banner */}
      <div className="max-w-7xl mx-auto px-6 pb-16">
        <div className="bg-purple-900/20 border border-purple-800 rounded-lg p-6">
          <h3 className="text-xl font-bold text-foreground mb-3">Understanding DEX Risks</h3>
          <ul className="space-y-2 text-foreground/70">
            <li className="flex items-start">
              <span className="text-purple-600 mr-2">•</span>
              <span>Smart contract vulnerabilities can lead to total loss of funds</span>
            </li>
            <li className="flex items-start">
              <span className="text-purple-600 mr-2">•</span>
              <span>No customer support or recourse if something goes wrong</span>
            </li>
            <li className="flex items-start">
              <span className="text-purple-600 mr-2">•</span>
              <span>Protocol governance can change rules without your explicit consent</span>
            </li>
            <li className="flex items-start">
              <span className="text-purple-600 mr-2">•</span>
              <span>Impermanent loss in liquidity pools can exceed trading fees earned</span>
            </li>
          </ul>
        </div>
      </div>

      <Footer />
    </div>
  );
}
