"""
Dynamic Pricing Notification Triggers

This module contains functions that check for specific conditions in the dynamic pricing
system and create notifications when those conditions are met.

These functions should be called:
1. On login/dashboard load
2. Via scheduled tasks (cron jobs or Celery)
3. After specific actions (e.g., after updating property settings)
"""

import logging
from datetime import datetime, timedelta
from django.utils import timezone
from django.contrib.auth.models import User
from profiles.notification_utils import create_notification

logger = logging.getLogger(__name__)


def check_msp_for_date_range(property_obj, start_date, end_date):
    """
    Check if MSP is configured for a date range
    
    Args:
        property_obj: Property object
        start_date: Start date to check
        end_date: End date to check
        
    Returns:
        tuple: (has_msp, missing_dates)
            - has_msp: Boolean indicating if MSP exists for entire range
            - missing_dates: List of dates without MSP coverage
    """
    from .models import DpMinimumSellingPrice
    
    missing_dates = []
    current_date = start_date
    
    while current_date <= end_date:
        # Check if there's an MSP entry covering this date
        msp_exists = DpMinimumSellingPrice.objects.filter(
            property_id=property_obj,
            valid_from__lte=current_date,
            valid_until__gte=current_date
        ).exists()
        
        if not msp_exists:
            missing_dates.append(current_date)
        
        current_date += timedelta(days=1)
    
    has_msp = len(missing_dates) == 0
    return has_msp, missing_dates


def check_msp_configured_today(property_obj):
    """
    Check if MSP is configured for today
    
    Args:
        property_obj: Property object
        
    Returns:
        Boolean: True if MSP exists for today
    """
    from .models import DpMinimumSellingPrice
    
    today = timezone.now().date()
    
    msp_exists = DpMinimumSellingPrice.objects.filter(
        property_id=property_obj,
        valid_from__lte=today,
        valid_until__gte=today
    ).exists()
    
    return msp_exists


def check_msp_configured_next_week(property_obj):
    """
    Check if MSP is configured for next week (next 7 days)
    
    Args:
        property_obj: Property object
        
    Returns:
        tuple: (has_complete_coverage, missing_dates)
            - has_complete_coverage: Boolean indicating if all 7 days have MSP
            - missing_dates: List of dates without MSP coverage
    """
    from .models import DpMinimumSellingPrice
    
    today = timezone.now().date()
    next_week_start = today + timedelta(days=1)
    next_week_end = today + timedelta(days=7)
    
    return check_msp_for_date_range(property_obj, next_week_start, next_week_end)


def check_msp_configured_next_month(property_obj):
    """
    Check if MSP is configured for next calendar month
    
    Args:
        property_obj: Property object
        
    Returns:
        tuple: (has_complete_coverage, missing_dates)
            - has_complete_coverage: Boolean indicating if all days in next month have MSP
            - missing_dates: List of dates without MSP coverage
    """
    from .models import DpMinimumSellingPrice
    import calendar
    
    today = timezone.now().date()
    
    # Get first day of next month
    if today.month == 12:
        next_month_start = today.replace(year=today.year + 1, month=1, day=1)
    else:
        next_month_start = today.replace(month=today.month + 1, day=1)
    
    # Get last day of next month
    if next_month_start.month == 12:
        next_month_end = next_month_start.replace(year=next_month_start.year + 1, month=1, day=1) - timedelta(days=1)
    else:
        next_month_end = next_month_start.replace(month=next_month_start.month + 1, day=1) - timedelta(days=1)
    
    return check_msp_for_date_range(property_obj, next_month_start, next_month_end)


