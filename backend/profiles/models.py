from datetime import datetime

from django.db import models
from django.contrib.auth.models import User


def upload_profile_picture(instance, filename):
    return "profile_pictures/" + instance.user.username + "_" + datetime.today().strftime('%h-%d-%y') + ".jpeg"


class Profile(models.Model):
    # Represents user profiles with basic authentication-related fields, timezone, and profile picture.

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    timezone = models.CharField(max_length=30, blank=True)
    profile_picture = models.ImageField(upload_to=upload_profile_picture, null=True, blank=True)
    receive_updates = models.BooleanField(default=False, help_text="Whether the user wants to receive email updates")

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
