/**
 * LegalEasy Theme App Extension Loader
 * This script loads the main LegalEasy widget with merchant-specific configuration
 */

(function() {
  'use strict';

  // Get configuration from data attributes set by Liquid
  const script = document.currentScript;
  const config = {
    brandColor: script?.dataset?.color || '#00B3A6',
    brandIcon: script?.dataset?.icon || '◆',
    termsSelectors: script?.dataset?.terms || '',
    agreeSelectors: script?.dataset?.agree || '',
    shopDomain: window.Shopify?.shop || ''
  };

  // Get merchant-specific configuration from your Railway backend
  async function getMerchantConfig() {
    try {
      const response = await fetch(`https://t-c-widget-production.up.railway.app/apps/legaleasy/config?shop=${config.shopDomain}`);
      if (!response.ok) {
        console.warn('[LegalEasy] Could not fetch merchant config, using defaults');
        return config;
      }
      const merchantConfig = await response.json();
      return { ...config, ...merchantConfig };
    } catch (error) {
      console.warn('[LegalEasy] Error fetching config:', error);
      return config;
    }
  }

  // Load the main widget from Vercel
  async function loadWidget() {
    const finalConfig = await getMerchantConfig();

    // Create a script tag to load your existing legaleasy-loader.js from Vercel
    const widgetScript = document.createElement('script');
    widgetScript.src = `https://legaleasy.tools/legaleasy-loader.js`;
    widgetScript.defer = true;

    // Pass config as a global variable that the loader can read
    window.LegalEasyConfig = finalConfig;

    // Add to page
    document.head.appendChild(widgetScript);

    console.log('[LegalEasy] Widget loaded with config:', finalConfig);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadWidget);
  } else {
    loadWidget();
  }
})();
