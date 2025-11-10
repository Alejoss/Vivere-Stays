# Vivere Stays Email Templates - Usage Examples

This document shows how to use the Vivere Stays email layout with different types of email content using Postmark's template syntax.

## Layout Variables

The layout accepts these variables:
- `{{logo_url}}` - URL to the Vivere Stays logo
- `{{email_title}}` - Main title for the email
- `{{email_subtitle}}` - Subtitle/description text
- `{{@content}}` - The main content area (Postmark content placeholder)
- `{{unsubscribe_url}}` - Unsubscribe link URL
- `{{company_website}}` - Company website URL

## Example 1: Welcome Email Template

### Template Variables:
```json
{
  "logo_url": "https://your-domain.com/images/vivere-stays-logo.png",
  "email_title": "Welcome to Vivere Stays!",
  "email_subtitle": "Thank you for joining us. Let's get your hotel set up for success.",
  "unsubscribe_url": "{{unsubscribe_url}}",
  "company_website": "https://viverestays.com",
  "user_name": "John Doe",
  "next_step_url": "https://app.viverestays.com/onboarding/hotel-information"
}
```

### Template Content:
```html
<div class="content-section">
    <p style="font-size: 16px; color: #485567; line-height: 1.6; margin: 0 0 24px 0;">
        Hi {{user_name}},
    </p>
    
    <p style="font-size: 16px; color: #485567; line-height: 1.6; margin: 0 0 24px 0;">
        Welcome to Vivere Stays! We're excited to help you optimize your hotel's performance and maximize your revenue.
    </p>
    
    <p style="font-size: 16px; color: #485567; line-height: 1.6; margin: 0 0 32px 0;">
        To get started, please complete your hotel information setup:
    </p>
    
    <div style="text-align: center; margin: 32px 0;">
        <a href="{{next_step_url}}" class="primary-button">Complete Hotel Setup</a>
    </div>
    
    <p style="font-size: 14px; color: #9CAABD; line-height: 1.5; margin: 24px 0 0 0;">
        If you have any questions, our support team is here to help. Simply reply to this email or contact us at info@viverestays.es.
    </p>
</div>
```

## Example 2: Email Verification Template

### Template Variables:
```json
{
  "logo_url": "https://your-domain.com/images/vivere-stays-logo.png",
  "email_title": "Verify Your Email Address",
  "email_subtitle": "Please use the verification code below to confirm your email address.",
  "unsubscribe_url": "{{unsubscribe_url}}",
  "company_website": "https://viverestays.com",
  "verification_code": "123456",
  "user_name": "John Doe"
}
```

### Template Content:
```html
<div class="content-section">
    <p style="font-size: 16px; color: #485567; line-height: 1.6; margin: 0 0 24px 0;">
        Hi {{user_name}},
    </p>
    
    <p style="font-size: 16px; color: #485567; line-height: 1.6; margin: 0 0 24px 0;">
        To complete your Vivere Stays account setup, please verify your email address using the code below:
    </p>
    
    <div class="verification-code">
        {{verification_code}}
    </div>
    
    <p style="font-size: 14px; color: #9CAABD; text-align: center; margin: 16px 0 32px 0;">
        This code will expire in 10 minutes
    </p>
    
    <p style="font-size: 16px; color: #485567; line-height: 1.6; margin: 0 0 24px 0;">
        If you didn't request this verification, you can safely ignore this email.
    </p>
</div>
```

## Example 3: Password Reset Template

### Template Variables:
```json
{
  "logo_url": "https://your-domain.com/images/vivere-stays-logo.png",
  "email_title": "Reset Your Password",
  "email_subtitle": "We received a request to reset your password. Click the button below to create a new one.",
  "unsubscribe_url": "{{unsubscribe_url}}",
  "company_website": "https://viverestays.com",
  "reset_url": "https://app.viverestays.com/reset-password?token=abc123",
  "user_name": "John Doe"
}
```

### Template Content:
```html
<div class="content-section">
    <p style="font-size: 16px; color: #485567; line-height: 1.6; margin: 0 0 24px 0;">
        Hi {{user_name}},
    </p>
    
    <p style="font-size: 16px; color: #485567; line-height: 1.6; margin: 0 0 32px 0;">
        We received a request to reset your password for your Vivere Stays account. Click the button below to create a new password:
    </p>
    
    <div style="text-align: center; margin: 32px 0;">
        <a href="{{reset_url}}" class="primary-button">Reset Password</a>
    </div>
    
    <p style="font-size: 14px; color: #9CAABD; line-height: 1.5; margin: 24px 0;">
        This link will expire in 1 hour for security reasons.
    </p>
    
    <p style="font-size: 14px; color: #9CAABD; line-height: 1.5; margin: 0;">
        If you didn't request this password reset, please ignore this email or contact our support team if you have concerns.
    </p>
</div>
```

## Example 4: Booking Confirmation Template

