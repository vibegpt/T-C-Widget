# Legal Easy Terms Summary - WordPress Extension

A WordPress plugin that automatically detects and summarizes legal terms and conditions on your website using AI-powered analysis.

## Features

- **Automatic Detection**: Automatically scans pages for terms and conditions content
- **Gutenberg Block**: Easy-to-use block editor integration
- **AI-Powered Analysis**: Intelligent parsing of legal language
- **Risk Assessment**: Identifies key risks and important clauses
- **Customizable Branding**: Match your site's design with custom colors and icons
- **Responsive Design**: Works on all devices and screen sizes
- **Accessibility**: WCAG compliant with proper ARIA labels

## Installation

1. Upload the `legaleasy-terms-summary` folder to your `/wp-content/plugins/` directory
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Go to 'Legal Easy' in your admin menu to configure settings
4. Add your API key and customize the appearance

## Configuration

### Basic Settings

- **API Key**: Your Legal Easy API key for terms analysis
- **Auto-Detection**: Enable automatic scanning of pages for terms
- **Brand Color**: Choose the primary color for Legal Easy widgets
- **Brand Icon**: Set a custom icon or emoji for branding

### Gutenberg Block

The "Legal Easy Terms Summary" block can be added to any page or post:

1. Click the "+" button to add a new block
2. Search for "Legal Easy" or "Terms Summary"
3. Add the block and configure its settings
4. Paste your terms text or enable auto-detection

## Usage

### Automatic Detection

When auto-detection is enabled, the plugin will:
- Scan page content for terms and conditions
- Look for common patterns like "Terms of Service", "Privacy Policy", etc.
- Automatically display the Legal Easy widget on relevant pages

### Manual Block Usage

1. Add the Terms Summary block to any page
2. Paste your terms text in the block settings
3. Configure display options (show prompt, branding, etc.)
4. The block will automatically analyze and display the summary

### Shortcode Usage

You can also use shortcodes to display terms summaries:

```
[legaleasy_terms_summary terms_text="Your terms here..." show_prompt="true"]
```

## Customization

### CSS Customization

The plugin includes CSS classes for easy customization:

```css
.legaleasy-terms-summary-block {
    /* Main block container */
}

.legaleasy-terms-text {
    /* Terms content styling */
}

.legaleasy-analysis-results {
    /* Analysis results styling */
}
```

### JavaScript Hooks

The plugin provides several JavaScript hooks for customization:

```javascript
// Before analysis starts
jQuery(document).on('legaleasy:before-analysis', function(event, data) {
    console.log('Starting analysis:', data);
});

// After analysis completes
jQuery(document).on('legaleasy:analysis-complete', function(event, data) {
    console.log('Analysis complete:', data);
});
```

## API Integration

The plugin integrates with the Legal Easy API for terms analysis. Make sure to:

1. Obtain an API key from Legal Easy
2. Enter the key in the plugin settings
3. Ensure your site can make outbound HTTPS requests

## Troubleshooting

### Common Issues

**Plugin not detecting terms:**
- Check that auto-detection is enabled
- Ensure terms content is in standard HTML elements
- Try adding the block manually

**Analysis not working:**
- Verify your API key is correct
- Check that your site can make outbound requests
- Look for JavaScript errors in the browser console

**Styling issues:**
- Check for theme conflicts
- Use custom CSS to override styles
- Ensure the plugin CSS is loading

### Debug Mode

Enable WordPress debug mode to see detailed error messages:

```php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
```

## Support

For support and documentation, visit:
- [Legal Easy Website](https://legaleasy.com)
- [WordPress Plugin Directory](https://wordpress.org/plugins/legaleasy-terms-summary)
- [GitHub Repository](https://github.com/legaleasy/wordpress-extension)

## Changelog

### Version 1.0.0
- Initial release
- Gutenberg block integration
- Automatic terms detection
- AI-powered analysis
- Customizable branding
- Responsive design

## License

This plugin is licensed under the GPL v2 or later.

## Privacy

This plugin may send terms text to the Legal Easy API for analysis. Please review our privacy policy for details on data handling.
