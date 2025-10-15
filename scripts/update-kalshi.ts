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

const KALSHI_TERMS = `Content on the kalshi.com website ("Website") is owned or licensed by Kalshi and is
protected by worldwide intellectual property laws. The products, technology or
processes described in this Website may also be protected by intellectual property rights
of Kalshi or third parties. No license is granted with respect to those intellectual
property rights. By accessing the Website, you acknowledge and agree that you are
requesting access to the Kalshi Data made available on the Website.
The content on the Website includes, without limitation: volume, bid-ask prices,
opening and closing range prices, high-low prices, settlement prices, indexes, open
interest and related information, market descriptions, materials, and other content on
the Website ("Kalshi Data"). Kalshi Data is calculated according to the proprietary
methods of Kalshi or certain third-parties with which Kalshi has a relationship with and
through the application of methods, creativity and standards of judgment used and
developed through the expenditure of considerable work, time and money, and may be
modified from time to time based on this same or other criteria, and all rights, title, and
interest therein are expressly reserved by Kalshi.
All access and use of Kalshi Data is subject to these Kalshi Data Terms of Use. You
acknowledge and agree that the reservation of rights by Kalshi in these Kalshi Data
Terms of Use is appropriate.
I. PERMITTED USES
You are only permitted to access and use the Kalshi Data in the form in which it is
presented on the Website. You understand, acknowledge and agree, that use of Kalshi
Data is at your sole risk. You may access content only for your personal use for
non-commercial purposes. Non-commercial use does not include the use of Kalshi Data
without prior written consent from Kalshi in connection with: (1) the development of
any software program, including, but not limited to, training a machine learning or
artificial intelligence system; or (2) providing archived or cached data sets containing
Kalshi Data to another person or entity. You understand, acknowledge and agree that
the Kalshi Data is provided "as is" and Kalshi does not warrant the accuracy,
completeness, non-infringement, timeliness or any other characteristic of the Kalshi
Data. All Kalshi Data contained within the Website should be considered as a reference
only and should not be used as validation against, nor as a complement to, any Kalshi
data feeds.
II. PROHIBITED USES
You acknowledge and agree that, unless Kalshi, its applicable affiliate, and/or an
applicable third party provider give you prior written authorization, you are strictly
prohibited from selling, licensing, renting, modifying, changing, manipulating, altering,
printing, collecting, copying, reproducing, downloading (other than to view only where a
link is provided), uploading, transmitting, disclosing, distributing, disseminating,
publicly displaying, publishing, editing, adapting, creating derivative works,
electronically extracting or scrubbing, scraping, compiling (including, without
limitation, through framing or systematic retrieval to create collections, compilations,
databases or directories) or conducting 'text and data mining' (as those terms are
defined in EU Directive 2019/790) in relation to any Kalshi Data and other Kalshi
intellectual property you access via the Website or otherwise transfer any of the content
to any third person (including, without limitation, others in your company or
organization).
You agree not to, and have no rights to, use the Kalshi Data to create, calculate, issue,
settle, maintain, support or develop any financial instruments (including but, without
limitation exchange traded products, certificates, warrants, contracts for difference,
swaps, options, structured products), indexes, products, services (including but without
limitation, portfolio management services, pre- and post-trade risk management
services, or valuation services) or any other derivative works without the express written
consent of Kalshi.
You agree not to analyze, reverse-engineer or disassemble any Kalshi Data and not to
insert any code or product to manipulate the Website content in any way that affects any
user's experience. Unless Kalshi gives you prior written permission, use of any Web
browsers (other than generally available third-party browsers), engines, scripts,
software, spiders, robots, avatars, agents, tools or other devices or mechanisms (such as
crawlers, browser plug-ins and add-ons, or other technology) to navigate, access, copy in
bulk, retrieve, harvest, index, search or analyze any portion of the Website is strictly
prohibited.
For the avoidance of doubt and to the fullest extent permitted by law, use of
any Kalshi Data (including associated metadata) in any manner for any
machine learning and/or artificial intelligence, including without limitation
for the purposes of training, coding, or development of artificial
intelligence technologies, tools, or solutions or machine learning language
models, or otherwise for the purposes of using or in connection with the
use of such technologies, tools, or models to generate any information,
material, data, derived works, content, or output is expressly prohibited.
III. OWNERSHIP
You agree that (i) Kalshi Data and all components thereof constitute copyrighted,
and/or proprietary information of substantial value to Kalshi, (ii) that you receive no
proprietary rights whatsoever in or to the Kalshi Data, and (iii) that title and ownership
rights in and to the Kalshi Data and all the rights therein and legal protections with
respect thereto remain exclusively with Kalshi and its licensors. You shall not, and shall
not assist any third party to, assert any rights in the Kalshi Data or any component
thereof or challenge Kalshi's rights therein.
IV. DISCLAIMER
Kalshi is not responsible for technical, hardware or software failures of any kind; lost or
unavailable network connections; incomplete, garbled or delayed computer
transmissions. Under no circumstances will Kalshi, its affiliates, licensors or suppliers
be liable for any damages or injury that results from the use of the materials on this site.
Some jurisdictions prohibit the exclusion or limitation of liability for consequential or
incidental damages, in which case the above limitation may not apply to you.
Your use of the Website may be monitored by Kalshi, and the resultant information may
be used in accordance with Kalshi's Privacy Policy, Member Agreement, Rulebook, and
applicable law.`;

