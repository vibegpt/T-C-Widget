/* LegalEasy – Shopify Theme App Embed (self-contained)
   This script adds a small Yes/No prompt above common "Agree" buttons or terms sections.
   It includes the full Legal Easy parser and UI in a single file for easy Shopify integration.
*/

(function() {
  'use strict';
  
  // Configuration from data attributes
  const config = {
    brandColor: '#00B3A6',
    brandIcon: '◆',
    termsSelectors: ['#terms', '.terms', '[data-terms]', '[aria-label*="terms" i]'],
    agreeSelectors: ['button', '[role="button"]', 'input[type="submit"]', '[name*="agree" i]', '[id*="agree" i]']
  };
  
  // Extract configuration from script tag
  const script = document.currentScript;
  if (script) {
    config.brandColor = script.getAttribute('data-color') || config.brandColor;
    config.brandIcon = script.getAttribute('data-icon') || config.brandIcon;
    
    const termsSelectors = script.getAttribute('data-terms');
    if (termsSelectors) {
      config.termsSelectors = termsSelectors.split(',').map(s => s.trim());
    }
    
    const agreeSelectors = script.getAttribute('data-agree');
    if (agreeSelectors) {
      config.agreeSelectors = agreeSelectors.split(',').map(s => s.trim());
    }
  }
  
  // Utility functions
  const qsOne = (selectors) => {
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el && el.offsetParent) return el;
    }
    return null;
  };
  
  const readStyles = (el) => {
    const cs = getComputedStyle(el || document.body);
    const rect = el?.getBoundingClientRect?.();
    return {
      borderRadius: cs.getPropertyValue('border-radius') || '12px',
      fontFamily: cs.getPropertyValue('font-family'),
      fontSize: cs.getPropertyValue('font-size'),
      lineHeight: cs.getPropertyValue('line-height'),
      color: cs.getPropertyValue('color'),
      buttonHeight: Math.max(36, Math.round(rect?.height || 40))
    };
  };
  
  const $ = (html) => {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstElementChild;
  };
  
  // Deterministic parser (mirrors the main Legal Easy parser)
  const clean = (text) => text.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
  const toISO = (dateStr) => {
    const d = new Date(dateStr);
    return isNaN(d) ? undefined : d.toISOString().slice(0, 10);
  };
  const dollars = (str) => {
    const match = str.replace(/[,\s]/g, '').match(/\$?(\d+(?:\.\d+)?)/);
    return match ? Number(match[1]) : null;
  };
  
  function parseTerms(textRaw) {
    const text = clean(textRaw);
    const parsed = { sections: [] };
    
    // Extract key information
    const mUp = text.match(/Last updated\s+([A-Za-z]{3,9}\s+\d{1,2},\s*\d{4}|\d{4}-\d{2}-\d{2})/i);
    if (mUp) parsed.updatedAt = toISO(mUp[1]);
    
    // Age requirement
    const mAge = text.match(/at least\s+(\d{1,2})\s+years? of age/i);
    if (mAge) {
      parsed.sections.push({
        key: 'eligibility',
        title: 'Eligibility',
        bullets: [`You must be at least ${Number(mAge[1])}.`],
        facts: { ageMin: Number(mAge[1]) }
      });
    }
    
    // Wallet/self-custody
    const selfCustody = /(do not|no)\s+(have )?custody.*(wallet|keys|assets)/i.test(text);
    const gasNonRefund = /(gas|network) fees?.*?(non[-\s]?refundable|final)/i.test(text);
    const irreversible = /(transactions? (are )?final|irreversible)/i.test(text);
    
    if (selfCustody || gasNonRefund || irreversible) {
      const bullets = [];
      if (selfCustody) bullets.push('Platform is not a custodian; you hold your keys.');
      if (gasNonRefund) bullets.push('Gas/network fees are non-refundable.');
      if (irreversible) bullets.push('On-chain transactions are final/irreversible.');
      parsed.sections.push({
        key: 'wallet',
        title: 'Wallet & Self-Custody',
        bullets,
        facts: { selfCustody, gasFeesNonRefundable: gasNonRefund }
      });
    }
    
    // Tokens
    const notSecurity = /(not intended to be a\s*['"]?security|not (an )?investment)/i.test(text);
    const noAdvice = /(no (investment|legal|tax) advice)/i.test(text);
    
    if (notSecurity || noAdvice) {
      const bullets = [];
      if (notSecurity) bullets.push('Tokens framed as collectibles, not securities/investments.');
      if (noAdvice) bullets.push('No investment/legal/tax advice.');
      parsed.sections.push({
        key: 'tokens',
        title: 'Tokens',
        bullets,
        facts: { notSecurity, collectiblesOnly: notSecurity, noInvestmentAdvice: noAdvice }
      });
    }
    
    // Risks
    const bridging = /(bridge|rollup|layer[-\s]?two|OP\s*Stack|sequencer|dispute period)/i.test(text);
    if (irreversible || bridging) {
      const bullets = [];
      if (irreversible) bullets.push('Transactions are irreversible and volatile.');
      if (bridging) bullets.push('Bridging/L2 involves dispute/wait periods and technical risk.');
      parsed.sections.push({
        key: 'risks',
        title: 'Risks & Gotchas',
        bullets,
        facts: { irreversibleTxs: irreversible, bridgingL2: bridging }
      });
    }
    
    // Disputes
    const arbitration = /(binding,?\s*(?:individual\s*)?arbitration|arbitration.*(?:JAMS|AAA|ICC))/i.test(text);
    const provider = (text.match(/(JAMS|AAA|ICC)/i) || [])[1];
    const classWaiver = /waiv(e|er).{0,40}class (action|representative)|class (action|proceeding).{0,30}(waiv|not participate)/i.test(text);
    const mOpt = text.match(/opt[-\s]?out[^\d]{0,40}?(\d{1,3})\s+days?/i);
    
    if (arbitration || classWaiver || mOpt) {
      const bullets = [];
      if (arbitration || provider) {
        bullets.push(`Binding individual arbitration${provider ? ` (${provider.toUpperCase()})` : ''}; no class actions.`);
      }
      if (mOpt) bullets.push(`You can opt out within ${Number(mOpt[1])} days by mail.`);
      parsed.sections.push({
        key: 'disputes',
        title: 'Dispute Resolution',
        bullets,
        facts: {
          arbitration,
          arbitrationProvider: provider?.toUpperCase(),
          classActionWaiver: classWaiver,
          optOutDays: mOpt ? Number(mOpt[1]) : undefined
        }
      });
    }
    
    // Liability
    let cap;
    const mLiab = text.match(/(?:maximum|aggregate|overall).{0,40}liability.{0,40}(\$\s?[\d,]+|\d+\s*dollars?)/i);
    if (mLiab) cap = dollars(mLiab[1]);
    if (!cap) {
      const m2 = text.match(/greater\s+of\s+(\$\s?[\d,]+)[^\.]{0,80}(amount (you )?paid|fees? paid)/i);
      if (m2) cap = dollars(m2[1]);
    }
    if (typeof cap === 'number') {
      parsed.sections.push({
        key: 'liability',
        title: 'Liability Limit',
        bullets: [`Liability cap: $${cap.toLocaleString()}.`],
        facts: { liabilityCap: cap }
      });
    }
    
    // DMCA
    const dmcaEmail = (text.match(/dmca@[^\s)>,;]+/i) || [])[0];
    const dmcaAddress = (text.match(/110\s+Green\s+Street[^\n]+/i) || [])[0];
    if (dmcaEmail || dmcaAddress) {
      parsed.sections.push({
        key: 'dmca',
        title: 'DMCA',
        bullets: [dmcaEmail ? `DMCA email: ${dmcaEmail.toLowerCase()}.` : 'DMCA mailing address present.'],
        facts: { dmcaEmail: dmcaEmail?.toLowerCase(), dmcaAddress }
      });
    }
    
    // Governing law/venue
    const gov = (text.match(/governed by\s+the\s+laws?\s+of\s+([A-Za-z\s]+)/i) || [])[1]?.trim();
    const ven = (text.match(/state and federal courts located in\s+the\s+State\s+of\s+([A-Za-z\s]+)/i) || [])[1]?.trim() || gov;
    if (gov) {
      parsed.sections.push({
        key: 'governing_law',
        title: 'Governing Law & Venue',
        bullets: [`${gov}${ven ? `; venue ${ven}` : ''}`],
        facts: { governingLaw: gov, venue: ven }
      });
    }
    
    // California notice + L2
    if (/california\s+civil\s+code\s+§?\s*1542/i.test(text)) {
      parsed.sections.push({
        key: 'california_notice',
        title: 'California §1542',
        bullets: ['California Civil Code §1542 waiver present.'],
        facts: { ccp1542Waiver: true }
      });
    }
    
    const stack = /OP\s*Stack/i.test(text) ? 'OP Stack' : undefined;
    const seq = /ConduitXYZ,?\s*Inc\./i.test(text) ? 'ConduitXYZ, Inc.' : undefined;
    const disputeDays = /seven[-\s]?day\s+[""']?dispute period[""']?/i.test(text) ? 7 : undefined;
    
    if (stack || seq || disputeDays) {
      const bullets = [];
      if (stack) bullets.push(`${stack} rollup`);
      if (seq) bullets.push(`Sequencer operated by ${seq}.`);
      if (disputeDays) bullets.push(`Withdrawals subject to a ${disputeDays}-day dispute period.`);
      parsed.sections.push({
        key: 'zora_network',
        title: 'Zora Network (L2)',
        bullets,
        facts: { stack, sequencerOperator: seq, disputePeriodDays: disputeDays }
      });
    }
    
    // Risk flags
    const risks = {
      arbitration,
      classActionWaiver: classWaiver,
      liabilityCap: typeof cap === 'number' ? cap : null,
      terminationAtWill: /(suspend|terminate).*(any\s*time|sole\s*discretion)/i.test(text),
      walletSelfCustody: selfCustody,
      irreversibleTxs: irreversible,
      bridgingL2Risks: bridging,
      optOutDays: mOpt ? Number(mOpt[1]) : null
    };
    
    return { parsed, risks };
  }
  
  // Main initialization
  function init() {
    // Find terms content
    const termsEl = qsOne(config.termsSelectors) || document.body;
    const termsText = (termsEl.innerText || termsEl.textContent || '').trim();
    
    if (!termsText) {
      console.log('LegalEasy: No terms content found');
      return;
    }
    
    // Find agree button
    const agreeEl = qsOne(config.agreeSelectors);
    const anchor = agreeEl || termsEl;
    const styles = readStyles(agreeEl || termsEl);
    
    // Create host container
    const host = document.createElement('div');
    host.style.width = '100%';
    host.className = 'legaleasy-shopify-embed';
    (anchor.parentNode || document.body).insertBefore(host, anchor);
    
    // Create prompt
    const prompt = $(`
      <div style="
        border: 1px solid rgba(0,0,0,0.1);
        border-radius: ${styles.borderRadius};
        padding: 12px;
        background: #fff;
        box-shadow: 0 1px 2px rgba(0,0,0,0.04);
        font-family: ${styles.fontFamily || 'inherit'};
        font-size: ${styles.fontSize || 'inherit'};
        line-height: ${styles.lineHeight || 'inherit'};
        color: ${styles.color || 'inherit'};
        display: flex; 
        flex-direction: column; 
        gap: 8px;
        margin: 10px 0;
      ">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="
            display: inline-flex; 
            align-items: center; 
            justify-content: center;
            width: 20px; 
            height: 20px; 
            border-radius: 4px; 
            color: #fff;
            background: ${config.brandColor};
            font-size: 12px;
          ">${config.brandIcon}</span>
          <span style="font-weight: 600;">Want a summary of these terms?</span>
        </div>
        <div style="display: flex; gap: 8px;">
          <button data-le="yes" style="
            flex: 1; 
            height: ${styles.buttonHeight}px;
            border-radius: 8px; 
            border: 1px solid ${config.brandColor};
            background: ${config.brandColor}; 
            color: #fff; 
            font-weight: 600;
            cursor: pointer;
          ">Yes</button>
          <button data-le="no" style="
            flex: 1; 
            height: ${styles.buttonHeight}px;
            border-radius: 8px; 
            border: 1px solid rgba(0,0,0,0.15);
            background: #fff; 
            color: inherit; 
            font-weight: 600;
            cursor: pointer;
          ">No</button>
        </div>
      </div>
    `);
    
    host.appendChild(prompt);
    
    // Handle Yes button click
    prompt.querySelector('[data-le="yes"]').addEventListener('click', () => {
      const { parsed, risks } = parseTerms(termsText);
      host.innerHTML = '';
      
      // Create summary bullets
      const bullets = [];
      const byKey = (key) => parsed.sections.find(s => s.key === key);
      
      const rights = byKey('wallet');
      const their = /(suspend|terminate|sole discretion)/i.test(termsText) ? 
        { bullets: ['Platform may suspend/terminate at its discretion.'] } : null;
      const risk = byKey('risks');
      const disp = byKey('disputes');
      
      if (rights) bullets.push({ icon: '✅', label: 'Your Rights', text: rights.bullets?.[0] || 'You keep keys; gas is non-refundable.' });
      if (their) bullets.push({ icon: '❌', label: 'Their Rights', text: their.bullets?.[0] });
      if (risk) bullets.push({ icon: '⚠️', label: 'Risks & Gotchas', text: risk.bullets?.[0] });
      if (disp) bullets.push({ icon: '📜', label: 'Disputes', text: disp.bullets?.[0] });
      
      // Create detail items
      const detailItems = parsed.sections.map(s => {
        const line = (s.bullets || []).concat(s.body ? [s.body] : []).join(' ');
        return line ? `<div><b>${s.title}:</b> ${line}</div>` : '';
      }).join('');
      
      // Create banner items
      const bannerItems = [];
      if (risks.arbitration) bannerItems.push('Disputes go to binding arbitration.');
      if (risks.classActionWaiver) bannerItems.push('Class actions are waived.');
      if (typeof risks.liabilityCap === 'number') bannerItems.push(`Liability cap: $${risks.liabilityCap.toLocaleString()}.`);
      if (risks.terminationAtWill) bannerItems.push('Platform can suspend/terminate at its discretion.');
      
      // Create summary
      const summary = $(`
        <section style="
          max-width: 680px; 
          border: 1px solid rgba(0,0,0,0.1); 
          border-radius: 16px; 
          background: #fff; 
          box-shadow: 0 1px 2px rgba(0,0,0,0.04); 
          padding: 16px;
          margin: 10px 0;
        ">
          ${bannerItems.length ? `
          <div style="
            margin-bottom: 12px; 
            border: 1px solid #fecaca; 
            background: #fef2f2; 
            border-radius: 12px; 
            padding: 10px;
          ">
            <div style="font-weight: 600;">⚠️ Heads up</div>
            <ul style="margin: 6px 0 0 18px;">
              ${bannerItems.map(li => `<li>${li}</li>`).join('')}
            </ul>
          </div>` : ''}
          
          <h2 style="margin: 0 0 8px 0; font-weight: 700; font-size: 16px;">⚖️ Terms Summary</h2>
          <ul style="list-style: none; padding: 0; margin: 0 0 10px 0;">
            ${bullets.map(b => `
              <li style="display: flex; gap: 8px; margin: 6px 0;">
                <span aria-hidden>${b.icon}</span>
                <div><b style="margin-right: 4px;">${b.label}:</b><span>${b.text || ''}</span></div>
              </li>
            `).join('')}
          </ul>
          
          <details>
            <summary style="cursor: pointer; color: #2563eb; font-weight: 600;">Show More</summary>
            <div style="margin-top: 10px; color: #374151; font-size: 14px;">${detailItems}</div>
          </details>
          
          <div style="margin-top: 12px; color: #6b7280; font-size: 12px;">
            LegalEasy summaries are for convenience only and not legal advice.
          </div>
        </section>
      `);
      
      host.appendChild(summary);
    });
    
    // Handle No button click
    prompt.querySelector('[data-le="no"]').addEventListener('click', () => {
      host.innerHTML = '';
    });
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
