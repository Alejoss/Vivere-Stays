"""
Notification Utilities

This module provides helper functions for creating and managing notifications
throughout the application. Use these utilities instead of directly creating
Notification objects for consistency and ease of use.

Example usage:
    from profiles.notification_utils import create_notification
    
    # Create a success notification
    create_notification(
        user=request.user,
        notification_type='success',
        title='PMS connection restored',
        description='The connection to your PMS system has been successfully restored.',
        category='pms'
    )
"""

import logging
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from profiles.models import Notification

logger = logging.getLogger(__name__)


def create_notification(user, notification_type, title, description, 
                       category='general', priority='medium', action_url=None, 
                       metadata=None, expires_in_days=None):
    """
    Create a notification for a user
    
    Args:
        user: User object or user ID
        notification_type: Type of notification ('success', 'warning', 'info', 'error')
        title: Notification title (max 200 chars)
        description: Detailed description
        category: Category ('pms', 'pricing', 'payment', 'profile', 'competitor', 'system', 'general')
        priority: Priority level ('low', 'medium', 'high', 'urgent')
        action_url: Optional URL for notification action
        metadata: Optional dictionary with additional data
        expires_in_days: Optional number of days until notification expires
        
    Returns:
        Created Notification object or None if failed
    """
    try:
        # Handle user ID
        if isinstance(user, int):
            user = User.objects.get(id=user)
        
        # Calculate expiration if provided
        expires_at = None
        if expires_in_days:
            expires_at = timezone.now() + timedelta(days=expires_in_days)
        
        # Create notification
        notification = Notification.create_notification(
            user=user,
            type=notification_type,
            title=title,
            description=description,
            category=category,
            priority=priority,
            action_url=action_url,
            metadata=metadata or {},
            expires_at=expires_at
        )
        
        logger.info(f"Notification created: {notification.id} for user {user.username}")
        return notification
        
    except Exception as e:
        logger.error(f"Failed to create notification for user {user}: {str(e)}", exc_info=True)
        return None


def create_pms_notification(user, title, description, notification_type='info', 
                           priority='medium', action_url=None):
    """
    Create a PMS-related notification
    
    Args:
        user: User object or user ID
        title: Notification title
        description: Detailed description
        notification_type: Type of notification (default: 'info')
        priority: Priority level (default: 'medium')
        action_url: Optional URL for notification action
        
    Returns:
        Created Notification object or None if failed
    """
    return create_notification(
        user=user,
        notification_type=notification_type,
        title=title,
        description=description,
        category='pms',
        priority=priority,
        action_url=action_url
    )


def create_pricing_notification(user, title, description, notification_type='info', 
                               priority='medium', action_url=None, metadata=None):
    """
    Create a pricing-related notification
    
    Args:
        user: User object or user ID
        title: Notification title
        description: Detailed description
        notification_type: Type of notification (default: 'info')
        priority: Priority level (default: 'medium')
        action_url: Optional URL for notification action
        metadata: Optional dictionary with pricing data
        
    Returns:
        Created Notification object or None if failed
    """
    return create_notification(
        user=user,
        notification_type=notification_type,
        title=title,
        description=description,
        category='pricing',
        priority=priority,
        action_url=action_url,
        metadata=metadata
    )


def create_competitor_notification(user, title, description, competitor_name=None,
                                  notification_type='warning', priority='medium', 
                                  action_url=None):
    """
    Create a competitor-related notification
    
    Args:
        user: User object or user ID
        title: Notification title
        description: Detailed description
        competitor_name: Name of the competitor (stored in metadata)
        notification_type: Type of notification (default: 'warning')
        priority: Priority level (default: 'medium')
        action_url: Optional URL for notification action
        
    Returns:
        Created Notification object or None if failed
    """
    metadata = {}
    if competitor_name:
        metadata['competitor_name'] = competitor_name
    
    return create_notification(
        user=user,
        notification_type=notification_type,
        title=title,
        description=description,
        category='competitor',
        priority=priority,
        action_url=action_url,
        metadata=metadata
    )


