import {readFile} from 'node:fs/promises';
// Local extraction evaluation; no Stripe payment or customer balance involved.
if (!process.env.OPENAI_API_KEY) throw Error('Set OPENAI_API_KEY for a funded test project. This evaluation makes 10 model calls.');
const {deepAnalyze}=await import('../src/lib/deepPolicyAnalyzer.ts');
const cases=JSON.parse(await readFile(new URL('../tests/fixtures/policy-cases.json',import.meta.url),'utf8'));
let passed=0,failed=0,unavailable=0;
for (const sample of cases) {
  const result=await deepAnalyze('direct text analysis',sample.text,{includeSourceText:true});
  if (result.analysis_status==='extraction_failed') {unavailable++;console.error(JSON.stringify({case:sample.id,status:'unavailable',limitations:result.limitations}));break;}
  const checks=Object.entries(sample.expected).map(([path,expected])=>{
    const [category,field]=path.split('.');const actual=result.policies[category]?.facts[field] ?? null;
    return {path,expected,actual,pass:actual===expected};
  });
  const ok=checks.every(c=>c.pass);ok?passed++:failed++;
  console.log(JSON.stringify({case:sample.id,pass:ok,checks,analysis_status:result.analysis_status}));
}
console.log(JSON.stringify({suite:'synthetic_policy_smoke',planned:cases.length,passed,failed,unavailable,representative_accuracy_benchmark:false}));
if (failed || unavailable || passed!==cases.length) process.exitCode=1;
