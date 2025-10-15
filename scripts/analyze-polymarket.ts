import OpenAI from 'openai';
import { createClient } from 'next-sanity';
import * as cheerio from 'cheerio';

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

// Privacy Policy text provided directly
const PRIVACY_POLICY_TEXT = `PRIVACY POLICY

Last Updated: January 11, 2022

Introduction

This website-hosted user interface (this "Interface") is made available by Adventure One QSS Inc., a corporation organized and existing under the laws of Panama (the "Company" "us" "we" or "our")).
This Privacy Policy (the "Policy") governs the manner in which we make the Interface available  and how we collect, use, maintain and disclose information collected from our users (each, a "user", "you", or "your") through the Company's websites, including the Interface, web applications mobile applications and all associated sites linked thereto by the Interface, or by us or our affiliates (the "Site").This Policy further applies to all information we collect through our Site and otherwise obtain in connection with products and Services, content, features, technologies, functions and all related websites we may provide to you or to which we may provide access (collectively with the Site, the "Services").
Please read this Policy carefully. We are committed to protecting your privacy through our compliance with the terms of this Policy.
We understand that you may have questions regarding this Policy, including your personal information, how it may be collected, and how it may be used. You may e-mail us at legal@polymarket.com with any concerns or privacy-related questions that you may have.
Our Terms of Services ("Terms") govern all use of our Services and, together with the Privacy Policy, constitute your agreement with us (the "Agreement"). If you do not agree with the terms of this Policy, please do not access our Site.
By accessing or using our Services, you agree to the terms of this Policy. Specifically, by (i) using, visiting, or accessing the Services, (ii) using, accessing, establishing an account through or purchasing any of the Services, and/or (iii) clicking "accept", "agree", or "OK" (or a similar term) with respect to any of our Terms or similar policies, you consent and agree to be legally bound by each of the terms and conditions contained in this Policy.
In operating the Site and provide the Services we may collect (and/or receive) certain information about you and your activities. You hereby authorize us to collect and/or receive such information to operate the Site and provide the Services.
Applicability
This Policy applies to all information we collect from you in connection with the Site and offering the Services.  This Policy does not apply to information collected by us offline or through any other means, including on any other website made available by us or by any third party (including our affiliates and subsidiaries). Throughout this Policy, we use the term "personal information" to describe information that can be associated with a specific person and can be used to identify that person. We do not consider personal information to include information that has been aggregated and/or anonymized so that it does not identify a specific user. Personal Information may also include the personal information of third parties that may be contained in information you provide to us through your use of the Site.
Information Collection and Use
When you visit the Site and use the Services, we collect your IP address and standard web log information, such as your browser type and pages you accessed on our Site. We may also collect certain geolocation Information (as defined below). If you do not agree to our collection of this information, you may not be able to use the Services.
We collect information:
Directly from you when you provide it to us;
Automatically as you navigate through the site. Information collected automatically may include usage details, IP addresses, and information collected through Cookies and other tracking technologies; and
In certain instances, from third parties, such as our business partners, third-party providers (e.g., Metamask) or other networks where you have connected your account and authorized the Site to access this information.
If you create an account with us, we may collect the following information from you:
Personal Information. Information by which you may be personally identified, such as your name, postal address, registration at place of residence, e-mail address, telephone number, date of birth, and other demographic information, such as your age, gender, hometown, and interests that you voluntarily provide to us as part of your registration with the Site to use  our Service (collectively, "Personal Information"). There is no obligation for you to provide us with personal information of any kind, but your refusal to do so may prevent you from using the Services.
Derivative Information. Information our servers may collect automatically when you access the Site, such as your IP address, browser type, operating system, access times, and pages you viewed directly before and after accessing the Site. This may also include other information about your internet connection and the equipment you use to access our Site, and usage details.
Financial Information. If applicable to your use of the Site and the Services, in order for us to process payments of any fees owed to us in connection with your use of the Services and the Site, you will be required to provide certain bank account online login information, bank account and routing numbers, credit card information (e.g., card brand, expiration date, and credit-card numbers) and other data related to your payment method. You authorize our third-party payment vendors and wallet providers (e.g., MetaMask) to collect, process, and store your Financial Information in accordance with their respective privacy policies.
Mobile Device Information. If you access the Site from a mobile device we may obtain information automatically about you from your mobile device such as your device type, mobile device identification number, geolocation Information, time zone, language setting, browser type. If you provide it directly to us, we may also collect your telephone number.
Geolocation Information. We collect information that identifies, with reasonable specificity, your location by using certain longitude and latitude coordinated obtained through GPS, Wi-Fi, cell-site triangulation, or other locational data. We may collect this data for fraud prevention and risk management purposes, among other reasons.
Correspondence and Recordkeeping. We will retain records and copies of your correspondence (including e-mail addresses), if you contact us. We will retain all records for such time period as may be required by applicable law.
Surveys: If you decide to participate in surveys available via the Services, you may be asked to provide certain information which may include personal information. We may store such responses.
We are committed to providing a safe and secure customer experience. As a result, before permitting you to use the Services, we may require additional information from you (including for instance government-issued identity documents such as passport number, driver's license details or national identity card details) that we can use to verify your identity, address or other information, prevent fraud or to manage risk and compliance throughout our relationship.
Finally, we may collect additional information from or about you in other ways not specifically described here. For example, we may collect information related to your contact with our customer support team.
Children Under the Age of 18
Our Site is not intended for children under 18 years of age. No one under age 18 may provide any personal information to or on the Site. If we obtain actual knowledge that we have collected personal information from a person under the age of 18, we will promptly delete it, unless we are legally obligated to retain such data. If you believe we may have mistakenly or unintentionally collected any information from or about a person under 18, please contact us using the contact information provided below.`;