def trigger_msp_not_configured_today_notification(user, property_obj):
    """
    Create a notification if MSP is not configured for today
    
    Args:
        user: User object
        property_obj: Property object
        
    Returns:
        Notification object if created, None otherwise
    """
    today = timezone.now().date()
    
    # Check if MSP exists for today
    has_msp = check_msp_configured_today(property_obj)
    
    if not has_msp:
        # Check if we already sent this notification recently (within last 24 hours)
        from profiles.models import Notification
        recent_notification = Notification.objects.filter(
            user=user,
            category='pricing',
            title__icontains='MSP not configured for today',
            created_at__gte=timezone.now() - timedelta(hours=24)
        ).exists()
        
        if recent_notification:
            logger.info(f"MSP today notification already sent recently for user {user.username}, property {property_obj.id}")
            return None
        
        # Create notification
        notification = create_notification(
            user=user,
            notification_type='warning',
            title='MSP not configured for today',
            description=f"You don't have a Minimum Selling Price (MSP) configured for today ({today.strftime('%B %d, %Y')}). Set it up now to ensure proper pricing.",
            category='pricing',
            priority='high',
            action_url=f'/dashboard/properties/{property_obj.id}/msp',
            metadata={
                'property_id': str(property_obj.id),
                'property_name': property_obj.name,
                'date': today.isoformat(),
                'notification_type': 'msp_missing_today'
            }
        )
        
        logger.info(f"Created MSP today notification for user {user.username}, property {property_obj.id}")
        return notification
    
    return None


def trigger_msp_not_configured_next_week_notification(user, property_obj):
    """
    Create a notification if MSP is not configured for next week
    
    Args:
        user: User object
        property_obj: Property object
        
    Returns:
        Notification object if created, None otherwise
    """
    today = timezone.now().date()
    next_week_start = today + timedelta(days=1)
    next_week_end = today + timedelta(days=7)
    
    # Check if MSP exists for the next 7 days
    has_complete_coverage, missing_dates = check_msp_configured_next_week(property_obj)
    
    if not has_complete_coverage:
        # Check if we already sent this notification recently (within last 24 hours)
        from profiles.models import Notification
        recent_notification = Notification.objects.filter(
            user=user,
            category='pricing',
            title__icontains='MSP not configured for next week',
            created_at__gte=timezone.now() - timedelta(hours=24)
        ).exists()
        
        if recent_notification:
            logger.info(f"MSP next week notification already sent recently for user {user.username}, property {property_obj.id}")
            return None
        
        # Calculate how many days are missing
        missing_days_count = len(missing_dates)
        
        if missing_days_count == 7:
            description = f"You don't have a Minimum Selling Price (MSP) configured for next week ({next_week_start.strftime('%b %d')} - {next_week_end.strftime('%b %d, %Y')}). We recommend setting it up to optimize your revenue."
        else:
            description = f"You're missing MSP configuration for {missing_days_count} day(s) in the next week. Complete your MSP setup to optimize revenue."
        
        # Create notification
        notification = create_notification(
            user=user,
            notification_type='warning',
            title='MSP not configured for next week',
            description=description,
            category='pricing',
            priority='medium',
            action_url=f'/dashboard/properties/{property_obj.id}/msp',
            metadata={
                'property_id': str(property_obj.id),
                'property_name': property_obj.name,
                'start_date': next_week_start.isoformat(),
                'end_date': next_week_end.isoformat(),
                'missing_days_count': missing_days_count,
                'missing_dates': [d.isoformat() for d in missing_dates],
                'notification_type': 'msp_missing_next_week'
            }
        )
        
        logger.info(f"Created MSP next week notification for user {user.username}, property {property_obj.id}")
        return notification
    
    return None


