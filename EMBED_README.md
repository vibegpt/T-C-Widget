# Legal Easy Embed Widget

This document explains how to use the Legal Easy embed widget to display policy summaries on any website.

## API Endpoint

The embed API endpoint is available at:
```
GET /api/embed/[publicId]?lang=[language]
```

### Parameters
- `publicId` (required): The public ID of the embed
- `lang` (optional): Language code (default: "en")

### Response Format
```json
{
  "policyTitle": "Terms of Service",
  "updatedAt": "2024-01-15T10:30:00Z",
  "locale": "en",
  "overallRisk": "Y",
  "highlights": [
    "Users can terminate account at any time",
    "Data is stored for 30 days after account deletion"
  ],
  "clauses": [
    {
      "tag": "termination",
      "risk": "G",
      "plain_english": "You can cancel your account anytime by contacting support."
    }
  ]
}
```

## Standalone Widget

### Basic Usage

Include the widget script and add a div with the required attributes:

```html
<div data-legal-easy-widget
     data-public-id="your-public-id-here"
     data-lang="en"></div>
<script src="https://your-domain.com/embed.js"></script>
```

### Attributes

- `data-public-id` (required): The public ID of the embed
- `data-lang` (optional): Language code (default: "en")

### Manual Initialization

You can also initialize widgets manually:

```javascript
// Initialize all widgets on the page
LegalEasy.init();

// Initialize a specific element
const element = document.getElementById('my-widget');
LegalEasy.initWidget(element);
```

## Testing

1. Start your Next.js development server:
   ```bash
   npm run dev
   ```

2. Open `test.html` in your browser to test both the API and widget functionality

3. The test page includes:
   - Interactive controls to test different public IDs and languages
   - Formatted summary display
   - Raw JSON response viewer
   - Standalone widget example

## Error Handling

The widget handles various error conditions:
- Invalid public ID
- Missing policy or summary data
- Network errors
- API errors

All errors are displayed in a user-friendly format within the widget container.

## Styling

The widget includes built-in CSS styles that are automatically injected. The styles are scoped to `.legal-easy-widget` to avoid conflicts with your existing styles.

You can override the default styles by targeting the widget classes in your CSS.
