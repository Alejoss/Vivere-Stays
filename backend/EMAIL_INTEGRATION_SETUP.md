# Postmark Email Integration Setup Guide

This guide explains how to set up and use the Postmark email integration for sending verification emails in the Vivere Stays application.

## Prerequisites

1. **Postmark Account**: Sign up at [postmarkapp.com](https://postmarkapp.com)
2. **Postmark Server Token**: Get your server token from the API Tokens tab in your Postmark server
3. **Email Templates**: Set up the email templates in Postmark (see template setup below)

## Installation

### 1. Install Dependencies

The required dependency is already added to `requirements.txt`:

```bash
pip install postmarker==1.0
```

Or if using Docker:
```bash
docker-compose exec vivere_backend pip install -r requirements.txt
```

### 2. Environment Configuration

Create a `.env` file in the backend directory with the following variables:

```env
# Postmark Configuration
POSTMARK_TOKEN=your-postmark-server-token-here
POSTMARK_TEST_MODE=True
DEFAULT_FROM_EMAIL=noreply@viverestays.com

# Email verification settings (optional - defaults provided)
# EMAIL_VERIFICATION_EXPIRY_MINUTES=10
# EMAIL_VERIFICATION_CODE_LENGTH=5
```

**Important**: 
- Replace `your-postmark-server-token-here` with your actual Postmark server token
- Set `POSTMARK_TEST_MODE=False` in production
- Use your actual domain for `DEFAULT_FROM_EMAIL`

### 3. Postmark Template Setup

In your Postmark server, you need to:

1. **Create the Layout**: 
   - Use the HTML from `frontend/client/public/email/vivere-stays-email-layout.html`
   - Name it "Vivere Stays Layout"

2. **Create Email Verification Template**:
   - Use the HTML from `frontend/client/public/email/email-verification-template.html`
   - Associate with the Vivere Stays Layout
   - Set template alias: `email-verification`
   - Set subject: "Verify your email address - Vivere Stays"

## API Endpoints

### 1. Send Verification Email

**Endpoint**: `POST /api/profiles/send-verification-email/`

**Request Body**:
```json
{
  "email": "user@example.com",
  "first_name": "John"
}
```

**Response (Success)**:
```json
{
  "message": "Verification email sent successfully",
  "message_id": "postmark-message-id",
  "verification_code": "12345"  // Only in test mode
}
```

**Response (Error)**:
```json
{
  "error": "Email address is required"
}
```

### 2. Verify Email Code

**Endpoint**: `POST /api/profiles/verify-email-code/`

**Request Body**:
```json
{
  "email": "user@example.com",
  "code": "12345"
}
```

**Response (Success)**:
```json
{
  "message": "Email verified successfully!",
  "verified": true
}
```

**Response (Error)**:
```json
{
  "error": "Invalid verification code. Please check the code and try again.",
  "verified": false
}
```

### 3. Resend Verification Email

**Endpoint**: `POST /api/profiles/resend-verification-email/`

Same as send verification email endpoint.

## Frontend Integration

### Example Usage in React

```javascript
// Send verification email
const sendVerificationEmail = async (email, firstName) => {
  try {
    const response = await fetch('/api/profiles/send-verification-email/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        first_name: firstName
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('Verification email sent:', data.message);
      // In test mode, you can use data.verification_code for testing
      return { success: true, data };
    } else {
      console.error('Error:', data.error);
      return { success: false, error: data.error };
    }
  } catch (error) {
    console.error('Network error:', error);
    return { success: false, error: 'Network error occurred' };
  }
};

// Verify email code
const verifyEmailCode = async (email, code) => {
  try {
    const response = await fetch('/api/profiles/verify-email-code/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        code: code
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('Email verified:', data.message);
      return { success: true, data };
    } else {
      console.error('Verification failed:', data.error);
      return { success: false, error: data.error };
    }
  } catch (error) {
    console.error('Network error:', error);
    return { success: false, error: 'Network error occurred' };
  }
};
```

## Integration with Existing Onboarding Flow

### 1. Modify Registration Process

Update your registration flow to send verification email after user submits registration form:

```javascript
// In your Register component
const handleSubmit = async (formData) => {
  // ... existing validation ...
  
  // Send verification email
  const emailResult = await sendVerificationEmail(formData.email, formData.firstName);
  
  if (emailResult.success) {
    // Navigate to verification page
    navigate('/verify-email', { 
      state: { 
        email: formData.email,
        firstName: formData.firstName 
      }
    });
  } else {
    setError(emailResult.error);
  }
};
```

### 2. Update VerifyEmail Component

Modify your existing `VerifyEmail.tsx` component to use the new API:

```javascript
// In VerifyEmail.tsx
const handleVerifyEmail = async () => {
  if (verificationCode.length === 5) {
    setIsVerifying(true);
    
    const result = await verifyEmailCode(email, verificationCode);
    
    if (result.success) {
      setIsVerified(true);
      // Continue to next step in onboarding
    } else {
      setError(result.error);
    }
    
    setIsVerifying(false);
  }
};
```

## Error Handling

The email service includes comprehensive error handling:

- **Invalid email/missing fields**: 400 Bad Request
- **Postmark API errors**: 500 Internal Server Error  
- **Code expiration**: Handled automatically with cache expiry
- **Invalid codes**: Clear error messages for users

## Testing

### Test Mode Features

When `POSTMARK_TEST_MODE=True`:
- Emails are not actually sent via Postmark
- Verification codes are logged to console
- API responses include the verification code for testing
- No Postmark charges incurred

### Manual Testing

1. **Test verification email**:
   ```bash
   curl -X POST http://localhost:8000/api/profiles/send-verification-email/ \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com", "first_name": "Test"}'
   ```

2. **Test code verification**:
   ```bash
   curl -X POST http://localhost:8000/api/profiles/verify-email-code/ \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com", "code": "12345"}'
   ```

## Production Deployment

### 1. Environment Variables

Set these in your production environment:

```env
POSTMARK_TOKEN=your-production-postmark-token
POSTMARK_TEST_MODE=False
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
```

### 2. DNS Configuration

Ensure your domain is properly configured in Postmark:
- Add your domain to Postmark
- Verify DKIM and SPF records
- Set up Return-Path domain

### 3. Monitoring

Monitor email delivery through:
- Postmark's activity dashboard
- Django logging (configured in the email service)
- Your application's error tracking

## Security Considerations

- Verification codes expire after 10 minutes (configurable)
- Codes are stored in Redis cache (not database)
- Rate limiting should be implemented for email sending
- All email addresses are normalized (lowercase, trimmed)
- Comprehensive logging for audit trail

## Troubleshooting

### Common Issues

1. **"Postmark token not configured"**:
   - Check your `.env` file has `POSTMARK_TOKEN` set
   - Verify the token is correct in Postmark dashboard

2. **"Template not found"**:
   - Ensure template alias matches: `email-verification`
   - Verify template is associated with the correct layout

3. **"Verification code expired"**:
   - Codes expire after 10 minutes
   - User should request a new code

4. **Redis connection errors**:
   - Ensure Redis is running
   - Check `REDIS_URL` configuration

For additional support, check the Postmark documentation or contact the development team.