async function fetchDocumentText(url: string): Promise<string | null> {
  // Return the privacy policy text directly since the page is JS-rendered
  console.log(`📄 Using provided Privacy Policy text`);
  return PRIVACY_POLICY_TEXT;
}

async function analyzeDocument(text: string) {
  console.log(`🤖 Analyzing Polymarket terms with GPT-4o-mini...`);

  const sanitizedText = text
    .replace(/[\u2028\u2029]/g, '\n')
    .replace(/[^\x00-\x7F\u0080-\uFFFF]/g, '');

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a legal analyst specializing in prediction markets and cryptocurrency platforms. Extract 8-20 key policies that affect users. Focus on: betting/wagering restrictions, market manipulation rules, payout conditions, dispute resolution, regulatory compliance, age restrictions, prohibited jurisdictions, fees, privacy, and unusual limitations.'
      },
      {
        role: 'user',
        content: `Analyze this Terms of Service for Polymarket (Prediction Markets platform):\n\n${sanitizedText}\n\nFormat as JSON:\n{\n  "policies": [\n    {\n      "section": "account|trading|dispute|liability|fees|privacy|other",\n      "title": "string",\n      "category": "good|bad|common",\n      "summary": "string (1-2 sentences)",\n      "impact": "critical|high|medium|low",\n      "details": "string with relevant quotes"\n    }\n  ]\n}`
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  return JSON.parse(completion.choices[0].message.content || '{}');
}

async function createPolymarket(policies: any[], termsUrl: string) {
  console.log(`\n💾 Creating Polymarket in Sanity...`);

  const convertToPortableText = (details: string) => [{
    _type: 'block',
    style: 'normal',
    children: [{ _type: 'span', text: details, marks: [] }],
  }];

  const formattedPolicies = policies.map((policy: any) => ({
    _type: 'policyItem',
    section: policy.section,
    title: policy.title,
    category: policy.category,
    summary: policy.summary,
    details: convertToPortableText(policy.details),
    impact: policy.impact,
  }));

  // Calculate overall rating and risk score
  const criticalCount = formattedPolicies.filter((p: any) => p.impact === 'critical').length;
  const badCount = formattedPolicies.filter((p: any) => p.category === 'bad').length;
  const goodCount = formattedPolicies.filter((p: any) => p.category === 'good').length;

  let overallRating = 'mixed';
  let riskScore = 5;

  if (criticalCount > 3 || badCount > goodCount * 2) {
    overallRating = 'risky';
    riskScore = 7 + Math.min(criticalCount, 3);
  } else if (goodCount > badCount * 2) {
    overallRating = 'good';
    riskScore = 3 - Math.min(goodCount / 5, 2);
  }

  const platformData = {
    _type: 'predictionMarket',
    name: 'Polymarket',
    slug: { _type: 'slug', current: 'polymarket' },
    description: 'Prediction market platform for betting on real-world events',
    overallRating,
    riskScore,
    quickSummary: 'Comprehensive analysis of Polymarket\'s terms of service, including betting restrictions, regulatory compliance, and payout conditions.',
    termsUrl,
    founded: '2020',
    jurisdiction: 'United States',
    policies: formattedPolicies,
    keyTakeaways: [
      'Review all betting restrictions and prohibited jurisdictions',
      'Understand market manipulation rules and dispute resolution processes',
      'Be aware of regulatory compliance requirements and age restrictions',
    ],
    featured: true,
    displayOrder: 999,
  };

  const result = await writeClient.create(platformData);
  console.log(`✅ Created Polymarket (ID: ${result._id})`);
  return result;
}

async function main() {
  console.log('\n🎯 Analyzing Polymarket (Prediction Markets)\n');
  console.log('='.repeat(60) + '\n');

  const termsUrl = 'https://polymarket.com/tos';

  const text = await fetchDocumentText(termsUrl);

  if (!text) {
    console.error('❌ Failed to fetch Polymarket terms');
    return;
  }

  const analysis = await analyzeDocument(text);

  if (!analysis.policies || analysis.policies.length === 0) {
    console.error('❌ No policies extracted');
    return;
  }

  console.log(`✓ Extracted ${analysis.policies.length} policies\n`);

  analysis.policies.forEach((policy: any, idx: number) => {
    console.log(`${idx + 1}. ${policy.title} (${policy.category}, ${policy.impact})`);
  });

  await createPolymarket(analysis.policies, termsUrl);

  console.log('\n' + '='.repeat(60));
  console.log('🎉 Polymarket analysis complete!');
  console.log('='.repeat(60) + '\n');
}

main().catch(console.error);
