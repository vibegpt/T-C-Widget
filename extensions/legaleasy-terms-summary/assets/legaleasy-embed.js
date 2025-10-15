// LegalEasy Embed Script for Shopify
// This script fetches and displays legal terms summaries

// Main create function that fetches data and renders the widget
async function create(container, options = {}) {
  const { publicId, lang = 'en', dark = false } = options;
  
  if (!publicId) {
    throw new Error('Public ID is required');
  }

  try {
    // Fetch the summary data from the API
    const response = await fetch(`/api/embed/${publicId}?lang=${lang}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch summary: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Render the summary widget
    renderSummary(container, data, options);
    
  } catch (error) {
    console.error('LegalEasy Error:', error);
    container.innerHTML = `
      <div style="padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9f9f9; color: #666;">
        <strong>LegalEasy Error:</strong> ${error.message}
      </div>
    `;
  }
}

// Render the summary widget
function renderSummary(container, data, options = {}) {
  const { brandColor = '#00B3A6', brandIcon = '◆', dark = false } = options;
  
  const themeClass = dark ? 'le-dark' : 'le-light';
  
  container.innerHTML = `
    <div class="le-widget ${themeClass}" style="
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: ${dark ? '#e5e7eb' : '#374151'};
      background: ${dark ? '#1f2937' : '#ffffff'};
      border: 1px solid ${dark ? '#374151' : '#e5e7eb'};
      border-radius: 12px;
      padding: 16px;
      margin: 12px 0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    ">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
        <span style="
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 6px;
          background: ${brandColor};
          color: white;
          font-weight: 600;
          font-size: 12px;
        ">${brandIcon}</span>
        <h3 style="margin: 0; font-size: 16px; font-weight: 600;">Terms Summary</h3>
      </div>
      
      <div class="le-summary-content">
        ${renderSummaryContent(data)}
      </div>
      
      <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid ${dark ? '#374151' : '#e5e7eb'}; font-size: 12px; color: ${dark ? '#9ca3af' : '#6b7280'};">
        <em>This is a convenience summary. Always read the full terms for legal effect.</em>
      </div>
    </div>
  `;
}

// Render the summary content based on the API response
function renderSummaryContent(data) {
  if (!data || !data.summary) {
    return '<p>No summary available.</p>';
  }
  
  const { summary } = data;
  let content = '';
  
  // Render highlights if available
  if (summary.highlights && summary.highlights.length > 0) {
    content += '<div class="le-highlights" style="margin-bottom: 16px;">';
    content += '<h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">Key Points:</h4>';
    content += '<ul style="margin: 0; padding-left: 16px;">';
    summary.highlights.forEach(highlight => {
      content += `<li style="margin-bottom: 4px;">${highlight}</li>`;
    });
    content += '</ul></div>';
  }
  
  // Render changes if available
  if (summary.changes && summary.changes.length > 0) {
    content += '<div class="le-changes" style="margin-bottom: 16px;">';
    content += '<h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">Recent Changes:</h4>';
    content += '<ul style="margin: 0; padding-left: 16px;">';
    summary.changes.forEach(change => {
      content += `<li style="margin-bottom: 4px;">${change}</li>`;
    });
    content += '</ul></div>';
  }
  
  // Render risk information if available
  if (data.overall_risk) {
    const riskLevel = data.overall_risk;
    const riskColor = riskLevel === 'H' ? '#ef4444' : riskLevel === 'M' ? '#f59e0b' : '#10b981';
    const riskText = riskLevel === 'H' ? 'High Risk' : riskLevel === 'M' ? 'Medium Risk' : 'Low Risk';
    
    content += `<div class="le-risk" style="
      margin-bottom: 16px;
      padding: 8px 12px;
      background: ${riskColor}20;
      border: 1px solid ${riskColor}40;
      border-radius: 6px;
      font-size: 13px;
    ">
      <strong style="color: ${riskColor};">Risk Level: ${riskText}</strong>
    </div>`;
  }
  
  return content || '<p>Summary content is being processed.</p>';
}

// Auto-init for Shopify Theme App Embed
async function autoInitFromShopify() {
  // Find the specific div created by the Liquid file
  const node = document.getElementById('legaleasy-embed-root');
  if (!node) {
    // If the div isn't on the page, do nothing.
    return;
  }

  // Read the publicId from our new data attribute
  const publicId = node.dataset.lePublicId || node.getAttribute('data-le-public-id');
  
  // You can also read your other settings like this:
  const brandColor = node.dataset.leBrandColor || '#00B3A6';
  const brandIcon = node.dataset.leBrandIcon || '◆';

  if (!publicId) {
    node.textContent = "LegalEasy error: Public ID is missing. Please set it in the theme editor.";
    console.error("LegalEasy: publicId is not set in the data-le-public-id attribute.");
    return;
  }

  try {
    // Call the create function to fetch data and render the widget
    await create(node, { publicId, brandColor, brandIcon }); // Pass other options like 'lang' or 'dark' if needed
  } catch (e) {
    node.textContent = `LegalEasy error: ${e.message || e}`;
    console.error("LegalEasy Error:", e);
  }
}

// --- Replace the old event listeners with this new one ---

window.LegalEasy = { create };
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", autoInitFromShopify);
} else {
  autoInitFromShopify();
}