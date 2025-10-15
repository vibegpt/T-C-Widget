# Legal Easy – Shopify Theme App Embed

A self-contained Shopify theme app embed that automatically detects and summarizes legal terms and conditions on your store using AI-powered analysis.

## Features

- **Self-Contained**: Single JavaScript file with embedded parser
- **Automatic Detection**: Finds terms and agree buttons automatically
- **Customizable Branding**: Match your store's design
- **AI-Powered Analysis**: Intelligent parsing of legal language
- **Risk Assessment**: Identifies key risks and important clauses
- **Responsive Design**: Works on all devices and screen sizes
- **Zero Dependencies**: No external libraries required

## Installation

### Method 1: Theme App Embed (Recommended)

1. Upload the `legaleasy-embed.liquid` file to your theme's `sections/` directory
2. Upload the `legaleasy-embed.js` file to your theme's `assets/` directory
3. In your Shopify admin, go to **Online Store > Themes**
4. Click **Customize** on your active theme
5. Go to **Theme settings > Theme app extensions**
6. Add the "Legal Easy – Terms Summary" app extension
7. Configure the settings as needed

### Method 2: Manual Integration

1. Copy the contents of `legaleasy-embed.liquid` into a new section file
2. Copy `legaleasy-embed.js` to your theme's assets folder
3. Add the section to your desired templates

## Configuration

### Basic Settings

- **Brand Color**: Choose the primary color for Legal Easy widgets (default: #00B3A6)
- **Brand Icon**: Set a custom icon or emoji (default: ◆)
- **Terms Selectors**: CSS selectors to find terms content (optional)
- **Agree Selectors**: CSS selectors to find agree buttons (optional)

### Default Selectors

**Terms Content:**
- `#terms`
- `.terms`
- `[data-terms]`
- `[aria-label*="terms" i]`

**Agree Buttons:**
- `button`
- `[role="button"]`
- `input[type="submit"]`
- `[name*="agree" i]`
- `[id*="agree" i]`

## Usage

### Automatic Detection

When the embed is active, it will:
- Scan page content for terms and conditions
- Look for common patterns like "Terms of Service", "Privacy Policy", etc.
- Automatically display the Legal Easy widget on relevant pages
- Show a prompt above agree buttons or terms sections

### Custom Integration

You can also manually trigger the widget by adding data attributes:

```html
<div data-legaleasy-trigger="true">
  <!-- Your terms content here -->
</div>
```

## Customization

### CSS Styling

The embed includes CSS classes for easy customization:

```css
.legaleasy-shopify-embed {
  /* Main container */
}

.legaleasy-shopify-embed .legaleasy-prompt {
  /* Prompt styling */
}

.legaleasy-shopify-embed .legaleasy-summary {
  /* Summary styling */
}
```

### JavaScript Configuration

You can override default settings by modifying the configuration object:

```javascript
window.LegalEasyConfig = {
  brandColor: '#your-color',
  brandIcon: 'your-icon',
  termsSelectors: ['#custom-terms'],
  agreeSelectors: ['#custom-agree']
};
```

## Supported Pages

The embed works on any Shopify page, but is most effective on:

- **Checkout Pages**: Terms and conditions acceptance
- **Product Pages**: Terms of sale
- **Account Pages**: Terms of service
- **Custom Pages**: Any page with legal content

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance

- **File Size**: ~15KB minified
- **Load Time**: <100ms on average
- **Memory Usage**: <1MB
- **No External Dependencies**: Self-contained

## Troubleshooting

### Common Issues

**Widget not appearing:**
- Check that terms content is present on the page
- Verify selectors are correct
- Ensure JavaScript is enabled

**Styling conflicts:**
- Check for theme CSS conflicts
- Use custom CSS to override styles
- Ensure proper CSS specificity

**Analysis not working:**
- Check browser console for errors
- Verify terms text is readable
- Ensure content is not hidden

### Debug Mode

Enable debug mode by adding this to your theme:

```javascript
window.LegalEasyDebug = true;
```

This will log detailed information to the browser console.

## API Integration

The embed can be extended to work with your Legal Easy API:

```javascript
// Override the analysis function
window.LegalEasyAnalyze = async function(termsText) {
  const response = await fetch('/api/legaleasy/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: termsText })
  });
  return response.json();
};
```

## Security

- **No Data Collection**: Terms are analyzed locally
- **No External Requests**: Self-contained analysis
- **Privacy Focused**: No user data is sent to external servers
- **GDPR Compliant**: No cookies or tracking

## Support

For support and documentation:
- [Legal Easy Website](https://legaleasy.com)
- [Shopify App Store](https://apps.shopify.com/legaleasy)
- [GitHub Repository](https://github.com/legaleasy/shopify-extension)

## Changelog

### Version 1.0.0
- Initial release
- Self-contained JavaScript parser
- Automatic terms detection
- Customizable branding
- Responsive design
- Shopify theme app embed integration

## License

This extension is licensed under the MIT License.

## Privacy

This extension does not collect, store, or transmit any user data. All analysis is performed locally in the user's browser.
