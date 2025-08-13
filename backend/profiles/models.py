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