def trigger_msp_not_configured_next_month_notification(user, property_obj):
    """
    Create a notification if MSP is not configured for next calendar month
    
    Args:
        user: User object
        property_obj: Property object
        
    Returns:
        Notification object if created, None otherwise
    """
    today = timezone.now().date()
    
    # Get first day of next month
    if today.month == 12:
        next_month_start = today.replace(year=today.year + 1, month=1, day=1)
    else:
        next_month_start = today.replace(month=today.month + 1, day=1)
    
    # Get last day of next month
    if next_month_start.month == 12:
        next_month_end = next_month_start.replace(year=next_month_start.year + 1, month=1, day=1) - timedelta(days=1)
    else:
        next_month_end = next_month_start.replace(month=next_month_start.month + 1, day=1) - timedelta(days=1)
    
    # Check if MSP exists for the next calendar month
    has_complete_coverage, missing_dates = check_msp_configured_next_month(property_obj)
    
    if not has_complete_coverage:
        # Check if we already sent this notification recently (within last 24 hours)
        from profiles.models import Notification
        recent_notification = Notification.objects.filter(
            user=user,
            category='pricing',
            title__icontains='MSP not configured for next month',
            created_at__gte=timezone.now() - timedelta(hours=24)
        ).exists()
        
        if recent_notification:
            logger.info(f"MSP next month notification already sent recently for user {user.username}, property {property_obj.id}")
            return None
        
        # Calculate how many days are missing
        missing_days_count = len(missing_dates)
        total_days_in_month = (next_month_end - next_month_start).days + 1
        
        if missing_days_count == total_days_in_month:
            description = f"You don't have a Minimum Selling Price (MSP) configured for next month ({next_month_start.strftime('%B %Y')}). Consider setting it up to stay ahead."
        else:
            description = f"You're missing MSP configuration for {missing_days_count} day(s) in next month ({next_month_start.strftime('%B %Y')}). Complete your MSP setup to stay ahead."
        
        # Create notification
        notification = create_notification(
            user=user,
            notification_type='warning',
            title='MSP not configured for next month',
            description=description,
            category='pricing',
            priority='low',
            action_url=f'/dashboard/properties/{property_obj.id}/msp',
            metadata={
                'property_id': str(property_obj.id),
                'property_name': property_obj.name,
                'start_date': next_month_start.isoformat(),
                'end_date': next_month_end.isoformat(),
                'missing_days_count': missing_days_count,
                'missing_dates': [d.isoformat() for d in missing_dates],
                'notification_type': 'msp_missing_next_month'
            }
        )
        
        logger.info(f"Created MSP next month notification for user {user.username}, property {property_obj.id}")
        return notification
    
    return None


def check_and_notify_msp_status(user, property_obj):
    """
    Check MSP status for a property and create notifications if needed
    
    This is a convenience function that checks today, next week, and next month.
    
    Args:
        user: User object
        property_obj: Property object
        
    Returns:
        dict: Summary of notifications created
    """
    notifications_created = []
    
    # Check today
    today_notification = trigger_msp_not_configured_today_notification(user, property_obj)
    if today_notification:
        notifications_created.append({
            'type': 'msp_missing_today',
            'notification_id': today_notification.id
        })
    
    # Check next week
    next_week_notification = trigger_msp_not_configured_next_week_notification(user, property_obj)
    if next_week_notification:
        notifications_created.append({
            'type': 'msp_missing_next_week',
            'notification_id': next_week_notification.id
        })
    
    # Check next month
    next_month_notification = trigger_msp_not_configured_next_month_notification(user, property_obj)
    if next_month_notification:
        notifications_created.append({
            'type': 'msp_missing_next_month',
            'notification_id': next_month_notification.id
        })
    
    return {
        'property_id': str(property_obj.id),
        'property_name': property_obj.name,
        'notifications_created': notifications_created,
        'count': len(notifications_created)
    }


def check_and_notify_msp_for_all_user_properties(user):
    """
    Check MSP status for all properties owned by a user
    
    Args:
        user: User object
        
    Returns:
        dict: Summary of all notifications created
    """
    try:
        profile = user.profile
        properties = profile.get_properties()
        
        results = []
        total_notifications = 0
        
        for property_obj in properties:
            result = check_and_notify_msp_status(user, property_obj)
            results.append(result)
            total_notifications += result['count']
        
        logger.info(f"MSP check completed for user {user.username}: {total_notifications} notifications created across {properties.count()} properties")
        
        return {
            'user_id': user.id,
            'username': user.username,
            'properties_checked': properties.count(),
            'total_notifications_created': total_notifications,
            'details': results
        }
        
    except Exception as e:
        logger.error(f"Error checking MSP status for user {user.username}: {str(e)}", exc_info=True)
        return {
            'user_id': user.id,
            'username': user.username,
            'error': str(e)
        }


