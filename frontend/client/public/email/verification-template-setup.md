# Email Verification Template Setup Guide

## Template Configuration for Postmark

### 1. Create the Template in Postmark

1. Go to your Postmark Server → Templates
2. Click "Add template"
3. Choose "With layout" and select your "Vivere Stays Layout"
4. Name the template: **"Email Verification"**
5. Set template alias: **"email-verification"**

### 2. Layout Variables

Set these variables for the layout:

```json
{
  "logo_url": "https://viverestays.com/wp-content/uploads/2022/06/VS_sticky.png",
  "email_title": "Verify Your Email Address",
  "email_subtitle": "Please use the verification code below to confirm your email address and complete your account setup.",
  "unsubscribe_url": "{{{unsubscribe_url}}}",
  "company_website": "https://viverestays.com"
}
```

### 3. Template Content

Copy the HTML content from `email-verification-template.html` and paste it into the template's HTML body section.

### 4. Template Variables

This template uses the following variables that you'll pass when sending the email:

```json
{
  "user_name": "John",
  "verification_code": "12345",
  "expiry_time": "10 minutes"
}
```

### 5. Subject Line

Set the email subject to:
```
Verify your email address - Vivere Stays
```

### 6. Sending the Email via API

Use this JSON structure when sending verification emails:

```json
{
  "TemplateAlias": "email-verification",
  "TemplateModel": {
    "user_name": "{{user_first_name}}",
    "verification_code": "{{generated_5_digit_code}}",
    "expiry_time": "10 minutes"
  },
  "To": "{{user_email}}",
  "From": "noreply@viverestays.com",
  "Subject": "Verify your email address - Vivere Stays",
  "MessageStream": "outbound"
}
```

### 7. Integration with Your Backend

#### Python/Django Example:

```python
import requests
import random
import string

def send_verification_email(user_email, user_first_name):
    # Generate 5-digit verification code
    verification_code = ''.join(random.choices(string.digits, k=5))
    
    # Store code in database/cache with expiry
    # store_verification_code(user_email, verification_code, expiry_minutes=10)
    
    # Send email via Postmark
    postmark_data = {
        "TemplateAlias": "email-verification",
        "TemplateModel": {
            "user_name": user_first_name,
            "verification_code": verification_code,
            "expiry_time": "10 minutes"
        },
        "To": user_email,
        "From": "noreply@viverestays.com",
        "Subject": "Verify your email address - Vivere Stays",
        "MessageStream": "outbound"
    }
    
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": "YOUR_POSTMARK_SERVER_TOKEN"
    }
    
    response = requests.post(
        "https://api.postmarkapp.com/email/withTemplate",
        json=postmark_data,
        headers=headers
    )
    
    return response.json()
```

#### Node.js Example:

```javascript
const postmark = require("postmark");

const client = new postmark.ServerClient("YOUR_POSTMARK_SERVER_TOKEN");

async function sendVerificationEmail(userEmail, userFirstName) {
    // Generate 5-digit verification code
    const verificationCode = Math.floor(10000 + Math.random() * 90000).toString();
    
    // Store code in database/cache with expiry
    // await storeVerificationCode(userEmail, verificationCode, 10);
    
    try {
        const result = await client.sendEmailWithTemplate({
            TemplateAlias: "email-verification",
            TemplateModel: {
                user_name: userFirstName,
                verification_code: verificationCode,
                expiry_time: "10 minutes"
            },
            To: userEmail,
            From: "noreply@viverestays.com",
            Subject: "Verify your email address - Vivere Stays",
            MessageStream: "outbound"
        });
        
        return { success: true, messageId: result.MessageID };
    } catch (error) {
        console.error("Failed to send verification email:", error);
        return { success: false, error: error.message };
    }
}
```

### 8. Testing the Template

1. **Preview in Postmark**: Use the preview feature with test data
2. **Send test email**: Send to your own email address
3. **Check rendering**: Verify it displays correctly across different email clients

### 9. Template Features

✅ **Responsive Design**: Works on desktop and mobile
✅ **Clear CTA**: Prominent verification code display  
✅ **Instructions**: Step-by-step guidance for users
✅ **Security Notice**: Warns about phishing attempts
✅ **Branded Design**: Matches your onboarding flow
✅ **Accessibility**: Proper contrast and readable fonts
✅ **Expiry Warning**: Shows code expiration time

### 10. Verification Flow Integration

This template integrates with your `VerifyEmail.tsx` component:

1. User registers → Backend generates 5-digit code
2. Email sent using this template
3. User receives email with styled verification code
4. User enters code in your `VerifyEmail.tsx` component
5. Backend validates code and completes verification

The email design matches your onboarding components' styling for a seamless user experience!