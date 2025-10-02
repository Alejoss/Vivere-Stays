# Email Templates

This directory contains all email templates used in the Vivere Stays application. Templates are organized into layouts and individual email templates.

## Directory Structure

```
email_templates/
├── layouts/                    # Base layout templates
│   └── vivere_layout.html     # Main Vivere Stays email layout
├── templates/                  # Individual email templates
│   ├── support_confirmation.html
│   ├── email_verification.html
│   ├── welcome_email.html
│   └── contact_sales.html
└── README.md                  # This file
```

## Layout Templates

### `layouts/vivere_layout.html`
- **Purpose**: Base layout used by all email templates
- **Features**: Header with logo, content slot, footer
- **Usage**: Individual email templates are inserted into the `{{content}}` slot

## Email Templates

### `templates/support_confirmation.html`
- **Template Alias**: `support-confirmation`
- **Purpose**: Sent to users when they submit a support ticket
- **Variables**:
  - `user_name`
  - `ticket_id`
  - `issue_type`
  - `description_excerpt`
  - `message`
  - `support_email`
  - `portal_url`

### `templates/email_verification.html`
- **Template Alias**: `email-verification`
- **Purpose**: Sent to users for email verification during registration
- **Variables**:
  - `user_name`
  - `verification_code`
  - `support_email`
  - `portal_url`

### `templates/welcome_email.html`
- **Template Alias**: `welcome-email`
- **Purpose**: Sent to users after successful registration
- **Variables**:
  - `user_name`
  - `support_email`
  - `portal_url`

### `templates/contact_sales.html`
- **Template Alias**: `contact-sales`
- **Purpose**: Sent to sales team when user reaches contact sales page during onboarding
- **Variables**:
  - `user_name`
  - `user_email`
  - `user_id`
  - `property_id`
  - `ticket_id`
  - `support_email`
  - `portal_url`

## Usage in Code

Templates are referenced in the email service using their Postmark aliases:

```python
# In PostmarkEmailService
response = self.client.emails.send_with_template(
    TemplateAlias="support-confirmation",  # Postmark alias
    TemplateModel=template_data,
    To=recipient_email,
    From=sender_email,
)
```

## Postmark Integration

1. **Layout**: The `vivere_layout.html` is set up as the base layout in Postmark
2. **Templates**: Individual email templates are created in Postmark with their respective aliases
3. **Variables**: All template variables are passed through the `TemplateModel` parameter

## Maintenance

- **Updates**: When updating templates, update both the Postmark templates and these reference files
- **New Templates**: Add new templates to this directory and update Postmark accordingly
- **Variables**: Document all template variables in the template files and this README

## Template Development

1. Create/edit the HTML template in this directory
2. Test the template locally if possible
3. Update the corresponding template in Postmark
4. Update the email service code if new variables are needed
5. Test the email sending functionality

## Notes

- All templates use inline CSS for maximum email client compatibility
- Templates are designed to be responsive and work across different email clients
- The layout provides consistent branding and structure across all emails
- Individual templates focus on content and are inserted into the layout's content slot