async function analyzeDocument(text: string) {
  console.log(`🤖 Analyzing Kalshi terms with GPT-4o-mini...`);

  const sanitizedText = text
    .replace(/[\u2028\u2029]/g, '\n')
    .replace(/[^\x00-\x7F\u0080-\uFFFF]/g, '');

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a legal analyst specializing in prediction markets and financial platforms. Extract 10-15 key policies that affect users. Focus on: data usage restrictions, AI/ML prohibitions, intellectual property claims, commercial use restrictions, liability disclaimers, monitoring/privacy, and unusual limitations specific to this CFTC-regulated prediction market.'
      },
      {
        role: 'user',
        content: `Analyze this Data Terms of Use for Kalshi (CFTC-regulated US prediction markets platform):\n\n${sanitizedText}\n\nFormat as JSON:\n{\n  "policies": [\n    {\n      "section": "account|trading|dispute|liability|fees|privacy|other",\n      "title": "string",\n      "category": "good|bad|common",\n      "summary": "string (1-2 sentences)",\n      "impact": "critical|high|medium|low",\n      "details": "string with relevant quotes"\n    }\n  ]\n}`
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  return JSON.parse(completion.choices[0].message.content || '{}');
}

async function updateKalshi(policies: any[]) {
  console.log(`\n💾 Updating Kalshi in Sanity...`);

  const convertToPortableText = (details: string) => [{
    _type: 'block',
    style: 'normal',
    children: [{ _type: 'span', text: details, marks: [] }],
  }];

  const formattedPolicies = policies.map((policy: any) => ({
    _type: 'policyItem',
    _key: Math.random().toString(36).substring(7),
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

  // Update the document
  await writeClient
    .patch('aCqJiQ4RoExkxzpt6mYckc')
    .set({
      policies: formattedPolicies,
      overallRating,
      riskScore,
      quickSummary: 'Analysis of Kalshi\'s data terms of use, including strict AI/ML prohibitions, commercial use restrictions, intellectual property claims, and comprehensive liability disclaimers for the first CFTC-regulated prediction market exchange.',
      keyTakeaways: [
        'CFTC-regulated and legally compliant in the United States',
        'Strict prohibition on AI/ML training and data mining',
        'Non-commercial use only without written authorization',
        'Comprehensive intellectual property protections',
        'No liability for technical failures or data issues',
      ],
    })
    .commit();

  console.log(`✅ Updated Kalshi with ${formattedPolicies.length} policies`);
}

async function main() {
  console.log('\n🎯 Updating Kalshi with Real Terms\n');
  console.log('='.repeat(60) + '\n');

  const analysis = await analyzeDocument(KALSHI_TERMS);

  if (!analysis.policies || analysis.policies.length === 0) {
    console.error('❌ No policies extracted');
    return;
  }

  console.log(`✓ Extracted ${analysis.policies.length} policies\n`);

  analysis.policies.forEach((policy: any, idx: number) => {
    console.log(`${idx + 1}. ${policy.title} (${policy.category}, ${policy.impact})`);
  });

  await updateKalshi(analysis.policies);

  console.log('\n' + '='.repeat(60));
  console.log('🎉 Kalshi update complete!');
  console.log('='.repeat(60) + '\n');
}

main().catch(console.error);
