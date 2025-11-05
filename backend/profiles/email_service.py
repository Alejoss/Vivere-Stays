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
    TEST_EMAIL = "support@viverestays.com"
    
    def __init__(self):
        """Initialize PostmarkEmailService with proper error handling and logging."""
        logger.info("Initializing PostmarkEmailService")
        logger.info(f"POSTMARK_TOKEN: {settings.POSTMARK_TOKEN[:10] if settings.POSTMARK_TOKEN else 'NOT SET'}...")
        logger.info(f"POSTMARK_TEST_MODE: {settings.POSTMARK_TEST_MODE}")
        logger.info(f"DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")
        
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
            "company_website": settings.COMPANY_WEBSITE,
            "unsubscribe_url": settings.COMPANY_UNSUBSCRIBE_URL
        }
    
    def get_email_subject(self, template_key: str, language: str = 'en') -> str:
        """
        Get localized email subject based on template and language.
        
        Args:
            template_key: Template identifier (e.g., 'verification', 'welcome', 'support')
            language: Language code ('en', 'es', 'de')
        
        Returns:
            str: Localized email subject
        """
        subjects = {
            'verification': {
                'en': 'Confirm your email',
                'es': 'Confirma tu correo electrónico',
                'de': 'Bestätigen Sie Ihre E-Mail',
            },
            'welcome': {
                'en': 'Welcome to Vivere Stays!',
                'es': '¡Bienvenido a Vivere Stays!',
                'de': 'Willkommen bei Vivere Stays!',
            },
            'support_confirmation': {
                'en': 'Support Request Received - Vivere Stays',
                'es': 'Solicitud de Soporte Recibida - Vivere Stays',
                'de': 'Support-Anfrage Erhalten - Vivere Stays',
            },
            'contact_sales': {
                'en': 'Sales Request Received - Vivere Stays',
                'es': 'Solicitud de Ventas Recibida - Vivere Stays',
                'de': 'Vertriebsanfrage Erhalten - Vivere Stays',
            },
        }
        
        # Get subject for template and language, fallback to English
        template_subjects = subjects.get(template_key, subjects['verification'])
        return template_subjects.get(language, template_subjects['en'])
        
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
    
    def send_verification_email(self, email: str, user_name: str, user: User = None, language: str = 'en') -> Tuple[bool, str, str]:
        """
        Send email verification email using language-specific Django template.
        
        Args:
            email: Recipient email address
            user_name: User's first name
            user: Optional User object (for registered users)
            language: Language code ('en', 'es', 'de')
            
        Returns:
            Tuple[bool, str, str]: (success, message_id_or_error, verification_code)
        """
        logger.info(f"Starting send_verification_email for {email} in language: {language}")
        
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
            response = self.client.emails.send_with_template(
                TemplateAlias="email-verification",
                TemplateModel=template_data,
                To=email,
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
    
    def send_welcome_email(self, email: str, user_name: str, next_step_url: str, language: str = 'en') -> Tuple[bool, str]:
        """
        Send welcome email after successful verification using language-specific Django template.
        
        Args:
            email: Recipient email address
            user_name: User's first name
            next_step_url: URL for next onboarding step
            language: Language code ('en', 'es', 'de')
            
        Returns:
            Tuple[bool, str]: (success, message_id_or_error)
        """
        logger.info(f"Starting send_welcome_email for {email} in language: {language}")
        
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
            response = self.client.emails.send_with_template(
                TemplateAlias="email-verification",  # Using existing template
                TemplateModel=template_data,
                To=email,
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
        message: str = None,
        language: str = 'en',
    ) -> Tuple[bool, str]:
        """
        Send support confirmation email to the user using language-specific Django template.
        
        Args:
            to_email: Recipient email address (user's email)
            user_name: User's first name
            ticket_id: Support ticket ID
            issue_type: Type of issue reported
            description_excerpt: Brief description of the issue
            support_email: Support team email address
            portal_url: URL to the support portal
            message: Full support message (optional, will be included if provided)
            language: Language code ('en', 'es', 'de')
            
        Returns:
            Tuple[bool, str]: (success, message_id_or_error)
        """
        logger.info(f"Starting send_support_confirmation_email to {to_email} in language: {language}")
        
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
            
            # Add message if provided
            if message:
                template_data["message"] = message

            if self.test_mode:
                logger.info(f"TEST MODE: Would send support confirmation to {to_email}")
                logger.info(f"TEST MODE: Template data: {template_data}")
                return True, "test-support-confirmation-message-id"
            response = self.client.emails.send_with_template(
                TemplateAlias="support-confirmation",
                TemplateModel=template_data,
                To=to_email,
                From=settings.DEFAULT_FROM_EMAIL,
            )

            logger.info(f"Support confirmation email sent to {to_email}, MessageID: {response['MessageID']}")
            return True, response['MessageID']
        except Exception as e:
            logger.error(f"Failed to send support confirmation email to {to_email}: {str(e)}", exc_info=True)
            return False, str(e)

    def send_support_team_notification_email(
        self,
        user_name: str,
        user_email: str,
        ticket_id: int,
        issue_type: str,
        description: str,
        support_email: str = "support@viverestays.com",
        language: str = 'en',
    ) -> Tuple[bool, str]:
        """
        Send support team notification email using language-specific Django template.
        This is sent to the support team when a support request is created.
        
        Args:
            user_name: User's first name
            user_email: User's email address
            ticket_id: Support ticket ID
            issue_type: Type of issue reported
            description: Full description/message of the support request
            support_email: Support team email address (default: support@viverestays.com)
            language: Language code ('en', 'es', 'de')
            
        Returns:
            Tuple[bool, str]: (success, message_id_or_error)
        """
        logger.info(f"Starting send_support_team_notification_email to {support_email} in language: {language}")
        
        try:
            template_data = {
                **self.get_base_template_data(),
                "user_name": user_name,
                "user_email": user_email,
                "ticket_id": ticket_id,
                "issue_type": issue_type,
                "description": description,
                "message": description,  # Also include as message for template compatibility
            }

            if self.test_mode:
                logger.info(f"TEST MODE: Would send support team notification to {support_email}")
                logger.info(f"TEST MODE: Template data: {template_data}")
                return True, "test-support-team-notification-message-id"
            response = self.client.emails.send_with_template(
                TemplateAlias="support-team-notification",
                TemplateModel=template_data,
                To=support_email,
                From=settings.DEFAULT_FROM_EMAIL,
            )

            logger.info(f"Support team notification email sent to {support_email}, MessageID: {response['MessageID']}")
            return True, response['MessageID']
        except Exception as e:
            logger.error(f"Failed to send support team notification email to {support_email}: {str(e)}", exc_info=True)
            return False, str(e)

    def send_onboarding_pms_support_email(
        self,
        user_name: str,
        user_email: str,
        user_id: int,
        property_id: str | None,
        message: str | None,
        language: str = 'en',
    ) -> Tuple[bool, str]:
        """
        Send onboarding PMS support emails - both to user (confirmation) and support team (notification).
        
        Args:
            user_name: User's first name
            user_email: User's email address
            user_id: User ID
            property_id: Property ID (optional)
            message: User's support message (optional)
            language: Language code ('en', 'es', 'de') - defaults to 'en'
            
        Returns:
            Tuple[bool, str]: (success, message_id_or_error) - from the support team notification
        """
        try:
            ticket_id = f"PMS-{user_id}"
            issue_type = "PMS Support Request"
            support_message = message or "No additional message provided"
            
            # Build description for user confirmation
            user_description_excerpt = f"This is a PMS support request from the onboarding flow. The user needs help choosing a compatible PMS system."
            if property_id:
                user_description_excerpt += f"\nProperty ID: {property_id}"
            
            # Send confirmation email to user
            try:
                user_success, _ = self.send_support_confirmation_email(
                    to_email=user_email,
                    user_name=user_name,
                    ticket_id=ticket_id,
                    issue_type=issue_type,
                    description_excerpt=user_description_excerpt,
                    support_email="support@viverestays.com",
                    portal_url=settings.FRONTEND_URL,
                    message=support_message,
                    language=language
                )
                if user_success:
                    logger.info(f"Onboarding PMS support confirmation email sent to user {user_email}")
            except Exception as user_email_exc:
                logger.error(f"Failed to send PMS support confirmation email to user {user_email}: {user_email_exc}", exc_info=True)

            # Build description for support team
            support_description = f"User: {user_name} ({user_email})\n"
            support_description += f"User ID: {user_id}\n"
            support_description += f"Property ID: {property_id or 'Not provided'}\n\n"
            support_description += "This is a PMS support request from the onboarding flow.\n"
            support_description += "The user needs help choosing a compatible PMS system.\n\n"
            support_description += "Message:\n"
            support_description += support_message

            # Send notification email to support team
            return self.send_support_team_notification_email(
                user_name=user_name,
                user_email=user_email,
                ticket_id=ticket_id,
                issue_type=issue_type,
                description=support_description,
                support_email="support@viverestays.com",
                language=language
            )
        except Exception as e:
            logger.error(f"Failed to send onboarding PMS support email: {str(e)}", exc_info=True)
            return False, str(e)

    def send_onboarding_email_verification_support_email(
        self,
        user_name: str,
        user_email: str,
        user_id: int,
        message: str | None,
        language: str = 'en',
    ) -> Tuple[bool, str]:
        """
        Send onboarding email verification support emails - both to user (confirmation) and support team (notification).
        
        Args:
            user_name: User's first name
            user_email: User's email address
            user_id: User ID
            message: User's support message (optional)
            language: Language code ('en', 'es', 'de') - defaults to 'en'
            
        Returns:
            Tuple[bool, str]: (success, message_id_or_error) - from the support team notification
        """
        try:
            ticket_id = f"EMAIL-VERIFY-{user_id}"
            issue_type = "Email Verification Support Request"
            support_message = message or "No additional message provided"
            
            # Build description for user confirmation
            user_description_excerpt = "This is an email verification support request from the onboarding flow. The user is having trouble verifying their email address."
            
            # Send confirmation email to user
            try:
                user_success, _ = self.send_support_confirmation_email(
                    to_email=user_email,
                    user_name=user_name,
                    ticket_id=ticket_id,
                    issue_type=issue_type,
                    description_excerpt=user_description_excerpt,
                    support_email="support@viverestays.com",
                    portal_url=settings.FRONTEND_URL,
                    message=support_message,
                    language=language
                )
                if user_success:
                    logger.info(f"Onboarding email verification support confirmation email sent to user {user_email}")
            except Exception as user_email_exc:
                logger.error(f"Failed to send email verification support confirmation email to user {user_email}: {user_email_exc}", exc_info=True)

            # Build description for support team
            support_description = f"User: {user_name} ({user_email})\n"
            support_description += f"User ID: {user_id}\n\n"
            support_description += "This is an email verification support request from the onboarding flow.\n"
            support_description += "The user is having trouble verifying their email address.\n\n"
            support_description += "Message:\n"
            support_description += support_message

            # Send notification email to support team
            return self.send_support_team_notification_email(
                user_name=user_name,
                user_email=user_email,
                ticket_id=ticket_id,
                issue_type=issue_type,
                description=support_description,
                support_email="support@viverestays.com",
                language=language
            )
        except Exception as e:
            logger.error(f"Failed to send onboarding email verification support email: {str(e)}", exc_info=True)
            return False, str(e)

    def send_sales_team_notification_email(
        self,
        user_name: str,
        user_email: str,
        ticket_id: str,
        property_id: str | None,
        description: str,
        sales_email: str = "support@viverestays.com",
        language: str = 'en',
    ) -> Tuple[bool, str]:
        """
        Send sales team notification email using language-specific Django template.
        This is sent to the sales team when a sales request is created.
        
        Args:
            user_name: User's first name
            user_email: User's email address
            ticket_id: Sales request ID
            property_id: Property ID (optional)
            description: Full description/message of the sales request
            sales_email: Sales team email address (default: support@viverestays.com)
            language: Language code ('en', 'es', 'de')
            
        Returns:
            Tuple[bool, str]: (success, message_id_or_error)
        """
        logger.info(f"Starting send_sales_team_notification_email to {sales_email} in language: {language}")
        
        try:
            template_data = {
                **self.get_base_template_data(),
                "user_name": user_name,
                "user_email": user_email,
                "ticket_id": ticket_id,
                "property_id": property_id or "Not available",
                "description": description,
                "message": description,  # Also include as message for template compatibility
            }

            if self.test_mode:
                logger.info(f"TEST MODE: Would send sales team notification to {sales_email}")
                logger.info(f"TEST MODE: Template data: {template_data}")
                return True, "test-sales-team-notification-message-id"
            response = self.client.emails.send_with_template(
                TemplateAlias="sales-team-notification",
                TemplateModel=template_data,
                To=sales_email,
                From=settings.DEFAULT_FROM_EMAIL,
            )

            logger.info(f"Sales team notification email sent to {sales_email}, MessageID: {response['MessageID']}")
            return True, response['MessageID']
        except Exception as e:
            logger.error(f"Failed to send sales team notification email to {sales_email}: {str(e)}", exc_info=True)
            return False, str(e)

    def send_onboarding_contact_sales_email(
        self,
        user_name: str,
        user_email: str,
        user_id: int,
        message: str | None,
        property_id: str | None = None,
        language: str = 'en',
    ) -> Tuple[bool, str]:
        """
        Send onboarding contact sales emails - both to user (confirmation) and sales team (notification).
        
        Args:
            user_name: User's first name
            user_email: User's email address
            user_id: User ID
            message: User's sales inquiry message (optional)
            property_id: Property ID (optional)
            language: Language code ('en', 'es', 'de') - defaults to 'en'
            
        Returns:
            Tuple[bool, str]: (success, message_id_or_error) - from the sales team notification
        """
        try:
            ticket_id = f"SALES-{user_id}"
            sales_message = message or "No additional message provided"
            
            # Send confirmation email to user
            try:
                user_template_data = {
                    **self.get_base_template_data(),
                    "user_name": user_name,
                    "ticket_id": ticket_id,
                    "property_id": property_id or "Not available",
                    "support_email": "support@viverestays.com",
                    "portal_url": settings.FRONTEND_URL,
                    "message": sales_message,  # Include user's message
                }
                
                if self.test_mode:
                    logger.info(f"TEST MODE: Would send contact sales confirmation to user {user_email}")
                    logger.info(f"TEST MODE: Template data: {user_template_data}")
                else:
                    user_response = self.client.emails.send_with_template(
                        TemplateAlias="contact-sales",
                        TemplateModel=user_template_data,
                        To=user_email,
                        From=settings.DEFAULT_FROM_EMAIL,
                    )
                    logger.info(f"Contact sales confirmation email sent to user {user_email}, MessageID: {user_response['MessageID']}")
            except Exception as user_email_exc:
                logger.error(f"Failed to send contact sales confirmation email to user {user_email}: {user_email_exc}", exc_info=True)

            # Build description for sales team
            sales_description = f"User: {user_name} ({user_email})\n"
            sales_description += f"User ID: {user_id}\n"
            sales_description += f"Property ID: {property_id or 'Not provided'}\n\n"
            sales_description += "This is a sales consultation request from the onboarding flow.\n"
            sales_description += "The user is interested in speaking with the sales team.\n\n"
            sales_description += "Message:\n"
            sales_description += sales_message

            # Send notification email to sales team
            return self.send_sales_team_notification_email(
                user_name=user_name,
                user_email=user_email,
                ticket_id=ticket_id,
                property_id=property_id,
                description=sales_description,
                sales_email="support@viverestays.com",
                language=language
            )
        except Exception as e:
            logger.error(f"Failed to send onboarding contact sales email: {str(e)}", exc_info=True)
            return False, str(e)


# Singleton instance
email_service = PostmarkEmailService()