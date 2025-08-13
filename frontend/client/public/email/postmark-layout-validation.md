# Postmark Layout Validation

## Template Syntax Compliance Check

Based on the Postmark documentation, here's how our Vivere Stays email layout complies with Postmark's requirements:

### ✅ Required Elements

1. **Content Placeholder**: `{{@content}}` ✓
   - Located in the main content area of the layout
   - Single content placeholder as required

2. **Variable Interpolation**: Uses correct Mustachio syntax ✓
   - `{{logo_url}}`, `{{email_title}}`, etc.
   - Proper double curly brace format

3. **Unsubscribe Link**: Supports unsubscribe functionality ✓
   - Uses `{{unsubscribe_url}}` variable
   - Includes proper HTML link structure

### ✅ Email Compatibility Features

1. **HTML Email Standards**: ✓
   - Uses table-based layout where needed
   - Includes email-specific CSS resets
   - MSO (Microsoft Outlook) compatibility styles

2. **Responsive Design**: ✓
   - Media queries for mobile devices
   - Fluid width containers
   - Scalable fonts and images

3. **CSS Inlining Ready**: ✓
   - Styles are in `<style>` block in `<head>`
   - Postmark will automatically inline these styles
   - No external CSS dependencies

### ✅ Postmark-Specific Features

1. **Layout Variables**: ✓
   - Supports custom variables for reusability
   - Template inheritance from layout variables
   - Proper variable scoping

2. **Template Model Compatibility**: ✓
   - Variables can be passed via template model API parameter
   - Supports nested object properties
   - Compatible with JSON data structures

### ✅ Security Considerations

1. **XSS Protection**: ✓
   - Uses Postmark's default HTML encoding
   - No unsafe variable interpolation (`{{{variable}}}` only used where appropriate)
   - Safe handling of user-generated content

### ✅ Best Practices

1. **Fallback Content**: ✓
   - Alt text for images
   - Graceful degradation for unsupported features

2. **Accessibility**: ✓
   - Proper semantic HTML structure
   - Sufficient color contrast ratios
   - Readable font sizes

3. **Performance**: ✓
   - Optimized for email client rendering
   - Minimal external dependencies
   - Efficient CSS structure

## Layout Structure Validation

```
✅ DOCTYPE declaration
✅ HTML lang attribute
✅ Meta charset and viewport
✅ Email-compatible CSS resets
✅ Proper table structure for email clients
✅ Inline styles for maximum compatibility
✅ Content placeholder positioned correctly
✅ Footer with unsubscribe link
✅ Responsive breakpoints
```

## Variable Usage Examples

The layout supports these variable types as per Postmark documentation:

### Simple Variables
```
{{logo_url}} → String
{{email_title}} → String
{{email_subtitle}} → String
```

### Template Content
```
{{@content}} → HTML content from associated template
```

### Conditional Content (if needed in templates)
```
{{#user_name}}
  Hi {{user_name}},
{{/user_name}}
```

### Collection Handling (if needed in templates)
```
{{#booking_items}}
  <li>{{item_name}}: {{item_price}}</li>
{{/booking_items}}
```

## Postmark Server Setup Instructions

1. **Create Layout**:
   - Go to your Postmark Server → Templates → Layouts
   - Click "Add layout"
   - Choose "Custom" and paste the HTML content
   - Name it "Vivere Stays Layout"

2. **Associate with Templates**:
   - Create individual email templates
   - Select the Vivere Stays Layout for each template
   - Add only the content that goes in `{{@content}}`

3. **Test the Layout**:
   - Use Postmark's preview feature
   - Send test emails to verify rendering
   - Check across different email clients

## Email Client Compatibility

The layout is designed to work with:
- ✅ Gmail (Desktop & Mobile)
- ✅ Outlook (2016+, 365, Web)
- ✅ Apple Mail (Desktop & iOS)
- ✅ Yahoo Mail
- ✅ Thunderbird
- ✅ Mobile email clients (iOS Mail, Android Gmail, etc.)

## Common Postmark Template Patterns

### Welcome Email Template Content
```html
<div class="content-section">
    <p>Hi {{user_name}},</p>
    <p>Welcome to Vivere Stays!</p>
    <div style="text-align: center;">
        <a href="{{action_url}}" class="primary-button">Get Started</a>
    </div>
</div>
```

### Verification Email Template Content
```html
<div class="content-section">
    <p>Please verify your email with this code:</p>
    <div class="verification-code">{{verification_code}}</div>
</div>
```

This layout is fully compliant with Postmark's requirements and ready for production use.