import OpenAI from 'openai';
import { createClient } from 'next-sanity';
import * as cheerio from 'cheerio';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY?.replace(/[\u2028\u2029]/g, '').trim(),
});

const writeClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'c15x4s4x',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

interface Platform {
  name: string;
  type: 'CEX' | 'DEX' | 'Third Party App';
  mainUrl: string;
  additionalUrls?: string[]; // Additional specific doc URLs to check
  founded?: string;
  jurisdiction?: string;
}

const LEGAL_KEYWORDS = [
  'terms', 'privacy', 'legal', 'policy', 'agreement', 'conditions',
  'user-agreement', 'tos', 'aup', 'acceptable-use', 'risk',
  'disclosure', 'disclaimer', 'cookie', 'gdpr'
];

async function findLegalLinks(mainUrl: string): Promise<string[]> {
  console.log(`🔍 Crawling ${mainUrl} for legal document links...`);

  try {
    const response = await fetch(mainUrl);
    const html = await response.text();
    const $ = cheerio.load(html);

    const links = new Set<string>();

    // Find all links
    $('a[href]').each((_, elem) => {
      const href = $(elem).attr('href');
      if (!href) return;

      const linkText = $(elem).text().toLowerCase();
      const hrefLower = href.toLowerCase();

      // Check if link contains legal keywords
      const hasLegalKeyword = LEGAL_KEYWORDS.some(keyword =>
        hrefLower.includes(keyword) || linkText.includes(keyword)
      );

      if (hasLegalKeyword) {
        // Convert relative URLs to absolute
        let fullUrl = href;
        if (href.startsWith('/')) {
          const baseUrl = new URL(mainUrl);
          fullUrl = `${baseUrl.protocol}//${baseUrl.host}${href}`;
        } else if (!href.startsWith('http')) {
          fullUrl = new URL(href, mainUrl).href;
        }
        links.add(fullUrl);
      }
    });

    // Also check common legal paths directly
    const commonPaths = [
      '/terms', '/privacy', '/legal', '/terms-of-service', '/privacy-policy',
      '/user-agreement', '/risk-disclosure', '/legal/terms', '/legal/privacy'
    ];

    const baseUrl = new URL(mainUrl);
    for (const path of commonPaths) {
      const testUrl = `${baseUrl.protocol}//${baseUrl.host}${path}`;
      try {
        const testResponse = await fetch(testUrl, { method: 'HEAD' });
        if (testResponse.ok) {
          links.add(testUrl);
        }
      } catch {
        // Ignore 404s
      }
    }

    const foundLinks = Array.from(links);
    console.log(`✓ Found ${foundLinks.length} potential legal document links`);
    return foundLinks;
  } catch (error) {
    console.error(`Failed to crawl ${mainUrl}:`, error);
    return [];
  }
}

