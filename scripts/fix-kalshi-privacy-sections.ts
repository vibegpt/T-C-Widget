import { createClient } from 'next-sanity';

const writeClient = createClient({
  projectId: 'c15x4s4x',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

async function fixPrivacySections() {
  console.log('🔧 Fixing Kalshi privacy policy sections...\n');

  // Get current document
  const doc = await writeClient.fetch(
    `*[_id == "aCqJiQ4RoExkxzpt6mYckc"][0]{ policies }`
  );

  // Map sections to "privacy" for any policy with a section that looks like a privacy policy heading
  const privacyHeadings = [
    'TYPES OF INFORMATION',
    'HOW WE USE',
    'DISCLOSURES',
    'THIRD-PARTY',
    'CONTROL OVER',
    'CALIFORNIA',
    'TRANSFER OF',
    'CHILDREN',
    'CHANGES TO THIS',
    'Personal Information',
    'Data Transfer',
    'Data Collection'
  ];

  const updatedPolicies = doc.policies.map((policy: any) => {
    // Check if section contains any privacy-related keywords
    const isPrivacyPolicy = privacyHeadings.some(heading =>
      policy.section?.includes(heading) ||
      policy.title?.includes('Privacy') ||
      policy.title?.includes('Personal Information') ||
      policy.title?.includes('Data Transfer') ||
      policy.title?.includes('CCPA') ||
      policy.title?.includes('Third-Party Tracking') ||
      policy.title?.includes('Children\'s Data')
    );

    if (isPrivacyPolicy && policy.section !== 'privacy') {
      console.log(`  ✓ Updating: "${policy.title}" (${policy.section} → privacy)`);
      return { ...policy, section: 'privacy' };
    }

    return policy;
  });

  // Update the document
  await writeClient
    .patch('aCqJiQ4RoExkxzpt6mYckc')
    .set({ policies: updatedPolicies })
    .commit();

  const privacyCount = updatedPolicies.filter((p: any) => p.section === 'privacy').length;
  console.log(`\n✅ Fixed privacy sections! Total privacy policies: ${privacyCount}`);
}

fixPrivacySections().catch(console.error);
