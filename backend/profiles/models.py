from datetime import datetime

from django.db import models
from django.contrib.auth.models import User


def upload_profile_picture(instance, filename):
    return "profile_pictures/" + instance.user.username + "_" + datetime.today().strftime('%h-%d-%y') + ".jpeg"


class Profile(models.Model):
    # Represents user profiles with basic authentication-related fields, timezone, and profile picture.

    # Onboarding progress tracking
    ONBOARDING_STEPS = [
        ('register', 'Register'),
        ('verify_email', 'Verify Email'),
        ('hotel_information', 'Hotel Information'),
        ('pms_integration', 'PMS Integration'),
        ('select_plan', 'Select Plan'),
        ('payment', 'Payment'),
        ('add_competitor', 'Add Competitor'),
        ('msp', 'MSP'),
        ('complete', 'Complete'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    timezone = models.CharField(max_length=30, blank=True)
    profile_picture = models.ImageField(upload_to=upload_profile_picture, null=True, blank=True)
    receive_updates = models.BooleanField(default=False, help_text="Whether the user wants to receive email updates")
    
    # Additional profile fields
    dni = models.CharField(max_length=20, blank=True, help_text="Spanish National Identity Document")
    phone_number = models.CharField(max_length=20, blank=True, help_text="Phone number with country code")    
    
    # Plan selection
    selected_plan = models.CharField(
        max_length=50, 
        blank=True, 
        null=True,
        help_text="The plan selected by the user during onboarding"
    )
    
    # Onboarding progress fields
    onboarding_step = models.CharField(
        max_length=20, 
        choices=ONBOARDING_STEPS, 
        default='register',
        help_text="Current step in the onboarding process"
    )
    onboarding_completed = models.BooleanField(
        default=False,
        help_text="Whether the user has completed the onboarding process"
    )

    def __str__(self):
        return self.user.username

    def get_properties(self):
        """
        Get all properties associated with this profile
        """
        return self.properties.all()

    @property
    def properties_count(self):
        """
        Get the count of properties associated with this profile
        """
        return self.properties.count()

    def add_property(self, property):
        """
        Add a property to this profile
        """
        self.properties.add(property)

    def remove_property(self, property):
        """
        Remove a property from this profile
        """
        self.properties.remove(property)

    def has_property(self, property):
        """
        Check if this profile has a specific property
        """
        return self.properties.filter(id=property.id).exists()

    def update_onboarding_step(self, step):
        """
        Update the current onboarding step
        """
        self.onboarding_step = step
        
        # Mark as completed if reaching the final step
        if step == 'complete':
            self.onboarding_completed = True
        
        self.save()

    def get_onboarding_progress(self):
        """
        Get onboarding progress information
        """
        step_order = [step[0] for step in self.ONBOARDING_STEPS]
        current_index = step_order.index(self.onboarding_step)
        total_steps = len(step_order)
        
        return {
            'current_step': self.onboarding_step,
            'current_step_display': dict(self.ONBOARDING_STEPS)[self.onboarding_step],
            'progress_percentage': ((current_index + 1) / total_steps) * 100,
            'completed': self.onboarding_completed,
            'next_step': step_order[current_index + 1] if current_index < total_steps - 1 else None,
        }


class PMSIntegrationRequirement(models.Model):
    """
    PMS Integration Requirements - tracks integration requests and status
    """
    STATUS_CHOICES = [
        ('requested', 'Requested'),
        ('processing', 'Processing'),
        ('integrated', 'Integrated'),
        ('not_supported', 'Not Supported'),
        ('no_pms', 'No PMS'),
    ]

    property_obj = models.ForeignKey('dynamic_pricing.Property', on_delete=models.CASCADE, related_name='pms_integrations')
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='pms_integrations')
    pms_system = models.ForeignKey('dynamic_pricing.PropertyManagementSystem', on_delete=models.CASCADE, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='requested')
    custom_pms_name = models.CharField(max_length=255, null=True, blank=True, help_text="Custom PMS name when 'other' is selected")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'PMS Integration Requirement'
        verbose_name_plural = 'PMS Integration Requirements'
        unique_together = ('property_obj', 'profile')  # One integration per property per profile

    def __str__(self):
        return f"{self.property_obj.name} - {self.get_status_display()}"

    @property
    def pms_name(self):
        """
        Returns the PMS name (either from PMS object or custom name)
        """
        if self.pms_system:
            return self.pms_system.name
        elif self.custom_pms_name:
            return self.custom_pms_name
        else:
            return "No PMS"


class EmailVerificationCode(models.Model):
    """
    Model to store email verification codes with automatic expiry
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, 
                           help_text="User account (null for anonymous verification)")
    email = models.EmailField(help_text="Email address for verification")
    code = models.CharField(max_length=10)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'email_verification_codes'
        indexes = [
            models.Index(fields=['email', 'created_at']),
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['expires_at']),
        ]
    
    def is_expired(self):
        """Check if the code has expired"""
        from django.utils import timezone
        return timezone.now() > self.expires_at
    
    def mark_as_used(self):
        """Mark the code as used"""
        self.is_used = True
        self.save()
    
    def __str__(self):
        return f"Verification code for {self.email} ({self.code})"


class Payment(models.Model):
    """
    Payment model to track payment status and details for users
    """
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
    ]

    PAYMENT_METHOD_CHOICES = [
        ('credit_card', 'Credit Card'),
        ('debit_card', 'Debit Card'),
        ('paypal', 'PayPal'),
        ('bank_transfer', 'Bank Transfer'),
        ('stripe', 'Stripe'),
        ('other', 'Other'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2, help_text="Payment amount")
    currency = models.CharField(max_length=3, default='EUR', help_text="Payment currency (ISO 4217)")
    status = models.CharField(
        max_length=20, 
        choices=PAYMENT_STATUS_CHOICES, 
        default='pending',
        help_text="Current status of the payment"
    )
    payment_method = models.CharField(
        max_length=20, 
        choices=PAYMENT_METHOD_CHOICES, 
        help_text="Method used for payment"
    )
    plan_name = models.CharField(max_length=100, help_text="Name of the plan being paid for")
    plan_duration = models.CharField(max_length=20, help_text="Duration of the plan (e.g., 'monthly', 'yearly')")
    
    # Payment provider details
    transaction_id = models.CharField(max_length=255, blank=True, null=True, help_text="External transaction ID from payment provider")
    payment_provider = models.CharField(max_length=50, blank=True, null=True, help_text="Payment provider name (e.g., 'stripe', 'paypal')")
    
    # Stripe-specific fields
    stripe_payment_intent_id = models.CharField(max_length=255, blank=True, null=True, help_text="Stripe PaymentIntent ID")
    stripe_charge_id = models.CharField(max_length=255, blank=True, null=True, help_text="Stripe Charge ID")
    stripe_customer_id = models.CharField(max_length=255, blank=True, null=True, help_text="Stripe Customer ID")
    stripe_subscription_id = models.CharField(max_length=255, blank=True, null=True, help_text="Stripe Subscription ID (if recurring)")
    stripe_invoice_id = models.CharField(max_length=255, blank=True, null=True, help_text="Stripe Invoice ID")
    stripe_payment_method_id = models.CharField(max_length=255, blank=True, null=True, help_text="Stripe PaymentMethod ID")
    
    # Stripe webhook and event tracking
    stripe_webhook_event_id = models.CharField(max_length=255, blank=True, null=True, help_text="Stripe webhook event ID for tracking")
    stripe_webhook_processed = models.BooleanField(default=False, help_text="Whether the Stripe webhook has been processed")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    paid_at = models.DateTimeField(blank=True, null=True, help_text="When the payment was completed")
    
    # Additional details
    description = models.TextField(blank=True, null=True, help_text="Additional payment details")
    metadata = models.JSONField(default=dict, blank=True, help_text="Additional payment metadata")
    
    # Stripe-specific metadata
    stripe_metadata = models.JSONField(default=dict, blank=True, help_text="Stripe-specific metadata and response data")
    
    class Meta:
        verbose_name = 'Payment'
        verbose_name_plural = 'Payments'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['transaction_id']),
            # Stripe-specific indexes
            models.Index(fields=['stripe_payment_intent_id']),
            models.Index(fields=['stripe_customer_id']),
            models.Index(fields=['stripe_subscription_id']),
            models.Index(fields=['stripe_webhook_event_id']),
            models.Index(fields=['stripe_webhook_processed']),
        ]

    def __str__(self):
        return f"Payment {self.id} - {self.user.username} - {self.amount} {self.currency} ({self.status})"

    def mark_as_completed(self, transaction_id=None, paid_at=None):
        """Mark payment as completed"""
        from django.utils import timezone
        self.status = 'completed'
        if transaction_id:
            self.transaction_id = transaction_id
        if paid_at:
            self.paid_at = paid_at
        else:
            self.paid_at = timezone.now()
        self.save()

    def mark_as_failed(self, description=None):
        """Mark payment as failed"""
        self.status = 'failed'
        if description:
            self.description = description
        self.save()

    def mark_as_cancelled(self):
        """Mark payment as cancelled"""
        self.status = 'cancelled'
        self.save()

    def is_active(self):
        """Check if payment is active (completed and not refunded)"""
        return self.status == 'completed'

    @property
    def is_paid(self):
        """Check if payment has been completed"""
        return self.status == 'completed'

    @property
    def formatted_amount(self):
        """Return formatted amount with currency"""
        return f"{self.amount} {self.currency}"

    # Stripe-specific methods
    def set_stripe_payment_intent(self, payment_intent_id):
        """Set Stripe PaymentIntent ID"""
        self.stripe_payment_intent_id = payment_intent_id
        self.payment_provider = 'stripe'
        self.save()

    def set_stripe_customer(self, customer_id):
        """Set Stripe Customer ID"""
        self.stripe_customer_id = customer_id
        self.save()

    def set_stripe_subscription(self, subscription_id):
        """Set Stripe Subscription ID"""
        self.stripe_subscription_id = subscription_id
        self.save()

    def mark_webhook_processed(self, event_id):
        """Mark webhook as processed"""
        self.stripe_webhook_event_id = event_id
        self.stripe_webhook_processed = True
        self.save()

    def is_stripe_payment(self):
        """Check if this is a Stripe payment"""
        return self.payment_provider == 'stripe'

    def has_stripe_payment_intent(self):
        """Check if payment has a Stripe PaymentIntent"""
        return bool(self.stripe_payment_intent_id)

    def get_stripe_metadata(self, key=None):
        """Get Stripe metadata"""
        if key:
            return self.stripe_metadata.get(key)
        return self.stripe_metadata

    def set_stripe_metadata(self, key, value):
        """Set Stripe metadata"""
        if not self.stripe_metadata:
            self.stripe_metadata = {}
        self.stripe_metadata[key] = value
        self.save()

    @classmethod
    def find_by_stripe_payment_intent(cls, payment_intent_id):
        """Find payment by Stripe PaymentIntent ID"""
        return cls.objects.filter(stripe_payment_intent_id=payment_intent_id).first()

    @classmethod
    def find_by_stripe_customer(cls, customer_id):
        """Find payments by Stripe Customer ID"""
        return cls.objects.filter(stripe_customer_id=customer_id)

    @classmethod
    def find_unprocessed_webhooks(cls):
        """Find payments with unprocessed webhooks"""
        return cls.objects.filter(
            stripe_webhook_event_id__isnull=False,
            stripe_webhook_processed=False
        )
