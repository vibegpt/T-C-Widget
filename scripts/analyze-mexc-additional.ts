import OpenAI from 'openai';
import * as cheerio from 'cheerio';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY?.replace(/[\u2028\u2029]/g, '').trim(),
});

async function fetchAndAnalyze(url: string, docType: string) {
  console.log(`\n📋 Fetching ${docType} from: ${url}`);

  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);
  $('script, style, nav, header, footer').remove();
  const text = $('body').text().replace(/\s+/g, ' ').trim();

  console.log(`Analyzing ${docType}...`);

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a legal analyst specializing in cryptocurrency exchanges. Extract 5-10 key policies from the document. Focus on policies that affect user rights, risks, fees, privacy, and protections.'
      },
      {
        role: 'user',
        content: `Analyze this ${docType} for MEXC CEX:\n\n${text}\n\nFormat as JSON:\n{\n  "policies": [\n    {\n      "section": "account|trading|dispute|liability|fees|privacy|other",\n      "title": "string",\n      "category": "good|bad|common",\n      "summary": "string (1-2 sentences)",\n      "impact": "critical|high|medium|low",\n      "details": "string with relevant quotes from document"\n    }\n  ]\n}`
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  const result = JSON.parse(completion.choices[0].message.content || '{}');
  console.log(`\n✅ ${docType} Analysis:`);
  console.log(JSON.stringify(result, null, 2));
  return result;
}

const urls = [
  { url: 'https://www.mexc.com/privacypolicy', type: 'Privacy Policy' },
  { url: 'https://www.mexc.com/risk', type: 'Risk Disclosure' },
  { url: 'https://www.mexc.com/support/requests/legal', type: 'Legal Support' },
];

(async () => {
  console.log('🚀 Starting analysis of MEXC additional documents...\n');

  for (const doc of urls) {
    try {
      await fetchAndAnalyze(doc.url, doc.type);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Small delay between requests
    } catch (error) {
      console.error(`❌ Error analyzing ${doc.type}:`, error);
    }
  }

  console.log('\n🎉 Analysis complete!');
})();
