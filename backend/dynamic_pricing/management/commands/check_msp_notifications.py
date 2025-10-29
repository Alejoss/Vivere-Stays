"""
Django management command to check MSP configuration and create notifications

This command can be run:
1. Manually: python manage.py check_msp_notifications
2. Via cron job: Daily at 9 AM
3. Via Celery Beat: Scheduled periodic task

Usage:
    python manage.py check_msp_notifications
    python manage.py check_msp_notifications --user-id 123
    python manage.py check_msp_notifications --property-id abc-123
"""

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from dynamic_pricing.models import Property
from dynamic_pricing.notification_triggers import (
    check_and_notify_msp_for_all_user_properties,
    check_and_notify_msp_status
)
import logging
from vivere_stays.logging_utils import get_logger, log_operation, LogLevel, LoggerNames

logger = get_logger(LoggerNames.DYNAMIC_PRICING)


class Command(BaseCommand):
    help = 'Check MSP configuration and create notifications for missing MSP'

    def add_arguments(self, parser):
        parser.add_argument(
            '--user-id',
            type=int,
            help='Check MSP for a specific user ID',
        )
        parser.add_argument(
            '--property-id',
            type=str,
            help='Check MSP for a specific property ID',
        )
        parser.add_argument(
            '--all-users',
            action='store_true',
            help='Check MSP for all users',
        )

    def handle(self, *args, **options):
        user_id = options.get('user_id')
        property_id = options.get('property_id')
        all_users = options.get('all_users')

        log_operation(
            logger, LogLevel.INFO,
            f"Starting MSP notification check command",
            "msp_check_command_start",
            None, None,
            user_id=user_id,
            property_id=property_id,
            all_users=all_users
        )

        try:
            if property_id:
                # Check specific property
                log_operation(
                    logger, LogLevel.INFO,
                    f"Checking MSP for specific property",
                    "msp_check_property",
                    None, None,
                    property_id=property_id
                )
                self.stdout.write(f"Checking MSP for property: {property_id}")
                
                try:
                    property_obj = Property.objects.get(id=property_id)
                    
                    # Get the property owner (first profile associated with property)
                    if property_obj.profiles.exists():
                        user = property_obj.profiles.first().user
                        result = check_and_notify_msp_status(user, property_obj)
                        
                        log_operation(
                            logger, LogLevel.INFO,
                            f"MSP check completed for property",
                            "msp_check_property_success",
                            None, user,
                            property_id=property_id,
                            property_name=property_obj.name,
                            notifications_created=result['count']
                        )
                        
                        self.stdout.write(
                            self.style.SUCCESS(
                                f"✓ Property {property_obj.name}: "
                                f"{result['count']} notification(s) created"
                            )
                        )
                    else:
                        log_operation(
                            logger, LogLevel.WARNING,
                            f"Property has no associated users",
                            "msp_check_property_no_users",
                            None, None,
                            property_id=property_id
                        )
                        self.stdout.write(
                            self.style.WARNING(
                                f"Property {property_id} has no associated users"
                            )
                        )
                        
                except Property.DoesNotExist:
                    log_operation(
                        logger, LogLevel.ERROR,
                        f"Property not found",
                        "msp_check_property_not_found",
                        None, None,
                        property_id=property_id
                    )
                    self.stdout.write(
                        self.style.ERROR(f"Property {property_id} not found")
                    )
                    return
                    
            elif user_id:
                # Check specific user
                self.stdout.write(f"Checking MSP for user ID: {user_id}")
                
                try:
                    user = User.objects.get(id=user_id)
                    result = check_and_notify_msp_for_all_user_properties(user)
                    
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"✓ User {user.username}: "
                            f"{result['total_notifications_created']} notification(s) created "
                            f"across {result['properties_checked']} property(ies)"
                        )
                    )
                    
                except User.DoesNotExist:
                    self.stdout.write(
                        self.style.ERROR(f"User {user_id} not found")
                    )
                    return
                    
            elif all_users:
                # Check all users
                self.stdout.write("Checking MSP for all users...")
                
                users = User.objects.filter(is_active=True)
                total_notifications = 0
                total_properties = 0
                users_with_notifications = 0
                
                for user in users:
                    try:
                        result = check_and_notify_msp_for_all_user_properties(user)
                        
                        if 'error' not in result:
                            notifications_count = result['total_notifications_created']
                            properties_count = result['properties_checked']
                            
                            total_notifications += notifications_count
                            total_properties += properties_count
                            
                            if notifications_count > 0:
                                users_with_notifications += 1
                                self.stdout.write(
                                    self.style.WARNING(
                                        f"  {user.username}: {notifications_count} notification(s) "
                                        f"across {properties_count} property(ies)"
                                    )
                                )
                        else:
                            self.stdout.write(
                                self.style.ERROR(
                                    f"  Error checking user {user.username}: {result['error']}"
                                )
                            )
                            
                    except Exception as e:
                        self.stdout.write(
                            self.style.ERROR(
                                f"  Error processing user {user.username}: {str(e)}"
                            )
                        )
                        logger.error(f"Error processing user {user.username}: {str(e)}", exc_info=True)
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f"\n✓ Completed: {total_notifications} notification(s) created "
                        f"for {users_with_notifications} user(s) "
                        f"across {total_properties} property(ies)"
                    )
                )
                
            else:
                # No specific option provided, show help
                self.stdout.write(
                    self.style.WARNING(
                        "Please specify an option:\n"
                        "  --user-id <id>     Check specific user\n"
                        "  --property-id <id> Check specific property\n"
                        "  --all-users        Check all users"
                    )
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Command failed: {str(e)}")
            )
            logger.error(f"MSP notification check command failed: {str(e)}", exc_info=True)
            raise