async function fetchDocumentText(url: string): Promise<string | null> {
  console.log(`  📄 Fetching: ${url}`);

  try {
    const response = await fetch(url);
    const contentType = response.headers.get('content-type') || '';

    // Skip PDFs and binary files
    if (contentType.includes('pdf') || contentType.includes('octet-stream')) {
      console.log(`  ⏭️  Skipping PDF/binary file`);
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    $('script, style, nav, header, footer').remove();
    const text = $('body').text().replace(/\s+/g, ' ').trim();

    // Check if we got meaningful content (at least 500 chars)
    if (text.length < 500) {
      console.log(`  ⏭️  Too short (${text.length} chars), skipping`);
      return null;
    }

    console.log(`  ✓ Fetched ${text.length} characters`);
    return text;
  } catch (error) {
    console.error(`  ❌ Failed to fetch ${url}:`, error);
    return null;
  }
}

async function analyzeDocument(text: string, name: string, type: string, docUrl: string) {
  console.log(`  🤖 Analyzing with GPT-4o-mini...`);

  const sanitizedText = text
    .replace(/[\u2028\u2029]/g, '\n')
    .replace(/[^\x00-\x7F\u0080-\uFFFF]/g, '');

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a legal analyst specializing in cryptocurrency platforms. Extract 5-15 key policies that affect users. Focus on rights, risks, fees, privacy, protections, and unusual restrictions.'
      },
      {
        role: 'user',
        content: `Analyze this document for ${name} (${type}):\n\n${sanitizedText}\n\nFormat as JSON:\n{\n  "policies": [\n    {\n      "section": "account|trading|dispute|liability|fees|privacy|other",\n      "title": "string",\n      "category": "good|bad|common",\n      "summary": "string (1-2 sentences)",\n      "impact": "critical|high|medium|low",\n      "details": "string with relevant quotes"\n    }\n  ]\n}`
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  return JSON.parse(completion.choices[0].message.content || '{}');
}

async function createOrUpdatePlatform(platform: Platform, allPolicies: any[], legalUrls: string[]) {
  console.log(`\n💾 Saving ${platform.name} to Sanity...`);

  // Check if platform already exists
  const slug = platform.name.toLowerCase().replace(/\s+/g, '-');
  const existingDoc = await writeClient.fetch(
    `*[_type == $type && slug.current == $slug][0]{ _id, name, policies }`,
    {
      type: platform.type === 'Third Party App' ? 'thirdPartyApp' : platform.type === 'DEX' ? 'dex' : 'cex',
      slug
    }
  );

  const convertToPortableText = (details: string) => [{
    _type: 'block',
    style: 'normal',
    children: [{ _type: 'span', text: details, marks: [] }],
  }];

  const formattedPolicies = allPolicies.map((policy: any) => ({
    _type: 'policyItem',
    section: policy.section,
    title: policy.title,
    category: policy.category,
    summary: policy.summary,
    details: convertToPortableText(policy.details),
    impact: policy.impact,
  }));

  if (existingDoc) {
    // Update existing
    console.log(`  ℹ️  Platform exists, updating with ${formattedPolicies.length} policies`);

    const result = await writeClient
      .patch(existingDoc._id)
      .set({
        policies: formattedPolicies,
        termsUrl: legalUrls[0] || platform.mainUrl,
      })
      .commit();

    console.log(`✅ Updated ${platform.name} (ID: ${result._id})`);
    return result;
  } else {
    // Create new
    console.log(`  ℹ️  Creating new platform with ${formattedPolicies.length} policies`);

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

    const contentType = platform.type === 'Third Party App' ? 'thirdPartyApp' :
                        platform.type === 'DEX' ? 'dex' : 'cex';

    const platformData = {
      _type: contentType,
      name: platform.name,
      slug: { _type: 'slug', current: slug },
      description: `Terms and policies for ${platform.name}`,
      overallRating,
      riskScore,
      quickSummary: `Comprehensive analysis of ${platform.name}'s terms, privacy policy, and legal documents.`,
      termsUrl: legalUrls[0] || platform.mainUrl,
      founded: platform.founded,
      jurisdiction: platform.jurisdiction,
      policies: formattedPolicies,
      keyTakeaways: [
        'Review all terms carefully before using this platform',
        'Understand the risks and limitations outlined in their policies',
        'Be aware of any unusual restrictions or broad discretionary powers',
      ],
      featured: true,
      displayOrder: 999,
    };

    const result = await writeClient.create(platformData);
    console.log(`✅ Created ${platform.name} (ID: ${result._id})`);
    return result;
  }
}

async function processPlatform(platform: Platform) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 Processing: ${platform.name} (${platform.type})`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    // Step 1: Find legal document links
    let legalUrls = await findLegalLinks(platform.mainUrl);

    // Add any additional URLs provided
    if (platform.additionalUrls) {
      legalUrls = [...legalUrls, ...platform.additionalUrls];
    }

    if (legalUrls.length === 0) {
      console.log(`⚠️  No legal documents found for ${platform.name}, skipping...`);
      return;
    }

    // Step 2: Fetch and analyze each document
    const allPolicies: any[] = [];

    for (const url of legalUrls.slice(0, 5)) { // Limit to 5 docs to avoid rate limits
      const text = await fetchDocumentText(url);
      if (!text) continue;

      try {
        const analysis = await analyzeDocument(text, platform.name, platform.type, url);
        if (analysis.policies && Array.isArray(analysis.policies)) {
          allPolicies.push(...analysis.policies);
          console.log(`  ✓ Extracted ${analysis.policies.length} policies`);
        }
      } catch (error) {
        console.error(`  ❌ Analysis failed for ${url}:`, error);
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    if (allPolicies.length === 0) {
      console.log(`⚠️  No policies extracted for ${platform.name}, skipping...`);
      return;
    }

    // Step 3: Create or update in Sanity
    await createOrUpdatePlatform(platform, allPolicies, legalUrls);

    console.log(`\n✅ ${platform.name} complete! (${allPolicies.length} total policies)`);

  } catch (error) {
    console.error(`\n❌ Failed to process ${platform.name}:`, error);
  }
}

// Main execution
const platforms: Platform[] = [
  {
    name: 'Coinbase',
    type: 'CEX',
    mainUrl: 'https://www.coinbase.com/legal/user_agreement/united_states',
    additionalUrls: [
      'https://www.coinbase.com/legal/user_agreement/united_states#appendix-5-arbitration-agreement',
      'https://www.coinbase.com/legal/user_agreement/united_states#dapp-wallet-dexes-and-decentralized-applications',
      'https://www.coinbase.com/legal/trading_rules',
    ],
    founded: '2012',
    jurisdiction: 'United States',
  },
];

(async () => {
  console.log(`\n🎯 Starting automated crawl and analysis for ${platforms.length} platforms...\n`);

  for (const platform of platforms) {
    await processPlatform(platform);

    // Delay between platforms to be respectful
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  console.log(`\n\n${'='.repeat(60)}`);
  console.log(`🎉 All platforms processed!`);
  console.log(`${'='.repeat(60)}\n`);
})();
