# Notification System Documentation

## Overview

The notification system provides a comprehensive way to send, manage, and track user notifications throughout the Vivere Stays application. It supports multiple notification types, categories, priorities, and includes features like read/unread status, expiration, and custom metadata.

## Table of Contents

1. [Model Structure](#model-structure)
2. [API Endpoints](#api-endpoints)
3. [Using Notification Utilities](#using-notification-utilities)
4. [Frontend Integration](#frontend-integration)
5. [Best Practices](#best-practices)

---

## Model Structure

### Notification Model

The `Notification` model includes the following key fields:

- **user**: ForeignKey to User (who receives the notification)
- **type**: Notification type (`success`, `warning`, `info`, `error`)
- **category**: Classification (`pms`, `pricing`, `payment`, `profile`, `competitor`, `system`, `general`)
- **priority**: Priority level (`low`, `medium`, `high`, `urgent`)
- **title**: Brief notification title (max 200 chars)
- **description**: Detailed description
- **is_read**: Boolean indicating if notification has been read
- **is_new**: Boolean indicating if notification is newly created (unacknowledged)
- **action_url**: Optional URL for clickable notifications
- **metadata**: JSON field for additional custom data
- **created_at**: Timestamp of creation
- **updated_at**: Timestamp of last update
- **read_at**: Timestamp when notification was read
- **expires_at**: Optional expiration timestamp

---

## API Endpoints

All endpoints are prefixed with `/api/profiles/notifications/`

### 1. List/Create Notifications

**GET `/api/profiles/notifications/`**

Get notifications for the authenticated user with optional filters.

**Query Parameters:**
- `filter`: `all` (default), `unread`, `read`, `new`
- `category`: Filter by category
- `priority`: Filter by priority
- `limit`: Number of notifications to return (default: 50)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "notifications": [
    {
      "id": 1,
      "user": 1,
      "type": "success",
      "type_display": "Success",
      "category": "pms",
      "category_display": "PMS Integration",
      "priority": "medium",
      "priority_display": "Medium",
      "title": "PMS connection restored",
      "description": "The connection to your PMS system has been successfully restored.",
      "is_read": false,
      "is_new": true,
      "action_url": "/dashboard/pms",
      "metadata": {},
      "created_at": "2024-10-08T10:20:00Z",
      "updated_at": "2024-10-08T10:20:00Z",
      "read_at": null,
      "expires_at": null,
      "timestamp": "10/08/2024, 10:20:00 AM",
      "is_expired": false
    }
  ],
  "total_count": 10,
  "unread_count": 5,
  "new_count": 3,
  "limit": 50,
  "offset": 0
}
```

**POST `/api/profiles/notifications/`**

Create a new notification for the authenticated user.

**Request Body:**
```json
{
  "type": "success",
  "category": "pms",
  "priority": "medium",
  "title": "PMS connection restored",
  "description": "The connection to your PMS system has been successfully restored.",
  "action_url": "/dashboard/pms",
  "metadata": {"connection_id": "123"},
  "expires_at": "2024-12-31T23:59:59Z"
}
```

### 2. Get Single Notification

**GET `/api/profiles/notifications/<notification_id>/`**

Get details of a specific notification.

### 3. Update Notification

**PATCH `/api/profiles/notifications/<notification_id>/`**

Update notification status (mark as read/unread).

**Request Body:**
```json
{
  "is_read": true,
  "is_new": false
}
```

### 4. Delete Notification

**DELETE `/api/profiles/notifications/<notification_id>/`**

Delete a specific notification.

### 5. Mark All as Read

**POST `/api/profiles/notifications/mark-all-read/`**

Mark all notifications as read for the authenticated user.

**Response:**
```json
{
  "message": "All notifications marked as read",
  "updated_count": 5
}
```

### 6. Get Unread Count

**GET `/api/profiles/notifications/unread-count/`**

Get count of unread and new notifications.

**Response:**
```json
{
  "unread_count": 5,
  "new_count": 3
}
```

---

## Using Notification Utilities

The `notification_utils.py` module provides helper functions for creating notifications programmatically.

### Basic Usage

```python
from profiles.notification_utils import create_notification

# Create a basic notification
create_notification(
    user=request.user,
    notification_type='success',
    title='PMS connection restored',
    description='The connection to your PMS system has been successfully restored.',
    category='pms',
    priority='medium'
)
```

### Category-Specific Functions

#### PMS Notifications

```python
from profiles.notification_utils import create_pms_notification

create_pms_notification(
    user=user,
    title='PMS connection restored',
    description='The connection to your PMS system has been successfully restored.',
    notification_type='success',
    priority='medium',
    action_url='/dashboard/pms'
)
```

#### Pricing Notifications

```python
from profiles.notification_utils import create_pricing_notification

create_pricing_notification(
    user=user,
    title='Prices updated',
    description='Weekend prices have been successfully updated in your PMS.',
    notification_type='success',
    priority='medium',
    metadata={'property_id': property_id, 'rooms_updated': 15}
)
```

#### Competitor Notifications

```python
from profiles.notification_utils import create_competitor_notification

create_competitor_notification(
    user=user,
    title='Competitor with lower prices',
    description='Hotel La Canela has reduced their prices by 15% for the next two weeks.',
    competitor_name='Hotel La Canela',
    notification_type='warning',
    priority='high',
    action_url='/dashboard/competitors'
)
```

#### Payment Notifications

```python
from profiles.notification_utils import create_payment_notification

create_payment_notification(
    user=user,
    title='Payment successful',
    description='Your subscription payment has been processed successfully.',
    notification_type='success',
    priority='high',
    metadata={'amount': 299.99, 'currency': 'USD'}
)
```

#### Profile Notifications

```python
from profiles.notification_utils import create_profile_notification

create_profile_notification(
    user=user,
    title='Incomplete profile',
    description='Your hotel profile is incomplete. Complete the missing information.',
    notification_type='info',
    priority='low',
    action_url='/dashboard/profile'
)
```

### Bulk Notifications

```python
from profiles.notification_utils import bulk_create_notifications

# Send notification to multiple users
users = User.objects.filter(profile__selected_plan='premium')
bulk_create_notifications(
    users=users,
    notification_type='info',
    title='New feature available',
    description='A new pricing optimization feature is now available!',
    category='system',
    priority='medium',
    action_url='/dashboard/features'
)
```

### Notification Summary

```python
from profiles.notification_utils import get_user_notification_summary

# Get notification statistics for a user
summary = get_user_notification_summary(user)
# Returns:
# {
#     'total': 10,
#     'unread': 5,
#     'new': 3,
#     'by_category': {'pms': 3, 'pricing': 2, 'competitor': 5},
#     'unread_by_priority': {'high': 2, 'medium': 3}
# }
```

### Cleanup Expired Notifications

```python
from profiles.notification_utils import delete_expired_notifications

# Delete all expired notifications (can be run as a cron job)
deleted_count = delete_expired_notifications()
```

---

## Frontend Integration

### Fetching Notifications

```typescript
// Get all notifications
const response = await fetch('/api/profiles/notifications/', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
const data = await response.json();

// Get unread notifications only
const unreadResponse = await fetch('/api/profiles/notifications/?filter=unread', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

// Get notifications by category
const pmsResponse = await fetch('/api/profiles/notifications/?category=pms', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

### Marking Notifications as Read

```typescript
// Mark single notification as read
await fetch(`/api/profiles/notifications/${notificationId}/`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    is_read: true
  })
});

// Mark all as read
await fetch('/api/profiles/notifications/mark-all-read/', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

### Deleting Notifications

```typescript
// Delete notification
await fetch(`/api/profiles/notifications/${notificationId}/`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

### Getting Unread Count

```typescript
// Get unread count for badge display
const response = await fetch('/api/profiles/notifications/unread-count/', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
const { unread_count, new_count } = await response.json();
```

---

## Best Practices

### 1. Choose the Right Type

- **success**: Completed actions, successful operations
- **warning**: Important information that needs attention
- **info**: General information, updates
- **error**: Failed operations, errors

### 2. Set Appropriate Priorities

- **urgent**: Critical issues requiring immediate attention
- **high**: Important but not critical (e.g., payment issues)
- **medium**: Standard notifications (e.g., system updates)
- **low**: Optional information (e.g., profile completion)

### 3. Use Categories Consistently

- **pms**: PMS integration, connection issues
- **pricing**: Price updates, recommendations
- **payment**: Payment processing, billing
- **profile**: Profile updates, incomplete information
- **competitor**: Competitor analysis, price comparisons
- **system**: System updates, maintenance
- **general**: Miscellaneous notifications

### 4. Add Action URLs

When possible, include an `action_url` so users can click notifications to navigate to relevant pages.

### 5. Use Metadata for Context

Store additional information in the `metadata` field for richer notification context:

```python
create_pricing_notification(
    user=user,
    title='Weekend prices updated',
    description='Prices for the next weekend have been optimized.',
    metadata={
        'property_id': property_id,
        'date_range': {'start': '2024-10-12', 'end': '2024-10-14'},
        'rooms_updated': 15,
        'average_increase': 12.5
    }
)
```

### 6. Set Expiration for Time-Sensitive Notifications

```python
from profiles.notification_utils import create_notification

create_notification(
    user=user,
    notification_type='warning',
    title='Special offer expires soon',
    description='Your promotional rate expires in 24 hours.',
    expires_in_days=1
)
```

### 7. Example Integration in Views

```python
from profiles.notification_utils import create_pms_notification

class PMSConnectionView(APIView):
    def post(self, request):
        # ... PMS connection logic ...
        
        if connection_successful:
            # Create success notification
            create_pms_notification(
                user=request.user,
                title='PMS connection restored',
                description='The connection to your PMS system has been successfully restored.',
                notification_type='success',
                action_url='/dashboard/pms'
            )
        else:
            # Create error notification
            create_pms_notification(
                user=request.user,
                title='PMS connection failed',
                description='Failed to connect to your PMS system. Please check your credentials.',
                notification_type='error',
                priority='high',
                action_url='/dashboard/pms/settings'
            )
```

### 8. Regular Cleanup

Set up a cron job or periodic task to clean up expired notifications:

```python
# In a Django management command or celery task
from profiles.notification_utils import delete_expired_notifications

def cleanup_notifications():
    deleted = delete_expired_notifications()
    logger.info(f"Cleaned up {deleted} expired notifications")
```

---

## Future Enhancements

Potential features to consider:

1. **Push Notifications**: Integrate with browser push notifications
2. **Email Digests**: Send daily/weekly email summaries
3. **Notification Preferences**: Allow users to configure notification settings
4. **Real-time Updates**: Use WebSockets for instant notification delivery
5. **Notification Templates**: Pre-defined templates for common notifications
6. **Group Notifications**: Combine similar notifications together
7. **Read Receipts**: Track when notifications were actually viewed

---

## Admin Interface

The Notification model is registered in the Django admin with:
- Filtering by type, category, priority, read status
- Search by user, title, description
- Bulk actions to mark as read/unread
- Organized fieldsets for easy management

Access at: `/admin/profiles/notification/`

