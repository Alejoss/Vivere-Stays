#!/usr/bin/env python3
"""
Simple test script for email verification
"""
import os
import sys
import django

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vivere_stays.settings')
django.setup()

from profiles.email_service import PostmarkEmailService

def test_email_service():
    """Test the email service"""
    print("🧪 Testing Email Service")
    print("=" * 30)
    
    # Initialize email service
    email_service = PostmarkEmailService()
    
    # Test data
    test_email = "test@example.com"
    test_name = "Test User"
    
    print(f"📧 Test email: {test_email}")
    print(f"👤 Test name: {test_name}")
    print()
    
    # Test sending email
    print("1️⃣ Sending verification email...")
    success, message_id, verification_code = email_service.send_verification_email(
        email=test_email,
        user_name=test_name
    )
    
    if success:
        print(f"   ✅ Email sent successfully!")
        print(f"   📨 Message ID: {message_id}")
        print(f"   🔢 Verification code: {verification_code}")
        print()
    else:
        print(f"   ❌ Failed to send email: {message_id}")
        return False
    
    # Test retrieving the code
    print("2️⃣ Retrieving stored code...")
    stored_code = email_service.get_verification_code(test_email)
    
    if stored_code:
        print(f"   ✅ Code retrieved: {stored_code}")
        print(f"   🔍 Matches sent code: {stored_code == verification_code}")
        print()
    else:
        print("   ❌ No code found in storage")
        return False
    
    # Test verifying the code
    print("3️⃣ Verifying the code...")
    verify_success, verify_message = email_service.verify_code(test_email, verification_code)
    
    if verify_success:
        print(f"   ✅ Code verified successfully!")
        print(f"   📝 Message: {verify_message}")
        print()
    else:
        print(f"   ❌ Code verification failed: {verify_message}")
        return False
    
    print("🎉 All tests passed! Email service is working correctly.")
    return True

if __name__ == "__main__":
    test_email_service()
