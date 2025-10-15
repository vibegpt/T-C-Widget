import { createClient } from 'next-sanity';
import OpenAI from 'openai';

const writeClient = createClient({
  projectId: 'c15x4s4x',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const dmcaPolicy = `
DMCA Guidelines

pump.fun respects intellectual property rights and complies with the Digital Millennium Copyright Act ("DMCA"). pump.fun does not necessarily store or archive all creator data (e.g., any livestreamed video data)—when we identify infringing content, we respond by immediately removing or disabling access to the content identified as infringing (e.g., active livestream broadcasts, tokens, and comments).

pump.fun does not have the authority or the ability to adjudicate allegations of copyright infringement. The DMCA requires pump.fun to act as a middleman, processing claims of infringement by rightsholders and counter-notifications from creators. Any dispute is solely between the rightsholder and the relevant creator(s).

Reporting Copyright Infringement

If you believe content on pump.fun, including a livestream, infringes your copyright, please let us know by contacting "pump support" and submitting a written notice ("DMCA Notice") containing the following:

- Your contact information: name, physical address, telephone number, and email address.
- Identification of copyrighted work: a clear description or link to the copyrighted content you claim has been infringed.
- Identification of infringing content: information reasonably sufficient for our moderators to locate and identify the content (e.g., username, wallet address, token name, URL of livestream).
- Statement of good faith belief and accuracy

Response to Valid Notices

When pump.fun receives a valid DMCA Notice, pump.fun will:
- Promptly review the content, including any active livestream;
- Immediately terminate or disable access to the content insofar as pump.fun is able to do so, including terminating an ongoing livestream if infringement is confirmed by our moderators; and
- Notify the content creator responsible for the content about the removal.

Repeat Infringers

pump.fun will terminate a creator's access to the platform if pump.fun determines that the creator is a repeat infringer of protected works. Receiving three separate "strikes" will constitute repeat infringement.

Policy Updates

pump.fun reserves the right to update or revise this policy at any time. Continued use of our services constitutes acceptance of any revisions.
`;

function convertToPortableText(text: string) {
  return [
    {
      _type: 'block',
      style: 'normal',
      children: [{ _type: 'span', text, marks: [] }],
    },
  ];
}

async function analyzeDMCAPolicy() {
  console.log('🤖 Analyzing Pump.fun DMCA policy with AI...\n');

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a legal analyst specializing in platform policies for cryptocurrency applications.

Analyze this Pump.fun DMCA policy and extract 3-5 KEY POLICIES that CRITICALLY IMPACT USERS.

Focus ONLY on policies about:
- Content takedown without notice
- Account termination (three strikes)
- What happens to tokens/content when removed
- User liability and disputes

For EACH critical policy provide:
1. title: Short, specific title (e.g., "Immediate Content Removal", "Three Strike Termination")
2. section: "legal" or "account"
3. category: "bad" (risky for users) or "common" (standard DMCA practice)
4. summary: 1-2 sentences in plain English about what this means for users
5. details: More detailed explanation with specific quotes from the policy
6. impact: "critical", "high", "medium", or "low"

Return valid JSON object with "policies" array.`,
      },
      {
        role: 'user',
        content: `Analyze this DMCA policy:\n\n${dmcaPolicy}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  const result = JSON.parse(completion.choices[0].message.content || '{}');
  return result.policies || [];
}

async function appendDMCAPolicies(newPolicies: any[]) {
  console.log(`\n📝 Appending ${newPolicies.length} DMCA policies to Pump.Fun...\n`);

  // Fetch current Pump.Fun document
  const query = `*[_type == "thirdPartyApp" && slug.current == "pump.fun"][0]{
    _id,
    policies
  }`;

  const pumpfun = await writeClient.fetch(query);

  if (!pumpfun) {
    console.error('❌ Pump.Fun not found in Sanity');
    return;
  }

  const formattedPolicies = newPolicies.map((policy: any) => ({
    _type: 'policyItem',
    section: policy.section,
    title: policy.title,
    category: policy.category,
    summary: policy.summary,
    details: convertToPortableText(policy.details || policy.summary),
    impact: policy.impact,
  }));

  // Append to existing policies
  const updatedPolicies = [...(pumpfun.policies || []), ...formattedPolicies];

  // Recalculate risk score
  const allPolicies = updatedPolicies;
  const goodCount = allPolicies.filter((p: any) => p.category === 'good').length;
  const badCount = allPolicies.filter((p: any) => p.category === 'bad').length;
  const criticalCount = allPolicies.filter((p: any) => p.impact === 'critical').length;

  let riskScore = 5;
  if (badCount > goodCount) {
    riskScore = Math.min(10, 5 + badCount - goodCount + criticalCount);
  } else {
    riskScore = Math.max(1, 5 - (goodCount - badCount));
  }

  const overallRating = riskScore <= 3 ? 'good' : riskScore <= 6 ? 'mixed' : 'risky';

  // Update document
  await writeClient
    .patch(pumpfun._id)
    .set({
      policies: updatedPolicies,
      riskScore,
      overallRating,
    })
    .commit();

  console.log(`✅ Updated Pump.Fun with ${updatedPolicies.length} total policies`);
  console.log(`   New Risk Score: ${riskScore}/10 (${overallRating})`);

  console.log('\nNew policies added:');
  formattedPolicies.forEach((p: any) => {
    console.log(`   - ${p.title} (${p.category}, ${p.impact})`);
  });
}

async function main() {
  console.log('🚀 Analyzing Pump.fun DMCA policy\n');

  try {
    const policies = await analyzeDMCAPolicy();

    if (policies.length > 0) {
      console.log(`✅ Extracted ${policies.length} notable policies\n`);
      await appendDMCAPolicies(policies);
    } else {
      console.log('⚠️  No notable policies found to add.');
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n✨ Done!\n');
}

main().catch(console.error);