def trigger_booking_url_not_configured_notification(user):
    """
    Create a notification if any of the user's properties don't have booking URLs configured
    
    Args:
        user: User object
        
    Returns:
        Notification object if created, None otherwise
    """
    try:
        profile = user.profile
        properties = profile.get_properties()
        
        if not properties.exists():
            logger.info(f"User {user.username} has no properties, skipping booking URL check")
            return None
        
        # Check for properties without booking URLs
        properties_without_booking_url = properties.filter(
            booking_hotel_url__isnull=True
        ) | properties.filter(
            booking_hotel_url__exact=''
        )
        
        if not properties_without_booking_url.exists():
            logger.info(f"All properties for user {user.username} have booking URLs configured")
            return None
        
        # Check if we already sent this notification recently (within last 24 hours)
        from profiles.models import Notification
        recent_notification = Notification.objects.filter(
            user=user,
            category='profile',
            title__icontains='Booking URL not configured',
            created_at__gte=timezone.now() - timedelta(hours=24)
        ).exists()
        
        if recent_notification:
            logger.info(f"Booking URL notification already sent recently for user {user.username}")
            return None
        
        # Create notification
        properties_count = properties_without_booking_url.count()
        property_names = list(properties_without_booking_url.values_list('name', flat=True))
        
        if properties_count == 1:
            description = f"Your property '{property_names[0]}' doesn't have a booking URL configured. Add it to enable better pricing insights."
        else:
            description = f"You have {properties_count} properties without booking URLs configured. Add them to enable better pricing insights."
        
        notification = create_notification(
            user=user,
            notification_type='info',
            title='Booking URL not configured',
            description=description,
            category='profile',
            priority='low',
            action_url='/dashboard/properties',
            metadata={
                'properties_without_booking_url': property_names,
                'count': properties_count,
                'notification_type': 'booking_url_missing'
            }
        )
        
        logger.info(f"Created booking URL notification for user {user.username}")
        return notification
        
    except Exception as e:
        logger.error(f"Error checking booking URL status for user {user.username}: {str(e)}", exc_info=True)
        return None


def check_msp_for_upcoming_period(property_obj, days_ahead=30):
    """
    Check MSP coverage for upcoming period (default 30 days)
    
    Args:
        property_obj: Property object
        days_ahead: Number of days to check ahead
        
    Returns:
        dict: Coverage statistics
    """
    from .models import DpMinimumSellingPrice
    
    today = timezone.now().date()
    end_date = today + timedelta(days=days_ahead)
    
    has_complete_coverage, missing_dates = check_msp_for_date_range(
        property_obj, 
        today, 
        end_date
    )
    
    # Calculate coverage percentage
    total_days = days_ahead
    covered_days = total_days - len(missing_dates)
    coverage_percentage = (covered_days / total_days) * 100
    
    return {
        'property_id': str(property_obj.id),
        'property_name': property_obj.name,
        'period_start': today.isoformat(),
        'period_end': end_date.isoformat(),
        'total_days': total_days,
        'covered_days': covered_days,
        'missing_days': len(missing_dates),
        'coverage_percentage': round(coverage_percentage, 2),
        'has_complete_coverage': has_complete_coverage,
        'missing_dates': [d.isoformat() for d in missing_dates[:10]]  # Limit to first 10
    }


