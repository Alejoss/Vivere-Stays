#!/usr/bin/env python3
"""
Test the complete email verification flow
"""
import os
import sys
import django
from django.conf import settings

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vivere_stays.settings')
django.setup()

from django.contrib.auth.models import User
from profiles.email_service import PostmarkEmailService
from profiles.models import EmailVerificationCode

def test_complete_flow():
    """Test the complete email verification flow"""
    print("🧪 Testing Complete Email Verification Flow")
    print("=" * 50)
    
    # Initialize email service
    email_service = PostmarkEmailService()
    
    # Test data
    test_email = "test@example.com"
    test_first_name = "Test"
    
    print(f"📧 Test email: {test_email}")
    print(f"👤 Test name: {test_first_name}")
    print()
    
    # Step 1: Send verification email
    print("1️⃣ Sending verification email...")
    success, message_id, verification_code = email_service.send_verification_email(
        email=test_email,
        user_name=test_first_name
    )
    
    if success:
        print(f"   ✅ Email sent successfully!")
        print(f"   📨 Message ID: {message_id}")
        print(f"   🔢 Verification code: {verification_code}")
        print()
    else:
        print(f"   ❌ Failed to send email: {message_id}")
        return False
    
    # Step 2: Verify the code was stored
    print("2️⃣ Checking if code was stored...")
    stored_code = email_service.get_verification_code(test_email)
    
    if stored_code:
        print(f"   ✅ Code stored: {stored_code}")
        print(f"   🔍 Matches sent code: {stored_code == verification_code}")
        print()
    else:
        print("   ❌ No code found in storage")
        return False
    
    # Step 3: Verify the code
    print("3️⃣ Verifying the code...")
    verify_success, verify_message = email_service.verify_code(test_email, verification_code)
    
    if verify_success:
        print(f"   ✅ Code verified successfully!")
        print(f"   📝 Message: {verify_message}")
        print()
    else:
        print(f"   ❌ Code verification failed: {verify_message}")
        return False
    
    # Step 4: Check that code is marked as used
    print("4️⃣ Checking if code is marked as used...")
    try:
        verification_record = EmailVerificationCode.objects.get(user__email=test_email)
        if verification_record.is_used:
            print("   ✅ Code marked as used")
        else:
            print("   ❌ Code not marked as used")
            return False
    except EmailVerificationCode.DoesNotExist:
        print("   ❌ Verification record not found")
        return False
    
    # Step 5: Try to verify the same code again (should fail)
    print("5️⃣ Testing duplicate code verification...")
    duplicate_success, duplicate_message = email_service.verify_code(test_email, verification_code)
    
    if not duplicate_success:
        print(f"   ✅ Correctly rejected duplicate code: {duplicate_message}")
    else:
        print("   ❌ Should have rejected duplicate code")
        return False
    
    print()
    print("🎉 All tests passed! Email verification flow is working correctly.")
    return True

if __name__ == "__main__":
    test_complete_flow()
