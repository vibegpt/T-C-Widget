import { createClient } from 'next-sanity';

const writeClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'c15x4s4x',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

const convertToPortableText = (details: string) => {
  return [
    {
      _type: 'block',
      style: 'normal',
      children: [
        {
          _type: 'span',
          text: details,
          marks: [],
        },
      ],
    },
  ];
};

async function addAerodromeDisclosures() {
  const documentId = 'NVi8Lbm72mV0apzYeKqx5q';

  console.log(`Fetching existing Aerodrome document...`);

  const existingDoc = await writeClient.fetch(
    `*[_id == $id][0]{ _id, name, policies }`,
    { id: documentId }
  );

  if (!existingDoc) {
    throw new Error(`Document with ID ${documentId} not found`);
  }

  console.log(`Found existing document: ${existingDoc.name}`);
  console.log(`Current policies count: ${existingDoc.policies?.length || 0}`);

  // Manual policy extraction from the legal disclosures summary
  const newPolicies = [
    {
      _type: 'policyItem',
      section: 'liability',
      title: 'No Regulatory Approval or Investor Protection',
      category: 'bad',
      summary: 'AERO token is not approved by EU regulators and not covered by investor protection or deposit insurance schemes.',
      details: convertToPortableText('The white paper states: "Not approved by regulators: No EU authority has vetted or approved this paper." Additionally, "No compensation or deposit protection: It\'s not covered by EU investor-protection or bank-deposit schemes." This means users have no recourse if funds are lost.'),
      impact: 'critical',
    },
    {
      _type: 'policyItem',
      section: 'liability',
      title: 'Total Loss of Investment Risk',
      category: 'bad',
      summary: 'You could lose all your money as AERO can drop in value or become completely illiquid.',
      details: convertToPortableText('The document explicitly warns: "You could lose all your money: AERO can drop in value or become illiquid." The token has "No intrinsic value: Worth only what users are willing to pay."'),
      impact: 'critical',
    },
    {
      _type: 'policyItem',
      section: 'other',
      title: 'Cayman Islands Jurisdiction',
      category: 'common',
      summary: 'Aerodrome Foundation is registered in Cayman Islands with Cayman courts having exclusive legal authority.',
      details: convertToPortableText('The issuer is an "Exempted Limited Guarantee Foundation Company" registered in the Cayman Islands since August 2023. Legal jurisdiction falls under "Cayman Islands law; Cayman courts have exclusive authority."'),
      impact: 'high',
    },
    {
      _type: 'policyItem',
      section: 'trading',
      title: 'Token Inflation Through Emissions',
      category: 'bad',
      summary: 'Weekly token emissions can dilute value unless tokens are locked in veAERO.',
      details: convertToPortableText('The document warns of "Inflation: weekly token emissions dilute value unless locked." The emission schedule includes a take-off phase (weeks 1-14) with 3% weekly increases, cruise phase (weeks 15-67) with 1% weekly decreases, and an Aero Fed phase where veAERO voters can adjust emissions by ±0.01% per week.'),
      impact: 'high',
    },
    {
      _type: 'policyItem',
      section: 'trading',
      title: 'Complex Dual-Token System',
      category: 'common',
      summary: 'AERO uses a dual-token system with AERO (tradable) and veAERO (locked governance NFT) with complex mechanics.',
      details: convertToPortableText('The system consists of: "AERO: freely tradable ERC-20 token" and "veAERO (vote-escrowed NFT): created when you lock AERO for 1 week–4 years; grants voting rights + fee rewards." veAERO holders "vote weekly on which liquidity pools get new AERO emissions" and "earn 100% of fees + any external bribes from protocols seeking liquidity."'),
      impact: 'medium',
    },
    {
      _type: 'policyItem',
      section: 'trading',
      title: 'Exchange Listing Volatility Risks',
      category: 'bad',
      summary: 'Trading on centralized exchanges carries risks of volatility, thin order books, and possible trading halts.',
      details: convertToPortableText('The document identifies "Exchange listing risks: volatility, thin order books, and possible trading halts on CEXs." The token is listed on OKCoin Europe Ltd (Market ID OEUR).'),
      impact: 'high',
    },
    {
      _type: 'policyItem',
      section: 'liability',
      title: 'Smart Contract and Technology Risks',
      category: 'bad',
      summary: 'Potential vulnerabilities in smart contracts, bridge security, and Base network congestion.',
      details: convertToPortableText('The disclosure lists "Technology risk: smart-contract bugs, bridge vulnerabilities, or Base network congestion." While "Smart contracts built on audited Velodrome V2 code" and there\'s an "Active bug-bounty and multi-signature protections," risks remain inherent to blockchain technology.'),
      impact: 'high',
    },
    {
      _type: 'policyItem',
      section: 'liability',
      title: 'Dependency on Base Network Success',
      category: 'bad',
      summary: 'Project heavily depends on Base Layer 2 network success; governance apathy could harm the protocol.',
      details: convertToPortableText('The document identifies "Project risk: depends heavily on Base\'s success; governance apathy could harm the protocol." Since AERO is built on Base (Ethereum Layer 2), any issues with Base directly affect the token.'),
      impact: 'high',
    },
    {
      _type: 'policyItem',
      section: 'other',
      title: 'Foundation Lock-up Protection',
      category: 'good',
      summary: 'Foundation\'s 95 million AERO tokens (19% of supply) are permanently locked and cannot be sold.',
      details: convertToPortableText('A positive safeguard: "Foundation\'s 95 M AERO (19%) is permanently locked — can\'t be sold." This prevents the foundation from dumping tokens on the market and protects against insider selling.'),
      impact: 'medium',
    },
    {
      _type: 'policyItem',
      section: 'other',
      title: 'Emergency Council Powers',
      category: 'common',
      summary: 'Emergency Council can pause or fix gauges in crises but has no access to user funds.',
      details: convertToPortableText('The protocol has an "Emergency Council" that "can pause or fix gauges in crises (no access to user funds)." This provides emergency response capabilities while limiting potential abuse by preventing direct access to user assets.'),
      impact: 'medium',
    },
  ];

  console.log(`Adding ${newPolicies.length} new policies from legal disclosures`);

  // Combine existing and new policies
  const combinedPolicies = [...(existingDoc.policies || []), ...newPolicies];

  console.log(`Total policies after merge: ${combinedPolicies.length}`);

  // Update the document
  const result = await writeClient
    .patch(documentId)
    .set({
      policies: combinedPolicies,
    })
    .commit();

  console.log(`✅ Successfully updated ${existingDoc.name} with ID: ${result._id}`);
  return result;
}

// Run if executed directly
if (require.main === module) {
  addAerodromeDisclosures().catch(console.error);
}
