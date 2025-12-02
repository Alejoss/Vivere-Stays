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

**⚠️ CRITICAL**: Templates must be created in Postmark before sending emails. The application will fail with error code 1101 if templates are missing.

In your Postmark server, you need to:

1. **Create the Layout**: 
   - Go to Postmark Server → Templates → Layouts
   - Click "Add layout"
   - Use the HTML from `frontend/client/public/email/vivere-stays-email-layout.html`
   - Name it exactly: **"Vivere Stays Layout"**
   - Save the layout

2. **Create Email Verification Template**:
   - Go to Postmark Server → Templates
   - Click "Add template"
   - Choose "With layout" and select your "Vivere Stays Layout"
   - Use the HTML from `frontend/client/public/email/email-verification-template.html`
   - **Set template alias exactly**: `email-verification` (case-sensitive)
   - Set subject: "Verify your email address - Vivere Stays"
   - Save and activate the template

3. **Create Password Reset Template**:
   - Go to Postmark Server → Templates
   - Click "Add template"
   - Choose "With layout" and select your "Vivere Stays Layout"
   - Use the HTML from `frontend/client/public/email/password-reset-template.html` (create this file if needed)
   - **Set template alias exactly**: `password-reset` (case-sensitive)
   - Set subject: "Reset Your Password - Vivere Stays"
   - Required template variables: `user_name`, `reset_url`, `expiry_time`
   - Save and activate the template

4. **Verify Template Creation**:
   - After creating the templates, verify they appear in your Postmark Templates list
   - The aliases should show as `email-verification` and `password-reset`
   - Make sure both templates are Active (not Draft)

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

### 4. Request Password Reset

**Endpoint**: `POST /api/profiles/request-password-reset/`

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Response (Success)**:
```json
{
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

**Response (Error)**:
```json
{
  "error": "Email address is required"
}
```

**Note**: For security reasons, the endpoint always returns success even if the email doesn't exist in the system.

### 5. Reset Password

**Endpoint**: `POST /api/profiles/reset-password/`

**Request Body**:
```json
{
  "uid": "base64_encoded_user_id",
  "token": "password_reset_token",
  "new_password": "new_password"
}
```

**Response (Success)**:
```json
{
  "message": "Password has been reset successfully"
}
```

**Response (Error)**:
```json
{
  "error": "Invalid or expired password reset link",
  "details": ["Password validation errors if applicable"]
}
```

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

1. **"[1101] The Template's 'Alias' associated with this request is not valid or was not found"**:
   - **This is the most common error** - it means the template doesn't exist in Postmark
   - Verify you've created the template in your Postmark server
   - Check that the template alias is exactly `email-verification` (case-sensitive, no spaces)
   - Ensure the template is Active (not Draft)
   - Verify you're using the correct Postmark server (check your POSTMARK_TOKEN matches the server)
   - See "Postmark Template Setup" section above for detailed instructions

2. **"Postmark token not configured"**:
   - Check your `.env` file has `POSTMARK_TOKEN` set
   - Verify the token is correct in Postmark dashboard
   - Token should be a Server Token (not Account Token)

3. **"Template not found"** (generic):
   - Ensure template alias matches exactly: `email-verification`
   - Verify template is associated with the correct layout
   - Check that template is Active in Postmark

4. **"Verification code expired"**:
   - Codes expire after 10 minutes
   - User should request a new code

5. **"POSTMARK_TEST_MODE not working"**:
   - Check that `POSTMARK_TEST_MODE=True` is set in your `.env` file
   - In test mode, emails are not sent and verification codes are logged
   - Default is `True` if not set in environment

6. **Redis connection errors**:
   - Ensure Redis is running
   - Check `REDIS_URL` configuration

For additional support, check the Postmark documentation or contact the development team.