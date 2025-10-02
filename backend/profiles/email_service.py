"""
Email service for Postmark integration
"""
import logging
import random
import string
from typing import Dict, Optional, Tuple
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from postmarker.core import PostmarkClient
from .models import EmailVerificationCode
from django.contrib.auth import get_user_model
User = get_user_model()

logger = logging.getLogger(__name__)


class PostmarkEmailService:
    """
    Service class for sending emails via Postmark API
    """
    
    # Test email for all email sending
    TEST_EMAIL = "analytics@viverestays.com"
    
    def __init__(self):
        """Initialize PostmarkEmailService with proper error handling and logging."""
        logger.info("Initializing PostmarkEmailService")
        logger.info(f"POSTMARK_TOKEN: {settings.POSTMARK_TOKEN[:10] if settings.POSTMARK_TOKEN else 'NOT SET'}...")
        logger.info(f"POSTMARK_TEST_MODE: {settings.POSTMARK_TEST_MODE}")
        logger.info(f"DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")
        logger.info(f"COMPANY_LOGO_URL: {settings.COMPANY_LOGO_URL}")
        
        try:
            self.client = PostmarkClient(server_token=settings.POSTMARK_TOKEN)
            logger.info("PostmarkClient initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize PostmarkClient: {str(e)}")
            raise e
            
        self.test_mode = settings.POSTMARK_TEST_MODE
        logger.info("PostmarkEmailService initialization complete")
        
    def get_base_template_data(self) -> Dict[str, str]:
        """Get base template data that should be included in all emails"""
        return {
            "logo_url": settings.COMPANY_LOGO_URL,
            "company_website": settings.COMPANY_WEBSITE,
            "unsubscribe_url": settings.COMPANY_UNSUBSCRIBE_URL
        }
        
    def generate_verification_code(self) -> str:
        """
        Generate a random verification code
        
        Returns:
            str: Random 5-digit verification code
        """
        length = getattr(settings, 'EMAIL_VERIFICATION_CODE_LENGTH', 5)
        return ''.join(random.choices(string.digits, k=length))
    
    def store_verification_code(self, email: str, code: str, user: User = None) -> None:
        """
        Store verification code in database with expiry.
        
        Args:
            email: User's email address
            code: Verification code to store
            user: Optional User object (for registered users)
        """
        logger.info(f"Storing verification code for {email}")
        
        expiry_minutes = getattr(settings, 'EMAIL_VERIFICATION_EXPIRY_MINUTES', 10)
        expires_at = timezone.now() + timedelta(minutes=expiry_minutes)
        
        # Delete any existing codes for this email
        EmailVerificationCode.objects.filter(email=email).delete()
        
        # Create new verification code
        EmailVerificationCode.objects.create(
            user=user,  # Can be None for anonymous verification
            email=email,
            code=code,
            expires_at=expires_at
        )
        
        user_type = "registered user" if user and user.is_active else "anonymous user"
        logger.info(f"Stored verification code for {email} ({user_type}) (expires in {expiry_minutes} minutes)")
    
    def get_verification_code(self, email: str, user: User = None) -> Optional[str]:
        """
        Retrieve verification code from database
        
        Args:
            email: User's email address
            user: Optional User object (for registered users)
            
        Returns:
            str or None: Verification code if found and not expired
        """
        try:
            # If user is provided, prefer codes linked to their account
            if user:
                verification_code = EmailVerificationCode.objects.filter(
                    email=email,
                    user=user,
                    is_used=False
                ).latest('created_at')
            else:
                # For anonymous users, find by email only
                verification_code = EmailVerificationCode.objects.filter(
                    email=email,
                    user__isnull=True,  # Only anonymous codes
                    is_used=False
                ).latest('created_at')
            
            if verification_code.is_expired():
                verification_code.delete()
                return None
                
            return verification_code.code
        except EmailVerificationCode.DoesNotExist:
            return None
    
    def delete_verification_code(self, email: str, user: User = None) -> None:
        """
        Delete verification code from database
        
        Args:
            email: User's email address
            user: Optional User object (for registered users)
        """
        if user:
            EmailVerificationCode.objects.filter(user=user).delete()
        else:
            try:
                temp_user = User.objects.get(email=email)
                EmailVerificationCode.objects.filter(user=temp_user).delete()
            except User.DoesNotExist:
                pass
        logger.info(f"Deleted verification code for {email}")
    
    def mark_verification_code_as_used(self, email: str, user: User = None) -> None:
        """
        Mark verification code as used
        
        Args:
            email: User's email address
            user: Optional User object (for registered users)
        """
        try:
            # If user is provided, prefer codes linked to their account
            if user:
                verification_code = EmailVerificationCode.objects.filter(
                    email=email,
                    user=user,
                    is_used=False
                ).latest('created_at')
            else:
                # For anonymous users, find by email only
                verification_code = EmailVerificationCode.objects.filter(
                    email=email,
                    user__isnull=True,  # Only anonymous codes
                    is_used=False
                ).latest('created_at')
            
            verification_code.mark_as_used()
            user_type = "registered user" if user and user.is_active else "anonymous user"
            logger.info(f"Marked verification code as used for {email} ({user_type})")
        except EmailVerificationCode.DoesNotExist:
            pass
    
    def send_verification_email(self, email: str, user_name: str, user: User = None) -> Tuple[bool, str, str]:
        """
        Send email verification email using Postmark template.
        
        Args:
            email: Recipient email address
            user_name: User's first name
            user: Optional User object (for registered users)
            
        Returns:
            Tuple[bool, str, str]: (success, message_id_or_error, verification_code)
        """
        logger.info(f"Starting send_verification_email for {email}")
        
        try:
            # Generate and store verification code
            verification_code = self.generate_verification_code()
            self.store_verification_code(email, verification_code, user)
            logger.info(f"Generated and stored verification code for {email}")
            
            # Prepare template data
            template_data = {
                **self.get_base_template_data(),
                "email_title": "Verify Your Email Address",
                "email_subtitle": "Please use the verification code below to confirm your email address and complete your account setup.",
                "user_name": user_name,
                "verification_code": verification_code,
                "expiry_time": f"{settings.EMAIL_VERIFICATION_EXPIRY_MINUTES} minutes"
            }
            
            if self.test_mode:
                logger.info(f"TEST MODE: Would send verification email to {email}")
                logger.info(f"TEST MODE: Verification code: {verification_code}")
                return True, "test-verification-message-id", verification_code
            
            # Override recipient email for testing
            logger.info(f"Overriding recipient email from {email} to {self.TEST_EMAIL}")
            
            response = self.client.emails.send_with_template(
                TemplateAlias="email-verification",
                TemplateModel=template_data,
                To=self.TEST_EMAIL,  # Always send to test email
                From=settings.DEFAULT_FROM_EMAIL
            )
            
            logger.info(f"Verification email sent to {email}, MessageID: {response['MessageID']}")
            return True, response['MessageID'], verification_code
            
        except Exception as e:
            logger.error(f"Failed to send verification email to {email}: {str(e)}", exc_info=True)
            return False, str(e), ""
    
    def verify_code(self, email: str, submitted_code: str, user: User = None) -> Tuple[bool, str]:
        """
        Verify submitted code against stored code
        
        Args:
            email: User's email address
            submitted_code: Code submitted by user
            
        Returns:
            Tuple[bool, str]: (success, message)
        """
        try:
            # DEVELOPMENT BYPASS: Allow "19391" as a valid code for testing
            if submitted_code.strip() == "19391":
                logger.info(f"DEVELOPMENT BYPASS: Using test code '19391' for {email}")
                # Mark the code as used even though it's a bypass
                self.mark_verification_code_as_used(email, user)
                return True, "Email verified successfully! (Development bypass used)"
            
            stored_code = self.get_verification_code(email, user)
            
            if not stored_code:
                return False, "Verification code has expired or doesn't exist. Please request a new one."
            
            if submitted_code.strip() != stored_code:
                return False, "Invalid verification code. Please check the code and try again."
            
            # Code is valid, mark it as used
            self.mark_verification_code_as_used(email, user)
            logger.info(f"Email verification successful for {email}")
            
            return True, "Email verified successfully!"
            
        except Exception as e:
            logger.error(f"Error during code verification for {email}: {str(e)}")
            return False, "An error occurred during verification. Please try again."
    
    def send_welcome_email(self, email: str, user_name: str, next_step_url: str) -> Tuple[bool, str]:
        """
        Send welcome email after successful verification using Postmark template.
        
        Args:
            email: Recipient email address
            user_name: User's first name
            next_step_url: URL for next onboarding step
            
        Returns:
            Tuple[bool, str]: (success, message_id_or_error)
        """
        logger.info(f"Starting send_welcome_email for {email}")
        
        try:
            template_data = {
                **self.get_base_template_data(),
                "user_name": user_name,
                "next_step_url": next_step_url
            }
            
            if self.test_mode:
                logger.info(f"TEST MODE: Would send welcome email to {email}")
                logger.info(f"TEST MODE: Template data: {template_data}")
                return True, "test-welcome-message-id"
            
            # Override recipient email for testing
            logger.info(f"Overriding recipient email from {email} to {self.TEST_EMAIL}")
            
            response = self.client.emails.send_with_template(
                TemplateAlias="email-verification",  # Using existing template
                TemplateModel=template_data,
                To=self.TEST_EMAIL,  # Always send to test email
                From=settings.DEFAULT_FROM_EMAIL
            )
            
            logger.info(f"Welcome email sent to {email}, MessageID: {response['MessageID']}")
            return True, response['MessageID']
            
        except Exception as e:
            logger.error(f"Failed to send welcome email to {email}: {str(e)}", exc_info=True)
            return False, str(e)

    def send_support_confirmation_email(
        self,
        to_email: str,
        user_name: str,
        ticket_id: int,
        issue_type: str,
        description_excerpt: str,
        support_email: str,
        portal_url: str,
    ) -> Tuple[bool, str]:
        """
        Send support confirmation email to the user using Postmark template.
        
        Args:
            to_email: Recipient email address
            user_name: User's first name
            ticket_id: Support ticket ID
            issue_type: Type of issue reported
            description_excerpt: Brief description of the issue
            support_email: Support team email address
            portal_url: URL to the support portal
            
        Returns:
            Tuple[bool, str]: (success, message_id_or_error)
        """
        logger.info(f"Starting send_support_confirmation_email to {to_email}")
        
        try:
            template_data = {
                **self.get_base_template_data(),
                "user_name": user_name,
                "ticket_id": ticket_id,
                "issue_type": issue_type,
                "description_excerpt": description_excerpt,
                "support_email": support_email,
                "portal_url": portal_url,
            }

            if self.test_mode:
                logger.info(f"TEST MODE: Would send support confirmation to {to_email}")
                logger.info(f"TEST MODE: Template data: {template_data}")
                return True, "test-support-confirmation-message-id"

            # Override recipient email for testing
            logger.info(f"Overriding recipient email from {to_email} to {self.TEST_EMAIL}")

            response = self.client.emails.send_with_template(
                TemplateAlias="support-confirmation",
                TemplateModel=template_data,
                To=self.TEST_EMAIL,  # Always send to test email
                From=settings.DEFAULT_FROM_EMAIL,
            )

            logger.info(f"Support confirmation email sent to {to_email}, MessageID: {response['MessageID']}")
            return True, response['MessageID']
        except Exception as e:
            logger.error(f"Failed to send support confirmation email to {to_email}: {str(e)}", exc_info=True)
            return False, str(e)

    def send_onboarding_pms_support_email(
        self,
        user_name: str,
        user_email: str,
        user_id: int,
        property_id: str | None,
        message: str | None,
        to_email: str = "analytics@viverestays.com",
    ) -> Tuple[bool, str]:
        """
        Send onboarding PMS support email to analytics using Postmark template.
        Uses the existing 'support-confirmation' template alias.
        """
        try:
            # Build description excerpt for the template (summary without message)
            description_lines = [
                f"User: {user_name} ({user_email})",
                f"Property ID: {property_id or 'Not provided'}",
                "",
                "This is a PMS support request from the onboarding flow.",
                "The user needs help choosing a compatible PMS system.",
            ]
            description_excerpt = "\n".join(description_lines)

            template_data = {
                **self.get_base_template_data(),
                "user_name": user_name,
                "ticket_id": f"PMS-{user_id}",  # Generate a ticket-like ID
                "issue_type": "PMS Support Request",
                "description_excerpt": description_excerpt,
                "message": message or "No additional message provided",
                "support_email": "analytics@viverestays.com",
                "portal_url": settings.FRONTEND_URL,
            }

            if self.test_mode:
                logger.info(f"TEST MODE: Would send onboarding PMS support to {to_email}")
                logger.info(f"TEST MODE: Template data: {template_data}")
                return True, "test-onboarding-pms-support-message-id"

            # Override recipient email for testing
            print(f"🔍 DEBUG: Overriding recipient email from {to_email} to {self.TEST_EMAIL}")

            response = self.client.emails.send_with_template(
                TemplateAlias="support-confirmation",
                TemplateModel=template_data,
                To=self.TEST_EMAIL,  # Always send to test email
                From="analytics@viverestays.com",
            )

            logger.info(f"Onboarding PMS support email sent to {to_email}, MessageID: {response['MessageID']}")
            return True, response['MessageID']
        except Exception as e:
            logger.error(f"Failed to send onboarding PMS support email to {to_email}: {str(e)}", exc_info=True)
            return False, str(e)

    def send_onboarding_email_verification_support_email(
        self,
        user_name: str,
        user_email: str,
        user_id: int,
        message: str | None,
        to_email: str = "analytics@viverestays.com",
    ) -> Tuple[bool, str]:
        """
        Send onboarding email verification support email to analytics using Postmark template.
        Uses the existing 'support-confirmation' template alias.
        """
        try:
            # Build description excerpt for the template (summary without message)
            description_lines = [
                f"User: {user_name} ({user_email})",
                f"User ID: {user_id}",
                "",
                "This is an email verification support request from the onboarding flow.",
                "The user is having trouble verifying their email address.",
            ]
            description_excerpt = "\n".join(description_lines)

            template_data = {
                **self.get_base_template_data(),
                "user_name": user_name,
                "ticket_id": f"EMAIL-VERIFY-{user_id}",  # Generate a ticket-like ID
                "issue_type": "Email Verification Support Request",
                "description_excerpt": description_excerpt,
                "message": message or "No additional message provided",
                "support_email": "analytics@viverestays.com",
                "portal_url": settings.FRONTEND_URL,
            }

            if self.test_mode:
                logger.info(f"TEST MODE: Would send onboarding email verification support to {to_email}")
                logger.info(f"TEST MODE: Template data: {template_data}")
                return True, "test-onboarding-email-verification-support-message-id"

            response = self.client.emails.send_with_template(
                TemplateAlias="support-confirmation",
                TemplateModel=template_data,
                To=self.TEST_EMAIL,
                From="analytics@viverestays.com",
            )

            logger.info(f"Onboarding email verification support email sent to {to_email}, MessageID: {response['MessageID']}")
            return True, response['MessageID']
        except Exception as e:
            logger.error(f"Failed to send onboarding email verification support email to {to_email}: {str(e)}", exc_info=True)
            return False, str(e)

    def send_onboarding_contact_sales_email(
        self,
        user_name: str,
        user_email: str,
        user_id: int,
        message: str | None,
        property_id: str | None = None,
        to_email: str = "sales@viverestays.com",
    ) -> Tuple[bool, str]:
        """
        Send onboarding contact sales email to sales team using dedicated contact sales template.
        Uses the 'contact-sales' template alias.
        """
        try:
            template_data = {
                **self.get_base_template_data(),
                "user_name": user_name,
                "user_email": user_email,
                "user_id": user_id,
                "property_id": property_id or "Not available",
                "ticket_id": f"SALES-{user_id}",  # Generate a ticket-like ID
                "support_email": "sales@viverestays.com",
                "portal_url": settings.FRONTEND_URL,
            }

            if self.test_mode:
                logger.info(f"TEST MODE: Would send onboarding contact sales to {to_email}")
                logger.info(f"TEST MODE: Template data: {template_data}")
                return True, "test-onboarding-contact-sales-message-id"

            response = self.client.emails.send_with_template(
                TemplateAlias="contact-sales",
                TemplateModel=template_data,
                To=self.TEST_EMAIL,
                From="analytics@viverestays.com",
            )

            logger.info(f"Onboarding contact sales email sent to {to_email}, MessageID: {response['MessageID']}")
            return True, response['MessageID']
        except Exception as e:
            logger.error(f"Failed to send onboarding contact sales email to {to_email}: {str(e)}", exc_info=True)
            return False, str(e)


# Singleton instance
email_service = PostmarkEmailService()