def trigger_special_offer_started_notification(user):
    """
    Create notifications for special offers that have started today or recently
    
    Checks all user properties for special offers where:
    - valid_from is today or within the last 24 hours
    - No notification was sent in the last 24 hours
    
    Returns:
        list: List of created notifications
    """
    try:
        profile = user.profile
        properties = profile.get_properties()
        
        if not properties.exists():
            logger.info(f"User {user.username} has no properties, skipping special offer started check")
            return []
        
        today = timezone.now().date()
        notifications_created = []
        
        # Check each property for offers that started today
        for property_obj in properties:
            from .models import DpOfferIncrements
            
            # Find offers that started today
            started_offers = DpOfferIncrements.objects.filter(
                property_id=property_obj,
                valid_from=today
            )
            
            for offer in started_offers:
                # Check if we already sent this notification recently (within last 24 hours)
                from profiles.models import Notification
                recent_notification = Notification.objects.filter(
                    user=user,
                    category='pricing',
                    title__icontains='Special offer has started',
                    metadata__offer_id=offer.id,
                    created_at__gte=timezone.now() - timedelta(hours=24)
                ).exists()
                
                if recent_notification:
                    logger.info(f"Special offer started notification already sent recently for user {user.username}, offer {offer.id}")
                    continue
                
                # Create notification
                notification = create_notification(
                    user=user,
                    notification_type='success',
                    title='Special offer has started',
                    description=f'Your special offer "{offer.offer_name}" is now active for {property_obj.name}',
                    category='pricing',
                    priority='medium',
                    action_url='/dashboard/special-offers',
                    metadata={
                        'offer_id': offer.id,
                        'offer_name': offer.offer_name,
                        'property_id': str(property_obj.id),
                        'property_name': property_obj.name,
                        'valid_from': offer.valid_from.isoformat(),
                        'valid_until': offer.valid_until.isoformat(),
                        'increment_type': offer.increment_type,
                        'increment_value': offer.increment_value,
                        'notification_type': 'special_offer_started'
                    }
                )
                
                notifications_created.append(notification)
                logger.info(f"Created special offer started notification for user {user.username}, offer {offer.id}")
        
        return notifications_created
        
    except Exception as e:
        logger.error(f"Error checking special offer started status for user {user.username}: {str(e)}", exc_info=True)
        return []


def trigger_special_offer_ended_notification(user):
    """
    Create notifications for special offers that ended today or recently
    
    Checks all user properties for special offers where:
    - valid_until is today or within the last 24 hours
    - No notification was sent in the last 24 hours
    
    Returns:
        list: List of created notifications
    """
    try:
        profile = user.profile
        properties = profile.get_properties()
        
        if not properties.exists():
            logger.info(f"User {user.username} has no properties, skipping special offer ended check")
            return []
        
        today = timezone.now().date()
        notifications_created = []
        
        # Check each property for offers that ended today
        for property_obj in properties:
            from .models import DpOfferIncrements
            
            # Find offers that ended today
            ended_offers = DpOfferIncrements.objects.filter(
                property_id=property_obj,
                valid_until=today
            )
            
            for offer in ended_offers:
                # Check if we already sent this notification recently (within last 24 hours)
                from profiles.models import Notification
                recent_notification = Notification.objects.filter(
                    user=user,
                    category='pricing',
                    title__icontains='Special offer has ended',
                    metadata__offer_id=offer.id,
                    created_at__gte=timezone.now() - timedelta(hours=24)
                ).exists()
                
                if recent_notification:
                    logger.info(f"Special offer ended notification already sent recently for user {user.username}, offer {offer.id}")
                    continue
                
                # Create notification
                notification = create_notification(
                    user=user,
                    notification_type='info',
                    title='Special offer has ended',
                    description=f'Your special offer "{offer.offer_name}" has ended for {property_obj.name}',
                    category='pricing',
                    priority='low',
                    action_url='/dashboard/special-offers',
                    metadata={
                        'offer_id': offer.id,
                        'offer_name': offer.offer_name,
                        'property_id': str(property_obj.id),
                        'property_name': property_obj.name,
                        'valid_from': offer.valid_from.isoformat(),
                        'valid_until': offer.valid_until.isoformat(),
                        'increment_type': offer.increment_type,
                        'increment_value': offer.increment_value,
                        'notification_type': 'special_offer_ended'
                    }
                )
                
                notifications_created.append(notification)
                logger.info(f"Created special offer ended notification for user {user.username}, offer {offer.id}")
        
        return notifications_created
        
    except Exception as e:
        logger.error(f"Error checking special offer ended status for user {user.username}: {str(e)}", exc_info=True)
        return []

