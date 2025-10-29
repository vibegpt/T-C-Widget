/* LegalEasy Loader - Policy pages + Checkout
   Handles both real-time parsing on policy pages and pre-stored summaries on checkout
*/
(() => {
  // --- Page Detection ---
  function getPageType() {
    const path = window.location.pathname.toLowerCase();
    console.log('[LegalEasy] Checking path:', path);

    // Checkout pages
    if (path.startsWith('/checkout') || path.startsWith('/checkouts/')) {
      console.log('[LegalEasy] Checkout page detected');
      return 'checkout';
    }

    // Standard Shopify policy paths
    if (path.startsWith('/policies/')) {
      console.log('[LegalEasy] Standard policy path');
      return 'policy';
    }

    // Common custom page handles
    const policyPaths = [
      '/pages/terms',
      '/pages/privacy',
      '/pages/refund',
      '/pages/shipping',
      '/pages/legal',
      '/pages/conditions',
      '/pages/agreement',
      '/pages/disclaimer',
      '/pages/documentation',
      '/pages/docs'
    ];

    if (policyPaths.some(p => path.includes(p))) {
      console.log('[LegalEasy] Custom policy page');
      return 'policy';
    }

    // Check Shopify template type
    if (window.Shopify?.template) {
      const template = String(window.Shopify.template).toLowerCase();
      if (template.includes('policy') || template.includes('page.policy')) {
        console.log('[LegalEasy] Policy template detected');
        return 'policy';
      }
    }

    return null;
  }

  const pageType = getPageType();

  if (!pageType) {
    console.log('[LegalEasy] Not a policy or checkout page, widget inactive.');
    return;
  }

  // --- Config ---
  const BRAND = window.LegalEasyConfig?.brandColor
    ? { color: window.LegalEasyConfig.brandColor, icon: window.LegalEasyConfig.brandIcon || "◆" }
    : { color: "#00B3A6", icon: "◆" };

  const shopDomain = window.Shopify?.shop || window.location.hostname;

  // --- Checkout Mode ---
  if (pageType === 'checkout') {
    console.log('[LegalEasy] Initializing checkout mode...');

    // Check if summaries exist
    fetch(`https://t-c-widget-production.up.railway.app/apps/legaleasy/summaries/status?shop=${shopDomain}`)
      .then(res => res.json())
      .then(data => {
        if (!data.hasSummaries) {
          console.log('[LegalEasy] No summaries available for checkout');
          return;
        }

        console.log('[LegalEasy] Summaries available, showing checkout prompt');
        initCheckoutWidget();
      })
      .catch(err => {
        console.error('[LegalEasy] Error checking summaries:', err);
      });

    function initCheckoutWidget() {
      // Create floating button
      const button = document.createElement('button');
      button.innerHTML = `
        <span style="margin-right: 6px;">${BRAND.icon}</span>
        Want a summary of our policies?
      `;
      button.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: ${BRAND.color};
        color: white;
        border: none;
        border-radius: 24px;
        padding: 12px 20px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 999999;
        display: flex;
        align-items: center;
        transition: transform 0.2s, box-shadow 0.2s;
      `;

      button.onmouseover = () => {
        button.style.transform = 'translateY(-2px)';
        button.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
      };

      button.onmouseout = () => {
        button.style.transform = 'translateY(0)';
        button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
      };

      button.onclick = showCheckoutModal;

      document.body.appendChild(button);
    }

    function showCheckoutModal() {
      console.log('[LegalEasy] Fetching summaries...');

      fetch(`https://t-c-widget-production.up.railway.app/apps/legaleasy/summaries?shop=${shopDomain}`)
        .then(res => res.json())
        .then(data => {
          if (!data.summaries || data.summaries.length === 0) {
            alert('No policy summaries available');
            return;
          }

          displaySummariesModal(data.summaries);
        })
        .catch(err => {
          console.error('[LegalEasy] Error fetching summaries:', err);
          alert('Failed to load policy summaries');
        });
    }

    function displaySummariesModal(summaries) {
      // Create modal overlay
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 1000000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      `;

      // Create modal content
      const modal = document.createElement('div');
      modal.style.cssText = `
        background: white;
        border-radius: 12px;
        max-width: 600px;
        width: 100%;
        max-height: 80vh;
        overflow-y: auto;
        padding: 24px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      `;

      const policyNames = {
        'terms_and_conditions': 'Terms & Conditions',
        'privacy_policy': 'Privacy Policy',
        'refund_policy': 'Refund Policy'
      };

      let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 24px; color: #333;">Policy Summaries</h2>
          <button id="legaleasy-close" style="background: none; border: none; font-size: 28px; cursor: pointer; color: #666; line-height: 1;">&times;</button>
        </div>
      `;

      summaries.forEach(summary => {
        const name = policyNames[summary.policy_type] || summary.policy_type;
        html += `
          <div style="margin-bottom: 24px; padding: 16px; background: #f9fafb; border-radius: 8px;">
            <h3 style="margin: 0 0 12px 0; font-size: 18px; color: ${BRAND.color};">${name}</h3>
            <div style="white-space: pre-wrap; font-size: 14px; line-height: 1.6; color: #555;">
              ${summary.summary_text}
            </div>
          </div>
        `;
      });

      html += `
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 12px; color: #888; text-align: center;">
            These summaries are for convenience only and not legal advice. Please read the full policies before agreeing.
          </p>
        </div>
      `;

      modal.innerHTML = html;
      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      // Close handlers
      const closeBtn = document.getElementById('legaleasy-close');
      closeBtn.onclick = () => overlay.remove();
      overlay.onclick = (e) => {
        if (e.target === overlay) overlay.remove();
      };
    }

    return; // Exit early for checkout
  }

  // --- Policy Page Mode (existing real-time parser) ---
  console.log('[LegalEasy] Initializing policy page mode...');

  const SELECTORS = {
    terms: ['#terms','.terms','[data-terms]','main','article','.main-content'],
  };

  const qsOne = (sels) => {
    for (const s of sels) {
      const el = document.querySelector(s);
      if (el && el.offsetParent) return el;
    }
    return null;
  };

  // Simple parser for policy pages
  function parseTermsSimplified(text) {
    const clean = (t) => t.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
    const cleanText = clean(text);

    const parsed = {
      hasArbitration: /(binding,?\s*individual\s*arbitration|arbitration.*JAMS)/i.test(cleanText),
      hasClassWaiver: /waiv(e|er).{0,40}class (action|representative)/i.test(cleanText),
      liabilityCap: null,
      terminationAtWill: /(suspend|terminate).*(any\s*time|sole\s*discretion)/i.test(cleanText),
    };

    // Extract liability cap
    const mLiab = cleanText.match(/(?:maximum|aggregate|overall).{0,40}liability.{0,40}(\$\s?[\d,]+)/i);
    if (mLiab) {
      const match = mLiab[1].replace(/[,\s]/g, '').match(/\$?(\d+(?:\.\d+)?)/);
      if (match) parsed.liabilityCap = Number(match[1]);
    }

    return parsed;
  }

  // Create floating button for policy pages
  function initPolicyWidget() {
    const termsContainer = qsOne(SELECTORS.terms);

    if (!termsContainer) {
      console.log('[LegalEasy] No terms container found');
      return;
    }

    const text = termsContainer.innerText || termsContainer.textContent || '';

    if (text.length < 500) {
      console.log('[LegalEasy] Content too short, skipping');
      return;
    }

    // Create Shadow DOM for isolation
    const host = document.createElement('div');
    host.id = 'legaleasy-widget-host';
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });

    // Floating button
    const button = document.createElement('button');
    button.innerHTML = `<span style="margin-right: 6px;">${BRAND.icon}</span> Analyze Terms`;
    button.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: ${BRAND.color};
      color: white;
      border: none;
      border-radius: 24px;
      padding: 12px 20px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 999999;
      display: flex;
      align-items: center;
      transition: transform 0.2s, box-shadow 0.2s;
    `;

    button.onmouseover = () => {
      button.style.transform = 'translateY(-2px)';
      button.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
    };

    button.onmouseout = () => {
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    };

    let panelOpen = false;
    const panel = document.createElement('div');
    panel.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 360px;
      max-height: 500px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
      display: none;
      flex-direction: column;
      z-index: 999998;
    `;

    button.onclick = () => {
      if (panelOpen) {
        panel.style.display = 'none';
        panelOpen = false;
        return;
      }

      // Parse terms
      const parsed = parseTermsSimplified(text);

      let summaryHTML = '<div style="padding: 20px;">';
      summaryHTML += `<h3 style="margin: 0 0 16px 0; color: ${BRAND.color}; font-size: 18px;">⚠️ Heads up</h3>`;

      if (parsed.hasArbitration || parsed.hasClassWaiver || parsed.terminationAtWill || parsed.liabilityCap) {
        summaryHTML += '<div style="font-size: 14px; line-height: 1.6;">';
        if (parsed.hasArbitration) summaryHTML += '<p style="margin: 8px 0;">• Disputes go to binding arbitration.</p>';
        if (parsed.hasClassWaiver) summaryHTML += '<p style="margin: 8px 0;">• Class actions are waived.</p>';
        if (parsed.liabilityCap) summaryHTML += `<p style="margin: 8px 0;">• Liability cap: $${parsed.liabilityCap.toLocaleString()}.</p>`;
        if (parsed.terminationAtWill) summaryHTML += '<p style="margin: 8px 0;">• Platform can suspend/terminate at its discretion.</p>';
        summaryHTML += '</div>';
      } else {
        summaryHTML += '<p style="font-size: 14px; color: #666;">No significant risk factors detected.</p>';
      }

      summaryHTML += '<p style="margin-top: 16px; font-size: 12px; color: #888;">This summary is for convenience only and not legal advice. Please read the full terms before agreeing.</p>';
      summaryHTML += '</div>';

      panel.innerHTML = summaryHTML;
      panel.style.display = 'flex';
      panelOpen = true;
    };

    shadow.appendChild(button);
    shadow.appendChild(panel);

    console.log('[LegalEasy] Policy widget initialized');
  }

  initPolicyWidget();
})();
