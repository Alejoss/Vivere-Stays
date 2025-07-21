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
