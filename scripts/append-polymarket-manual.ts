import { createClient } from 'next-sanity';

const writeClient = createClient({
  projectId: 'c15x4s4x',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

async function appendManualPolicies() {
  console.log('📋 Fetching existing Polymarket document...\n');

  const existingDoc = await writeClient.fetch(
    `*[_id == "yoRegLyjAjsStViXmQJtiq"][0]{ _id, name, policies }`
  );

  if (!existingDoc) {
    console.error('❌ Polymarket document not found');
    return;
  }

  console.log(`✓ Found Polymarket with ${existingDoc.policies?.length || 0} existing policies\n`);

  const convertToPortableText = (details: string) => [{
    _type: 'block',
    style: 'normal',
    children: [{ _type: 'span', text: details, marks: [] }],
  }];

  const newPolicies = [
    {
      _type: 'policyItem',
      section: 'account',
      title: 'Extensive Geographic Restrictions',
      category: 'bad',
      summary: 'Trading prohibited for users in US, UK, France, Ontario, Singapore, Poland, Thailand, Australia, Belgium, Taiwan and other restricted territories.',
      details: convertToPortableText('USE OF THE SITE, PLATFORM OR TECHNOLOGY FEATURES FOR TRADING IS NOT PERMITTED BY PERSONS OR ENTITIES WHO RESIDE IN, ARE LOCATED IN, ARE INCORPORATED IN, HAVE A REGISTERED OFFICE IN, OR HAVE THEIR PRINCIPAL PLACE OF BUSINESS IN THE UNITED STATES OF AMERICA, UNITED KINGDOM, FRANCE, ONTARIO, SINGAPORE, POLAND, THAILAND, AUSTRALIA, BELGIUM, TAIWAN, OR ANY OTHER RESTRICTED TERRITORY. VPN use strictly prohibited. Violations may result in wallets being placed in close-only mode.'),
      impact: 'critical',
    },
    {
      _type: 'policyItem',
      section: 'trading',
      title: 'Complete Loss of Funds Risk',
      category: 'bad',
      summary: 'Users can lose the entire amount supplied to contracts with no refunds or reversals.',
      details: convertToPortableText('BY USING THE PLATFORM TO TRADE AND ENTER INTO CONTRACTS, YOU CAN LOSE UP TO THE ENTIRE AMOUNT OF THE CRYPTOASSETS SUPPLIED TO THE CONTRACT. Transactions are irreversible, final and there are no refunds. Company has no ability to reverse transactions or provide refunds.'),
      impact: 'critical',
    },
    {
      _type: 'policyItem',
      section: 'dispute',
      title: 'No Control Over Contract Resolution',
      category: 'bad',
      summary: 'Company is not involved in or responsible for resolving disputes about prediction market outcomes.',
      details: convertToPortableText('The Company is not involved in nor responsible for the resolution of any Contracts displayed on the Platform. All Contracts are resolved by the UMA Optimistic Oracle, a smart contract based optimistic oracle. The Company is not responsible for any disputes related to the resolution of any Contracts and any such disputes shall be made through the prescribed process through the UMA dApp.'),
      impact: 'critical',
    },
    {
      _type: 'policyItem',
      section: 'dispute',
      title: 'Mandatory Arbitration in Panama',
      category: 'bad',
      summary: 'All disputes must be resolved through binding arbitration in Panama under Panama law.',
      details: convertToPortableText('Any dispute, claim or controversy arising out of or relating to the Terms will be determined by arbitration in Panama before one arbitrator. Governed by Panama Arbitration Law and laws of Panama. Users waive right to trial by jury.'),
      impact: 'high',
    },
    {
      _type: 'policyItem',
      section: 'dispute',
      title: 'Class Action Waiver',
      category: 'bad',
      summary: 'Users cannot participate in class action lawsuits and must arbitrate individually.',
      details: convertToPortableText('YOU UNDERSTAND THAT BY AGREEING TO THE TERMS, THE PARTIES ARE EACH WAIVING THE RIGHT TO TRIAL BY JURY OR TO PARTICIPATE IN A CLASS ACTION OR CLASS ARBITRATION. Any arbitration will take place on an individual basis – class arbitrations and class actions are not permitted.'),
      impact: 'high',
    },
    {
      _type: 'policyItem',
      section: 'liability',
      title: 'No Liability for Hacks or Lost Funds',
      category: 'bad',
      summary: 'Company not responsible for hacking, unauthorized access, or any damage resulting in loss of funds.',
      details: convertToPortableText('THE COMPANY WILL NOT BE RESPONSIBLE FOR (vi) ANY DAMAGE, LOSS, OR INJURY RESULTING FROM HACKING, TAMPERING, OR OTHER UNAUTHORIZED ACCESS OR USE OF THE INTERFACES OR FEATURES. Company has no ability to reverse transactions, recover lost funds, or provide compensation. Aggregate liability capped at $100.'),
      impact: 'critical',
    },
    {
      _type: 'policyItem',
      section: 'account',
      title: 'Account Termination at Any Time',
      category: 'bad',
      summary: 'Company can terminate user access at any time for any reason without notice.',
      details: convertToPortableText('The Company may, at its sole discretion, from time to time and with or without prior notice, modify, suspend or disable (temporarily or permanently) the Site or Features, in whole or in part. Company reserves the right to terminate your access, prohibit participation in programs, and take any other action deemed reasonable or necessary. Any person in violation may have their wallets placed in close-only mode.'),
      impact: 'high',
    },
    {
      _type: 'policyItem',
      section: 'trading',
      title: 'Prohibited Market Manipulation',
      category: 'common',
      summary: 'Extensive list of prohibited trading activities including wash trading, spoofing, front-running, and market manipulation.',
      details: convertToPortableText('Prohibited activities include: (i) fraudulent acts or schemes to defraud; (ii) front-running; (iii) fraudulent trading; (iv) fictitious transactions; (v) cornering; (vi) violations of bids or offers; (vii) wash trading; (viii) manipulation; (ix) spoofing; (x) making market prices that do not reflect true market state; (xi) any abusive, improper or disruptive trading activity.'),
      impact: 'high',
    },
    {
      _type: 'policyItem',
      section: 'liability',
      title: 'No Guarantees on Platform Functionality',
      category: 'bad',
      summary: 'Company provides no warranties and cannot guarantee security, functionality, or availability of the platform.',
      details: convertToPortableText('THE SITE AND FEATURES ARE PROVIDED "AS IS." Company makes no representations or warranties of any kind and expressly disclaims all warranties, including warranties of merchantability, fitness for purpose, security, availability, or that content will be secure or not lost. Company cannot and does not guarantee the functionality, security, or availability of the Site or Features.'),
      impact: 'high',
    },
    {
      _type: 'policyItem',
      section: 'account',
      title: 'OFAC and Sanctions Compliance Required',
      category: 'common',
      summary: 'Users must not be on OFAC sanctions lists or from sanctioned countries.',
      details: convertToPortableText('Users represent they are not: (i) subject to economic or trade sanctions; (ii) on OFAC Specially Designated Nationals list or EU/UK sanctions lists; (iii) violating anti-money laundering or terrorist financing laws; or (iv) from sanctioned countries including Iran, Syria, Cuba, North Korea, Crimea, Donetsk, Luhansk regions.'),
      impact: 'high',
    },
    {
      _type: 'policyItem',
      section: 'other',
      title: 'User Responsible for Wallet Security',
      category: 'common',
      summary: 'Company has no access to user wallets and cannot assist with lost funds or reversed transactions.',
      details: convertToPortableText('You are solely responsible for your self-hosted cryptocurrency wallet including private keys and passwords. Company will not and cannot access your private key, password, or cryptoassets nor can it reverse any transactions. Company cannot be responsible or liable for how you use your Wallet. Users must familiarize themselves with wallet security, smart contract vulnerabilities, hacks, and phishing attacks.'),
      impact: 'medium',
    },
    {
      _type: 'policyItem',
      section: 'other',
      title: 'No Professional or Investment Advice',
      category: 'common',
      summary: 'All information is for informational purposes only and not professional or investment advice.',
      details: convertToPortableText('None of the information provided on the Site should be construed as professional or investment advice. Company does not owe any duties or obligations based on information provided. Company is not acting as an investment adviser, trading, tax, legal or other adviser. Users should seek independent professional advice before making financial or legal decisions.'),
      impact: 'medium',
    },
  ];

  console.log(`➕ Adding ${newPolicies.length} new policies to Polymarket\n`);

  newPolicies.forEach((policy: any, idx: number) => {
    console.log(`${idx + 1}. ${policy.title} (${policy.category}, ${policy.impact})`);
  });

  const combinedPolicies = [...(existingDoc.policies || []), ...newPolicies];

  const result = await writeClient
    .patch('yoRegLyjAjsStViXmQJtiq')
    .set({ policies: combinedPolicies })
    .commit();

  console.log(`\n✅ Successfully updated Polymarket - now has ${combinedPolicies.length} total policies`);
}

appendManualPolicies().catch(console.error);
