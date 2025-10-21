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

    class Meta:
        db_table = 'webapp_backend.profiles_profile'

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
        db_table = 'webapp_backend.profiles_pmsintegrationrequirement'
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
        db_table = 'webapp_backend.profiles_emailverificationcode'
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


class SupportTicket(models.Model):
    """
    Model to store support tickets with issue types, descriptions, and screenshots
    """
    ISSUE_TYPES = [
        ('general_question', 'General Question'),
        ('technical_issue', 'Technical Issue'),
        ('billing_question', 'Billing Question'),
        ('feature_request', 'Feature Request'),
        ('bug_report', 'Bug Report'),
    ]
    
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('in_progress', 'In Progress'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
    ]
    

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='support_tickets')
    issue_type = models.CharField(max_length=20, choices=ISSUE_TYPES, default='general_question')
    title = models.CharField(max_length=200, help_text="Brief title for the support ticket")
    description = models.TextField(help_text="Detailed description of the issue")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    screenshot = models.ImageField(upload_to='support_screenshots/', null=True, blank=True, help_text="Optional screenshot of the issue")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'webapp_backend.profiles_supportticket'
        verbose_name = 'Support Ticket'
        verbose_name_plural = 'Support Tickets'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"Support Ticket #{self.id} - {self.title} ({self.get_status_display()})"
    
    def mark_as_resolved(self):
        """Mark the ticket as resolved"""
        from django.utils import timezone
        self.status = 'resolved'
        self.resolved_at = timezone.now()
        self.save()
    
    def mark_as_closed(self):
        """Mark the ticket as closed"""
        self.status = 'closed'
        self.save()


class Payment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="payments")
    stripe_customer_id = models.CharField(max_length=255, default='', blank=True, null=True)
    stripe_subscription_id = models.CharField(max_length=255, default='', blank=True, null=True)
    stripe_session_id = models.CharField(max_length=255, default='', unique=True)
    amount_total = models.IntegerField(
        default=0,
        help_text="Stripe gives cents (e.g. 30000 = $300.00)"
    )
    currency = models.CharField(max_length=10, default='')
    payment_status = models.CharField(max_length=50, default='')  # e.g. "paid", "unpaid"
    status = models.CharField(max_length=50, default='')  # e.g. "complete", "open"
    created_at = models.DateTimeField(auto_now_add=True)
    email = models.EmailField(default='')
    invoice_id = models.CharField(max_length=255, default='', blank=True, null=True)
    # Stripe raw response for debugging (optional, but very useful)
    raw_response = models.JSONField(default=dict, blank=True, null=True)

    class Meta:
        db_table = 'webapp_backend.profiles_payment'

    def __str__(self):
        return f"Payment for {self.user.username} - {self.stripe_session_id}"


class Notification(models.Model):
    """
    Model to store user notifications with various types and statuses
    """
    NOTIFICATION_TYPES = [
        ('success', 'Success'),
        ('warning', 'Warning'),
        ('info', 'Info'),
        ('error', 'Error'),
    ]
    
    PRIORITY_LEVELS = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    CATEGORY_CHOICES = [
        ('pms', 'PMS Integration'),
        ('pricing', 'Pricing'),
        ('payment', 'Payment'),
        ('profile', 'Profile'),
        ('competitor', 'Competitor'),
        ('system', 'System'),
        ('general', 'General'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications', 
                           help_text="User who receives this notification")
    type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES, default='info',
                          help_text="Type of notification (success, warning, info, error)")
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='general',
                              help_text="Category of the notification")
    priority = models.CharField(max_length=20, choices=PRIORITY_LEVELS, default='medium',
                              help_text="Priority level of the notification")
    title = models.CharField(max_length=200, help_text="Notification title")
    description = models.TextField(help_text="Detailed description of the notification")
    
    # Status flags
    is_read = models.BooleanField(default=False, help_text="Whether the notification has been read")
    is_new = models.BooleanField(default=True, help_text="Whether the notification is new (unacknowledged)")
    
    # Optional action URL for clickable notifications
    action_url = models.CharField(max_length=500, blank=True, null=True,
                                 help_text="Optional URL for notification action")
    
    # Metadata for extensibility
    metadata = models.JSONField(default=dict, blank=True, null=True,
                               help_text="Additional metadata for the notification")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    read_at = models.DateTimeField(null=True, blank=True,
                                  help_text="Timestamp when notification was read")
    expires_at = models.DateTimeField(null=True, blank=True,
                                     help_text="Optional expiration timestamp for time-sensitive notifications")
    
    class Meta:
        db_table = 'webapp_backend.profiles_notification'
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read', 'created_at']),
            models.Index(fields=['user', 'is_new']),
            models.Index(fields=['user', 'category']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.get_type_display()} - {self.title} (User: {self.user.username})"
    
    def mark_as_read(self):
        """Mark notification as read"""
        from django.utils import timezone
        if not self.is_read:
            self.is_read = True
            self.is_new = False
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'is_new', 'read_at', 'updated_at'])
    
    def mark_as_unread(self):
        """Mark notification as unread"""
        if self.is_read:
            self.is_read = False
            self.is_new = True
            self.read_at = None
            self.save(update_fields=['is_read', 'is_new', 'read_at', 'updated_at'])
    
    def acknowledge(self):
        """Acknowledge notification (remove 'new' flag but keep as unread)"""
        if self.is_new:
            self.is_new = False
            self.save(update_fields=['is_new', 'updated_at'])
    
    def is_expired(self):
        """Check if notification has expired"""
        if not self.expires_at:
            return False
        from django.utils import timezone
        return timezone.now() > self.expires_at
    
    @classmethod
    def create_notification(cls, user, type, title, description, category='general', 
                          priority='medium', action_url=None, metadata=None, expires_at=None):
        """
        Convenience method to create a notification
        
        Args:
            user: User object or user ID
            type: Notification type (success, warning, info, error)
            title: Notification title
            description: Notification description
            category: Notification category (default: 'general')
            priority: Priority level (default: 'medium')
            action_url: Optional action URL
            metadata: Optional metadata dictionary
            expires_at: Optional expiration datetime
            
        Returns:
            Created Notification object
        """
        if isinstance(user, int):
            user = User.objects.get(id=user)
        
        notification = cls.objects.create(
            user=user,
            type=type,
            category=category,
            priority=priority,
            title=title,
            description=description,
            action_url=action_url,
            metadata=metadata or {},
            expires_at=expires_at
        )
        return notification
    
    @classmethod
    def get_user_unread_count(cls, user):
        """Get count of unread notifications for a user"""
        return cls.objects.filter(user=user, is_read=False).count()
    
    @classmethod
    def get_user_new_count(cls, user):
        """Get count of new notifications for a user"""
        return cls.objects.filter(user=user, is_new=True).count()
    
    @classmethod
    def mark_all_as_read(cls, user):
        """Mark all notifications as read for a user"""
        from django.utils import timezone
        now = timezone.now()
        return cls.objects.filter(user=user, is_read=False).update(
            is_read=True,
            is_new=False,
            read_at=now,
            updated_at=now
        )