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
  users?: string;
  category?: string;
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

async function getThirdPartyApps() {
  const query = `*[_type == "thirdPartyApp" && featured == true] | order(displayOrder asc){
    _id,
    name,
    "slug": slug.current,
    description,
    "image": image.asset->url,
    category,
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

    const platforms: Platform[] = data.map((app: any) => {
      const riskScore = app.riskScore || 5;
      const color: "green" | "yellow" | "red" =
        riskScore <= 3 ? "green" : riskScore <= 6 ? "yellow" : "red";
      const riskLabel =
        riskScore <= 2 ? "Very Low Risk" :
        riskScore <= 4 ? "Low Risk" :
        riskScore <= 6 ? "Moderate Risk" :
        riskScore <= 8 ? "High Risk" : "Very High Risk";

      return {
        name: app.name,
        hq: app.category === 'Hardware Wallet' ? 'Global' : 'Decentralized',
        summary: app.description || app.quickSummary || '',
        logo: app.image || '/logos/placeholder.png',
        risk: `${riskScore}/10`,
        riskScore,
        riskLabel,
        color,
        riskComponents: {
          policies: calculatePolicyScore(app.policies),
          security: app.category === 'Hardware Wallet' ? 9 : 7,
          compliance: app.overallRating === 'good' ? 7 : app.overallRating === 'mixed' ? 5 : 3,
        },
        users: app.users || '',
        category: app.category || 'Wallet',
        verified: true,
        licensed: app.category === 'Hardware Wallet',
        licenseRegions: app.category === 'Hardware Wallet' ? ['EU'] : [],
        audited: app.overallRating === 'good',
        proofOfReserves: false,
        fiatSupport: ['Wallet', 'Hardware Wallet'].includes(app.category),
        lastUpdated: new Date().toISOString().split('T')[0],
        detailUrl: `/crypto/third-party-apps/${app.slug}`,
      };
    });

    return platforms;
  } catch (error) {
    console.error('Error fetching third-party apps from Sanity:', error);
    return [];
  }
}

export default async function ThirdPartyAppsPage() {
  const apps = await getThirdPartyApps();

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <EnhancedPlatformList
        platforms={apps}
        type="third-party"
        accentColor="green"
        title={<>Third Party <span className="text-green-600">Apps & Services</span></>}
        subtitle="Review privacy policies, data handling practices, and security measures of popular crypto tools. Your data and keys deserve protection."
        backLink={{ url: "/crypto", label: "Back to Crypto" }}
      />

      {/* Info Banner */}
      <div className="max-w-7xl mx-auto px-6 pb-16">
        <div className="bg-green-900/20 border border-green-800 rounded-lg p-6">
          <h3 className="text-xl font-bold text-foreground mb-3">Third-Party App Concerns</h3>
          <ul className="space-y-2 text-foreground/70">
            <li className="flex items-start">
              <span className="text-green-600 mr-2">•</span>
              <span>Data collection and sharing practices may compromise your privacy</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-600 mr-2">•</span>
              <span>Wallet permissions can grant access to all your funds</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-600 mr-2">•</span>
              <span>Terms of service can change without notice or consent</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-600 mr-2">•</span>
              <span>Browser extensions have access to your web activity and credentials</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-600 mr-2">•</span>
              <span>Cloud backups may expose your seed phrases to third parties</span>
            </li>
          </ul>
        </div>
      </div>

      <Footer />
    </div>
  );
}
