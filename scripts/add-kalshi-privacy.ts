import OpenAI from 'openai';
import { createClient } from 'next-sanity';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY?.replace(/[\u2028\u2029]/g, '').trim(),
});

const writeClient = createClient({
  projectId: 'c15x4s4x',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

const KALSHI_PRIVACY_POLICY = `Kalshi Privacy Policy
Effective Date: December 20, 2023

This Privacy Policy outlines how Kalshi Inc. and its subsidiaries or affiliates (collectively, "Kalshi," "we," "our," or "us") process the information we collect about you through our websites, mobile apps, trading platform, and other online services (collectively, the "Services") and when you otherwise interact with us, such as through our customer service channels. If you are a California resident, please also see the "Notice to California Residents" section below.

⸻

I. TYPES OF INFORMATION COLLECTED AND HOW WE COLLECT THEM

A. Personal Information You Provide

We collect the following personal information you provide when you use our Services, such as when you sign up for a Kalshi account ("Membership"), or have taken steps to register for Membership, request a transaction, enroll in a promotion or program, or otherwise engage or communicate with us:
    1.    Identity Data – full name, date of birth, gender, social security number, and other data on government-issued identification documents.
    2.    Contact Data – email address, mailing address, and telephone numbers.
    3.    Financial Data – bank account and payment card details, as well as information about account balances, financial transaction history, credit history, tax information, and credit scores.
    4.    Profile Data – username and password, trades or orders made by you, and your interests, preferences, feedback, and survey responses.
    5.    Usage Information – details about how you access and use our Services, including interactions with others on the Services, your username, and other content you provide. Kalshi may, but has no obligation to, monitor, record, and store such information for safety, regulatory, or legal purposes.
    6.    Additional Information – info from focus groups, contests, sweepstakes, job applications, customer support, or other similar means. Includes call recordings and any communications between you and Kalshi.

B. Personal Information Collected Automatically

We collect certain personal information automatically when you visit our online services:
    1.    Location Data
    •    (a) To help protect against fraud, provide and improve our services, we collect location data, including current and historical information concerning geographic location, GPS location, transaction location, and IP addresses.
    •    (b) With your permission, we may collect precise location data to prevent fraud (e.g., detecting card transactions far from device location). We may use GPS, Wi-Fi, triangulation, or IP Address. Google Maps API may be used for this.
    2.    Usage and Device Data Through Tracking Technologies
    •    (a) Kalshi and third-party partners use cookies, Flash objects, web beacons, scripts, and similar technologies to collect info such as IP address, browser type, ISP, operating system, timestamps, and device identifiers to provide better user experience and advertising.
    •    (b) You can change your cookie settings in your browser; note that rejecting cookies may limit features.
    •    (c) Do-Not-Track Signals: Kalshi does not currently respond to "do-not-track" signals.

C. Personal Information From Other Sources and Third Parties

We also collect info from other sources, often combined with info collected directly from you:
    1.    Third-party Data – from business partners, marketing, and vendor partners.
    2.    Account Linking – Kalshi uses Plaid to link accounts; governed by Plaid's Privacy Policy at https://plaid.com/legal/#end-user-privacy-policy.
    3.    Third-party Services – If you log in with Google, Apple, etc., we may receive info such as profile data and email address from them.
    4.    Publicly Available Data – publicly available contact information used to personalize services or promotions.

⸻

II. HOW WE USE YOUR INFORMATION

We use and process collected information to:

A. Create and process your account and deliver the Services.
B. Send you transactional information (confirmations, invoices, notices, updates).
C. Communicate with you (support, feedback, updates, opportunities).
D. Conduct research and analytics to improve offerings.
E. Provide updates about products and services.
F. Make recommendations based on your interests or activity.
G. Monitor and enhance Services (troubleshooting, testing, statistics).
H. Enhance safety and security.
I. Perform audits and legal rights enforcement.
J. Comply with applicable laws.

⸻

III. DISCLOSURES OF PERSONAL INFORMATION

We may share your personal information in the following cases:

A. Authorized vendors/service providers – vetted contractors and partners for business operations (emailing, analytics, hosting, etc.).
B. Substantial corporate transactions – mergers, acquisitions, reorganizations, or asset sales.
C. Legal purposes – responding to subpoenas, court orders, or law enforcement requests.
D. With your consent – or in aggregated/anonymized form.

⸻

IV. THIRD-PARTY LINKS

Our Services may contain links to content maintained by third parties. We are not responsible for their privacy practices. Read their policies carefully.

⸻

V. THIRD-PARTY TRACKING AND ONLINE ADVERTISING

A. We use interest-based and third-party advertising. These partners may collect cookies and identifiers to show you relevant ads.
B. Kalshi is not responsible for third-party privacy practices. You can opt out via:
    •    http://www.networkadvertising.org/choices
    •    http://www.aboutads.info/choices

Google Analytics and Advertising
    1.    We use Google Analytics to recognize and link your devices. See: https://tools.google.com/dlpage/gaoptout/
    2.    Google advertising cookies may be used for ad personalization. Manage your preferences at:
    •    https://google.com/ads/preferences

⸻

VI. CONTROL OVER YOUR INFORMATION

A. Account profile – update via account settings.
B. Access to device data – manage in your device settings.
C. Communications preferences – unsubscribe via provided links (note: service-related emails cannot be opted out).

⸻

VII. NOTICE TO CALIFORNIA RESIDENTS

California residents have rights under the CCPA, though Kalshi's nonpublic financial data is exempt.
    •    You may request details about collected data, deletion, or opt-out of "sales."
    •    Contact: legal@kalshi.com
    •    Authorized agents may act on your behalf with proof of authority.

⸻

VIII. TRANSFER OF PERSONAL INFORMATION

Data may be stored and processed in the U.S. or other countries where Kalshi or its providers operate. If outside the U.S., your data may be transferred to jurisdictions with different laws.

⸻

IX. CHILDREN'S PRIVACY

We do not knowingly collect data from children under 13. If discovered, it will be deleted. Contact legal@kalshi.com for related concerns.

⸻

X. CHANGES TO THIS POLICY

We may update this Policy periodically and will revise the "Effective Date." You should review it regularly.

⸻

XI. HOW TO CONTACT US

Questions? Contact legal@kalshi.com.`;

async function analyzePrivacyPolicy(text: string) {
  console.log(`🤖 Analyzing Kalshi Privacy Policy with GPT-4o-mini...`);

  const sanitizedText = text
    .replace(/[\u2028\u2029]/g, '\n')
    .replace(/[^\x00-\x7F\u0080-\uFFFF]/g, '');

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a privacy analyst specializing in financial platforms and prediction markets. Extract 10-15 key privacy policies that affect users. Focus on: data collection practices, sharing with third parties, tracking/cookies, user rights (especially CCPA), location tracking, financial data handling, and any unusual privacy provisions.'
      },
      {
        role: 'user',
        content: `Analyze this Privacy Policy for Kalshi (CFTC-regulated US prediction markets platform):\n\n${sanitizedText}\n\nIMPORTANT: All policies should have section set to "privacy".\n\nFormat as JSON:\n{\n  "policies": [\n    {\n      "section": "privacy",\n      "title": "string",\n      "category": "good|bad|common",\n      "summary": "string (1-2 sentences)",\n      "impact": "critical|high|medium|low",\n      "details": "string with relevant quotes"\n    }\n  ]\n}`
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  return JSON.parse(completion.choices[0].message.content || '{}');
}

async function addPrivacyPoliciesToKalshi(newPolicies: any[]) {
  console.log(`\n💾 Adding privacy policies to Kalshi in Sanity...`);

  const convertToPortableText = (details: string) => [{
    _type: 'block',
    style: 'normal',
    children: [{ _type: 'span', text: details, marks: [] }],
  }];

  const formattedPolicies = newPolicies.map((policy: any) => ({
    _type: 'policyItem',
    _key: Math.random().toString(36).substring(7),
    section: 'privacy', // All privacy policy items go in the privacy section
    title: policy.title,
    category: policy.category,
    summary: policy.summary,
    details: convertToPortableText(policy.details),
    impact: policy.impact,
  }));

  // Get current Kalshi document
  const currentDoc = await writeClient.fetch(
    `*[_id == "aCqJiQ4RoExkxzpt6mYckc"][0]{ policies }`
  );

  // Merge existing policies with new privacy policies
  const allPolicies = [...(currentDoc.policies || []), ...formattedPolicies];

  // Recalculate overall rating and risk score
  const criticalCount = allPolicies.filter((p: any) => p.impact === 'critical').length;
  const badCount = allPolicies.filter((p: any) => p.category === 'bad').length;
  const goodCount = allPolicies.filter((p: any) => p.category === 'good').length;

  let overallRating = 'mixed';
  let riskScore = 5;

  if (criticalCount > 3 || badCount > goodCount * 2) {
    overallRating = 'risky';
    riskScore = 7 + Math.min(criticalCount, 3);
  } else if (goodCount > badCount * 2) {
    overallRating = 'good';
    riskScore = 3 - Math.min(goodCount / 5, 2);
  }

  // Update the document
  await writeClient
    .patch('aCqJiQ4RoExkxzpt6mYckc')
    .set({
      policies: allPolicies,
      overallRating,
      riskScore,
      quickSummary: 'Comprehensive analysis of Kalshi\'s data terms and privacy policy, including strict AI/ML prohibitions, extensive data collection practices, third-party tracking, CCPA rights, and comprehensive liability disclaimers for the first CFTC-regulated prediction market exchange.',
      keyTakeaways: [
        'CFTC-regulated and legally compliant in the United States',
        'Strict prohibition on AI/ML training and data mining',
        'Collects extensive personal and financial data including SSN and location',
        'Third-party tracking and advertising with Google Analytics',
        'California residents have CCPA rights for data access and deletion',
        'No response to Do-Not-Track signals',
      ],
      privacyPolicyUrl: 'https://kalshi.com/privacy-policy',
    })
    .commit();

  console.log(`✅ Added ${formattedPolicies.length} privacy policies to Kalshi`);
  console.log(`📊 Total policies: ${allPolicies.length}`);
}

async function main() {
  console.log('\n🎯 Adding Kalshi Privacy Policy\n');
  console.log('='.repeat(60) + '\n');

  const analysis = await analyzePrivacyPolicy(KALSHI_PRIVACY_POLICY);

  if (!analysis.policies || analysis.policies.length === 0) {
    console.error('❌ No policies extracted');
    return;
  }

  console.log(`✓ Extracted ${analysis.policies.length} privacy policies\n`);

  analysis.policies.forEach((policy: any, idx: number) => {
    console.log(`${idx + 1}. ${policy.title} (${policy.category}, ${policy.impact})`);
  });

  await addPrivacyPoliciesToKalshi(analysis.policies);

  console.log('\n' + '='.repeat(60));
  console.log('🎉 Kalshi privacy policy addition complete!');
  console.log('='.repeat(60) + '\n');
}

main().catch(console.error);
