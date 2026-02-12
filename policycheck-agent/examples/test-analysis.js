#!/usr/bin/env node
/**
 * Test script for PolicyCheck Service Agent
 * Run with: node examples/test-analysis.js
 */

import {
  analyzeSellerPolicies,
  generateAgentSummary,
  parseReturnPolicy,
  parseShippingPolicy,
  parseWarrantyPolicy,
  parseTermsAndConditions
} from '../src/parsers/commerce-policy-parser.js';

// Sample policy texts for testing
const samplePolicies = {
  returns: `
    Return Policy - Last updated January 2025

    We accept returns within 30 days of purchase. Items must be in original
    packaging, unworn, and with tags attached. A 15% restocking fee applies
    to all returns. Customer is responsible for return shipping costs.

    Final sale items include: clearance merchandise, swimwear, and intimates.
    These items cannot be returned or exchanged.

    Refunds will be processed within 5-7 business days and issued to your
    original payment method.

    For exchanges, please contact our customer service team.
  `,

  shipping: `
    Shipping Information

    Free standard shipping on all orders over $50! Orders under $50 ship for
    a flat rate of $5.99.

    Standard shipping: 5-7 business days
    Expedited shipping: 2-3 business days ($12.99)
    Next-day delivery: Available in select areas ($24.99)

    Processing time: Orders are processed within 1-2 business days before
    shipping. We ship via USPS and UPS.

    We currently only ship within the United States. We do not ship to
    PO Boxes for expedited orders.

    All orders include tracking information sent via email.
  `,

  warranty: `
    Limited Warranty

    This product comes with a 1-year limited warranty against defects in
    materials and workmanship under normal use.

    The warranty does not cover:
    - Water damage or liquid spills
    - Accidental damage or drops
    - Normal wear and tear
    - Unauthorized repairs or modifications
    - Cosmetic damage

    To make a warranty claim, contact our support team with your proof of
    purchase and description of the issue.
  `,

  terms: `
    Terms of Service - Last updated December 15, 2024

    By using our services, you agree to these terms.

    DISPUTE RESOLUTION: Any dispute arising from these terms shall be
    resolved through binding individual arbitration administered by JAMS.
    You waive any right to participate in class action lawsuits or
    class-wide arbitration.

    You have 30 days from account creation to opt out of arbitration by
    sending written notice to legal@example.com.

    LIABILITY: Our maximum aggregate liability for any claims shall not
    exceed $100.

    We reserve the right to suspend or terminate your account at any time
    at our sole discretion, without prior notice.

    Your subscription will automatically renew each billing period unless
    cancelled.

    These terms are governed by the laws of the State of Delaware.
  `
};

// Run tests
console.log('🧪 PolicyCheck Service Agent - Policy Analysis Test\n');
console.log('='.repeat(60) + '\n');

// Test individual parsers
console.log('📦 RETURN POLICY ANALYSIS');
console.log('-'.repeat(40));
const returnResult = parseReturnPolicy(samplePolicies.returns);
console.log(JSON.stringify(returnResult, null, 2));
console.log('\n');

console.log('🚚 SHIPPING POLICY ANALYSIS');
console.log('-'.repeat(40));
const shippingResult = parseShippingPolicy(samplePolicies.shipping);
console.log(JSON.stringify(shippingResult, null, 2));
console.log('\n');

console.log('🛡️ WARRANTY POLICY ANALYSIS');
console.log('-'.repeat(40));
const warrantyResult = parseWarrantyPolicy(samplePolicies.warranty);
console.log(JSON.stringify(warrantyResult, null, 2));
console.log('\n');

console.log('📜 TERMS & CONDITIONS ANALYSIS');
console.log('-'.repeat(40));
const termsResult = parseTermsAndConditions(samplePolicies.terms);
console.log(JSON.stringify(termsResult, null, 2));
console.log('\n');

// Test comprehensive analysis
console.log('='.repeat(60));
console.log('\n🔍 COMPREHENSIVE SELLER ANALYSIS\n');
console.log('='.repeat(60));

const fullAnalysis = analyzeSellerPolicies(samplePolicies);
console.log('\n📊 Analysis Results:');
console.log(JSON.stringify({
  overallRiskScore: fullAnalysis.overallRiskScore,
  buyerProtectionScore: fullAnalysis.buyerProtectionScore,
  recommendation: fullAnalysis.recommendation,
  allRiskFlags: fullAnalysis.allRiskFlags,
  allKeyPoints: fullAnalysis.allKeyPoints
}, null, 2));

console.log('\n');
console.log('='.repeat(60));
console.log('\n📝 HUMAN-READABLE SUMMARY\n');
console.log('='.repeat(60));
console.log('\n' + generateAgentSummary(fullAnalysis));

// Test with a "bad" seller
console.log('\n');
console.log('='.repeat(60));
console.log('\n⚠️ TEST: HIGH-RISK SELLER\n');
console.log('='.repeat(60));

const badSellerPolicies = {
  returns: `
    All sales are final. No returns or exchanges accepted.
    All items are sold as-is.
  `,
  terms: `
    By purchasing, you agree to binding arbitration. Class action
    waiver applies. We may terminate your account at any time.
    Maximum liability: $50.
  `
};

const badSellerAnalysis = analyzeSellerPolicies(badSellerPolicies);
console.log('\n📊 High-Risk Analysis:');
console.log(JSON.stringify({
  overallRiskScore: badSellerAnalysis.overallRiskScore,
  buyerProtectionScore: badSellerAnalysis.buyerProtectionScore,
  recommendation: badSellerAnalysis.recommendation,
  allRiskFlags: badSellerAnalysis.allRiskFlags
}, null, 2));

console.log('\n' + generateAgentSummary(badSellerAnalysis));

console.log('\n✅ All tests completed!');