### Template Variables:
```json
{
  "logo_url": "https://your-domain.com/images/vivere-stays-logo.png",
  "email_title": "Booking Confirmed!",
  "email_subtitle": "Your reservation has been successfully confirmed.",
  "unsubscribe_url": "{{unsubscribe_url}}",
  "company_website": "https://viverestays.com",
  "guest_name": "Jane Smith",
  "hotel_name": "Grand Plaza Hotel",
  "check_in": "March 15, 2025",
  "check_out": "March 18, 2025",
  "room_type": "Deluxe Suite",
  "booking_reference": "VIV123456789"
}
```

### Template Content:
```html
<div class="content-section">
    <div class="success-box">
        <div style="text-align: center; margin-bottom: 16px;">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21.7293 29.4618C21.0959 29.4151 20.5068 29.1309 20.088 28.6701L10.2404 19.1695C10.021 18.7263 9.9494 18.2284 10.0355 17.7443C10.1215 17.2602 10.3611 16.8137 10.7211 16.4664C11.0811 16.1191 11.5438 15.888 12.0456 15.805C12.5474 15.7219 13.0635 15.791 13.5229 16.0026L21.6308 23.8248L49.6309 -3.0014C50.0903 -3.2131 50.6065 -3.2821 51.1083 -3.1991C51.61 -3.116 52.0728 -2.8849 52.4328 -2.5376C52.7928 -2.1903 53.0323 -1.7439 53.1184 -1.2598C53.2045 -0.775694 53.1329 -0.277707 52.9135 0.165514L23.3706 28.6701C22.9518 29.1309 22.3626 29.4151 21.7293 29.4618Z" fill="#16B257"/>
            </svg>
        </div>
        <p style="font-size: 18px; color: #16B257; font-weight: 600; margin: 0;">
            Booking Reference: {{booking_reference}}
        </p>
    </div>
    
    <p style="font-size: 16px; color: #485567; line-height: 1.6; margin: 0 0 24px 0;">
        Dear {{guest_name}},
    </p>
    
    <p style="font-size: 16px; color: #485567; line-height: 1.6; margin: 0 0 32px 0;">
        Thank you for choosing {{hotel_name}}! Your reservation has been confirmed with the following details:
    </p>
    
    <div class="info-box">
        <table style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="padding: 8px 0; font-size: 14px; color: #9CAABD; font-weight: 500;">Hotel:</td>
                <td style="padding: 8px 0; font-size: 14px; color: #1E1E1E; font-weight: 600;">{{hotel_name}}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; font-size: 14px; color: #9CAABD; font-weight: 500;">Room Type:</td>
                <td style="padding: 8px 0; font-size: 14px; color: #1E1E1E; font-weight: 600;">{{room_type}}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; font-size: 14px; color: #9CAABD; font-weight: 500;">Check-in:</td>
                <td style="padding: 8px 0; font-size: 14px; color: #1E1E1E; font-weight: 600;">{{check_in}}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; font-size: 14px; color: #9CAABD; font-weight: 500;">Check-out:</td>
                <td style="padding: 8px 0; font-size: 14px; color: #1E1E1E; font-weight: 600;">{{check_out}}</td>
            </tr>
        </table>
    </div>
    
    <p style="font-size: 14px; color: #9CAABD; line-height: 1.5; margin: 24px 0 0 0;">
        We look forward to welcoming you! If you have any questions or need to make changes to your reservation, please contact the hotel directly.
    </p>
</div>
```

## Using with Postmark

1. **Upload the Layout**: Copy the HTML content from `vivere-stays-email-layout.html` and create a new layout in your Postmark server.

2. **Create Templates**: For each email type, create a new template and associate it with the Vivere Stays layout.

3. **Template Content**: Use only the content that goes inside the `{{@content}}` placeholder for each template.

4. **Send Emails**: When sending emails via the Postmark API, use the template model to pass the required variables.

### API Example:
```json
{
  "TemplateAlias": "welcome-email",
  "TemplateModel": {
    "logo_url": "https://your-domain.com/images/vivere-stays-logo.png",
    "email_title": "Welcome to Vivere Stays!",
    "email_subtitle": "Thank you for joining us. Let's get your hotel set up for success.",
    "user_name": "John Doe",
    "next_step_url": "https://app.viverestays.com/onboarding/hotel-information",
    "unsubscribe_url": "{{{unsubscribe_url}}}",
    "company_website": "https://viverestays.com"
  },
  "To": "john.doe@example.com",
  "From": "noreply@viverestays.com",
  "Subject": "Welcome to Vivere Stays!"
}
```

## Color Reference

- **Background**: `#F6F9FD` (Light blue-gray)
- **Primary Blue**: `#294758` (Dark blue for buttons and links)
- **Accent Blue**: `#03CBF5` (Bright blue for accents)
- **Success Green**: `#16B257` (Success states and confirmations)
- **Error Red**: `#FF0404` (Error states and warnings)
- **Text Primary**: `#1E1E1E` (Main text color)
- **Text Secondary**: `#485567` (Secondary text color)
- **Text Muted**: `#9CAABD` (Muted text color)
- **Border/Input**: `#D7DFE8` (Border colors)