def create_payment_notification(user, title, description, notification_type='info',
                               priority='high', action_url=None, metadata=None):
    """
    Create a payment-related notification
    
    Args:
        user: User object or user ID
        title: Notification title
        description: Detailed description
        notification_type: Type of notification (default: 'info')
        priority: Priority level (default: 'high')
        action_url: Optional URL for notification action
        metadata: Optional dictionary with payment data
        
    Returns:
        Created Notification object or None if failed
    """
    return create_notification(
        user=user,
        notification_type=notification_type,
        title=title,
        description=description,
        category='payment',
        priority=priority,
        action_url=action_url,
        metadata=metadata
    )


def create_profile_notification(user, title, description, notification_type='info',
                               priority='low', action_url=None):
    """
    Create a profile-related notification
    
    Args:
        user: User object or user ID
        title: Notification title
        description: Detailed description
        notification_type: Type of notification (default: 'info')
        priority: Priority level (default: 'low')
        action_url: Optional URL for notification action
        
    Returns:
        Created Notification object or None if failed
    """
    return create_notification(
        user=user,
        notification_type=notification_type,
        title=title,
        description=description,
        category='profile',
        priority=priority,
        action_url=action_url
    )


def create_system_notification(user, title, description, notification_type='info',
                              priority='medium', action_url=None):
    """
    Create a system-related notification
    
    Args:
        user: User object or user ID
        title: Notification title
        description: Detailed description
        notification_type: Type of notification (default: 'info')
        priority: Priority level (default: 'medium')
        action_url: Optional URL for notification action
        
    Returns:
        Created Notification object or None if failed
    """
    return create_notification(
        user=user,
        notification_type=notification_type,
        title=title,
        description=description,
        category='system',
        priority=priority,
        action_url=action_url
    )


def bulk_create_notifications(users, notification_type, title, description,
                             category='general', priority='medium', action_url=None):
    """
    Create the same notification for multiple users
    
    Args:
        users: List of User objects or user IDs
        notification_type: Type of notification
        title: Notification title
        description: Detailed description
        category: Category (default: 'general')
        priority: Priority level (default: 'medium')
        action_url: Optional URL for notification action
        
    Returns:
        List of created Notification objects
    """
    notifications = []
    
    for user in users:
        notification = create_notification(
            user=user,
            notification_type=notification_type,
            title=title,
            description=description,
            category=category,
            priority=priority,
            action_url=action_url
        )
        if notification:
            notifications.append(notification)
    
    logger.info(f"Bulk created {len(notifications)} notifications for {len(users)} users")
    return notifications


def delete_expired_notifications():
    """
    Delete all expired notifications from the database
    
    Returns:
        Number of deleted notifications
    """
    try:
        now = timezone.now()
        expired = Notification.objects.filter(expires_at__lt=now)
        count = expired.count()
        expired.delete()
        
        logger.info(f"Deleted {count} expired notifications")
        return count
        
    except Exception as e:
        logger.error(f"Failed to delete expired notifications: {str(e)}", exc_info=True)
        return 0


def get_user_notification_summary(user):
    """
    Get a summary of notifications for a user
    
    Args:
        user: User object
        
    Returns:
        Dictionary with notification statistics
    """
    try:
        total = Notification.objects.filter(user=user).count()
        unread = Notification.get_user_unread_count(user)
        new = Notification.get_user_new_count(user)
        
        by_category = {}
        for category, _ in Notification.CATEGORY_CHOICES:
            count = Notification.objects.filter(user=user, category=category).count()
            if count > 0:
                by_category[category] = count
        
        by_priority = {}
        for priority, _ in Notification.PRIORITY_LEVELS:
            count = Notification.objects.filter(
                user=user, 
                priority=priority, 
                is_read=False
            ).count()
            if count > 0:
                by_priority[priority] = count
        
        return {
            'total': total,
            'unread': unread,
            'new': new,
            'by_category': by_category,
            'unread_by_priority': by_priority
        }
        
    except Exception as e:
        logger.error(f"Failed to get notification summary for user {user.username}: {str(e)}", exc_info=True)
        return {}

