"""
Test the email service with the new model structure
"""
from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from .email_service import PostmarkEmailService
from .models import EmailVerificationCode


class EmailServiceTest(TestCase):
    def setUp(self):
        self.email_service = PostmarkEmailService()
        
    def test_store_and_retrieve_verification_code(self):
        """Test storing and retrieving verification codes"""
        email = "test@example.com"
        code = "12345"
        
        # Store verification code (this will create a temporary user)
        self.email_service.store_verification_code(email, code)
        
        # Retrieve the code
        retrieved_code = self.email_service.get_verification_code(email)
        
        # Verify the code matches
        self.assertEqual(retrieved_code, code)
        
        # Verify a temporary user was created
        temp_user = User.objects.get(email=email)
        self.assertFalse(temp_user.is_active)  # Should be inactive (temporary)
        
    def test_verification_code_expiry(self):
        """Test that verification codes expire correctly"""
        email = "expiry@example.com"
        code = "67890"
        
        # Store verification code
        self.email_service.store_verification_code(email, code)
        
        # Manually expire the code by updating expires_at
        verification_code = EmailVerificationCode.objects.get(user__email=email)
        verification_code.expires_at = timezone.now() - timezone.timedelta(minutes=1)
        verification_code.save()
        
        # Try to retrieve expired code
        retrieved_code = self.email_service.get_verification_code(email)
        
        # Should return None for expired code
        self.assertIsNone(retrieved_code)
        
    def test_verify_code_success(self):
        """Test successful code verification"""
        email = "success@example.com"
        code = "11111"
        
        # Store verification code
        self.email_service.store_verification_code(email, code)
        
        # Verify the code
        success, message = self.email_service.verify_code(email, code)
        
        # Should be successful
        self.assertTrue(success)
        self.assertIn("successfully", message)
        
        # Code should be marked as used
        verification_code = EmailVerificationCode.objects.get(user__email=email)
        self.assertTrue(verification_code.is_used)
        
    def test_verify_code_invalid(self):
        """Test invalid code verification"""
        email = "invalid@example.com"
        code = "22222"
        
        # Store verification code
        self.email_service.store_verification_code(email, code)
        
        # Try to verify with wrong code
        success, message = self.email_service.verify_code(email, "99999")
        
        # Should fail
        self.assertFalse(success)
        self.assertIn("Invalid", message)
        
    def test_registered_user_verification(self):
        """Test verification for registered users"""
        # Create a registered user
        user = User.objects.create_user(
            username="registered_user",
            email="registered@example.com",
            password="password123"
        )
        user.is_active = True
        user.save()
        
        email = "registered@example.com"
        code = "33333"
        
        # Store verification code for registered user
        self.email_service.store_verification_code(email, code, user)
        
        # Retrieve the code
        retrieved_code = self.email_service.get_verification_code(email, user)
        
        # Verify the code matches
        self.assertEqual(retrieved_code, code)
        
        # Verify the user is active
        verification_code = EmailVerificationCode.objects.get(user=user)
        self.assertTrue(verification_code.user.is_active)
