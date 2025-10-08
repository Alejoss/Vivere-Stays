# MSP Notification System

## Overview

The MSP (Minimum Selling Price) notification system automatically monitors MSP configuration for properties and creates notifications when:
- MSP is not configured for **today**
- MSP is not configured for **next week** (next 7 days)

This ensures users are always notified when they're missing critical pricing configuration.

---

## How It Works

### 1. **Notification Triggers**

The system checks for missing MSP in two scenarios:

#### Today's MSP Missing
- **Type**: `warning`
- **Priority**: `high`
- **Title**: "MSP not configured for today"
- **Description**: "You don't have a Minimum Selling Price (MSP) configured for today (Date). Set it up now to ensure proper pricing."

#### Next Week MSP Missing
- **Type**: `warning`
- **Priority**: `medium`
- **Title**: "MSP not configured for next week"
- **Description**: "You don't have a Minimum Selling Price (MSP) configured for next week (Date range). We recommend setting it up to optimize your revenue."

### 2. **Automatic Triggering**

Notifications are automatically created when:

✅ **After MSP Update**: When a user creates/updates MSP entries, the system checks if all dates are now covered
✅ **Manual Check**: User calls the check-msp endpoint
✅ **Scheduled Task**: Via Django management command (run by cron/Celery)
✅ **On Dashboard Load**: Can be integrated into dashboard API calls

### 3. **Smart Deduplication**

- Notifications are **not duplicated** within 24 hours
- If MSP is added for the missing dates, no new notification is created
- System checks before creating to avoid spam

---

## API Endpoints

### Check MSP Status for a Property

```
GET /api/dynamic-pricing/properties/{property_id}/check-msp/
```

**Response:**
```json
{
  "property_id": "abc-123",
  "property_name": "Hotel Example",
  "notifications_created": [
    {
      "type": "msp_missing_today",
      "notification_id": 42
    },
    {
      "type": "msp_missing_next_week",
      "notification_id": 43
    }
  ],
  "coverage_stats": {
    "property_id": "abc-123",
    "property_name": "Hotel Example",
    "period_start": "2024-10-08",
    "period_end": "2024-11-07",
    "total_days": 30,
    "covered_days": 15,
    "missing_days": 15,
    "coverage_percentage": 50.0,
    "has_complete_coverage": false,
    "missing_dates": ["2024-10-23", "2024-10-24", ...]
  }
}
```

### Check MSP Status for All User Properties

```
GET /api/dynamic-pricing/check-msp/
```

**Response:**
```json
{
  "message": "MSP check completed for all properties",
  "result": {
    "user_id": 1,
    "username": "john_doe",
    "properties_checked": 3,
    "total_notifications_created": 2,
    "details": [
      {
        "property_id": "abc-123",
        "property_name": "Hotel Example",
        "notifications_created": [...],
        "count": 2
      }
    ]
  }
}
```

---

## Django Management Command

### Check MSP for All Users

```bash
python manage.py check_msp_notifications --all-users
```

**Output:**
```
Checking MSP for all users...
  john_doe: 2 notification(s) across 3 property(ies)
  jane_smith: 1 notification(s) across 1 property(ies)

✓ Completed: 3 notification(s) created for 2 user(s) across 4 property(ies)
```

### Check MSP for Specific User

```bash
python manage.py check_msp_notifications --user-id 123
```

### Check MSP for Specific Property

```bash
python manage.py check_msp_notifications --property-id abc-123
```

---

## Scheduled Tasks

### Option 1: Cron Job (Recommended)

Add to your crontab to run daily at 9 AM:

```cron
# Check MSP notifications daily at 9:00 AM
0 9 * * * cd /path/to/project && python manage.py check_msp_notifications --all-users >> /var/log/msp_notifications.log 2>&1
```

### Option 2: Celery Beat (If using Celery)

In your `celery.py`:

```python
from celery import Celery
from celery.schedules import crontab

app = Celery('vivere_stays')

app.conf.beat_schedule = {
    'check-msp-notifications': {
        'task': 'dynamic_pricing.tasks.check_msp_notifications_task',
        'schedule': crontab(hour=9, minute=0),  # Daily at 9 AM
    },
}
```

Create task in `dynamic_pricing/tasks.py`:

```python
from celery import shared_task
from django.core.management import call_command

@shared_task
def check_msp_notifications_task():
    """Celery task to check MSP notifications"""
    call_command('check_msp_notifications', '--all-users')
```

---

## Integration Examples

### Example 1: Check on Login

In your login view or dashboard view:

```python
from dynamic_pricing.notification_triggers import check_and_notify_msp_for_all_user_properties

class DashboardView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Check MSP status on dashboard load
        try:
            check_and_notify_msp_for_all_user_properties(request.user)
        except Exception as e:
            logger.warning(f"Error checking MSP on dashboard load: {e}")
        
        # ... rest of dashboard logic
        return Response(dashboard_data)
```

### Example 2: Check After Property Creation

In `PropertyCreateView`:

```python
from dynamic_pricing.notification_triggers import check_and_notify_msp_status

class PropertyCreateView(APIView):
    def post(self, request):
        # ... create property logic ...
        
        if property_created:
            # Check MSP status for new property
            try:
                check_and_notify_msp_status(request.user, property_instance)
            except Exception as e:
                logger.warning(f"Error checking MSP after property creation: {e}")
        
        return Response(response_data)
```

### Example 3: Frontend Integration

Call the check-msp endpoint from your frontend:

```typescript
// Check MSP status on dashboard load
async function checkMSPStatus(propertyId: string) {
  const response = await fetch(
    `/api/dynamic-pricing/properties/${propertyId}/check-msp/`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );
  
  const data = await response.json();
  
  if (data.notifications_created.length > 0) {
    console.log(`${data.notifications_created.length} MSP notifications created`);
    // Refresh notifications in the UI
    refreshNotifications();
  }
  
  // Show coverage stats
  if (data.coverage_stats.coverage_percentage < 100) {
    console.warn(`MSP coverage: ${data.coverage_stats.coverage_percentage}%`);
  }
}
```

---

## Utility Functions

### Check MSP for Today

```python
from dynamic_pricing.notification_triggers import check_msp_configured_today

property = Property.objects.get(id='abc-123')
has_msp = check_msp_configured_today(property)

if not has_msp:
    print("MSP is missing for today!")
```

### Check MSP for Next Week

```python
from dynamic_pricing.notification_triggers import check_msp_configured_next_week

property = Property.objects.get(id='abc-123')
has_complete_coverage, missing_dates = check_msp_configured_next_week(property)

if not has_complete_coverage:
    print(f"Missing MSP for {len(missing_dates)} days: {missing_dates}")
```

### Check MSP for Custom Date Range

```python
from dynamic_pricing.notification_triggers import check_msp_for_date_range
from datetime import date, timedelta

property = Property.objects.get(id='abc-123')
start = date.today()
end = start + timedelta(days=30)

has_coverage, missing_dates = check_msp_for_date_range(property, start, end)

if not has_coverage:
    print(f"Missing MSP for {len(missing_dates)} days in the next 30 days")
```

### Get Coverage Statistics

```python
from dynamic_pricing.notification_triggers import check_msp_for_upcoming_period

property = Property.objects.get(id='abc-123')
stats = check_msp_for_upcoming_period(property, days_ahead=30)

print(f"MSP Coverage: {stats['coverage_percentage']}%")
print(f"Covered days: {stats['covered_days']}/{stats['total_days']}")
```

---

## Adding More Notification Types

To add more notification triggers (e.g., "No competitors configured", "PMS disconnected"), follow this pattern:

### 1. Create Trigger Function

In `dynamic_pricing/notification_triggers.py`:

```python
def trigger_no_competitors_notification(user, property_obj):
    """
    Create notification if property has no competitors configured
    """
    from .models import DpPropertyCompetitor
    
    # Check if property has competitors
    competitors_count = DpPropertyCompetitor.objects.filter(
        property_id=property_obj,
        deleted_at__isnull=True
    ).count()
    
    if competitors_count == 0:
        # Check for recent duplicate
        from profiles.models import Notification
        recent = Notification.objects.filter(
            user=user,
            category='competitor',
            title__icontains='No competitors configured',
            created_at__gte=timezone.now() - timedelta(days=1)
        ).exists()
        
        if recent:
            return None
        
        # Create notification
        return create_notification(
            user=user,
            notification_type='warning',
            title='No competitors configured',
            description='Add competitors to enable competitive pricing.',
            category='competitor',
            priority='medium',
            action_url=f'/dashboard/properties/{property_obj.id}/competitors'
        )
    
    return None
```

### 2. Call in Appropriate Places

- After property creation
- On dashboard load
- Via scheduled task
- After competitor deletion

---

## Testing

### Manual Testing

1. Create a property without MSP
2. Call the check-msp endpoint
3. Verify notifications appear in `/api/profiles/notifications/`

### API Testing

```bash
# Check MSP for property
curl -X GET \
  'http://localhost:8000/api/dynamic-pricing/properties/abc-123/check-msp/' \
  -H 'Authorization: Bearer YOUR_TOKEN'

# Check all notifications
curl -X GET \
  'http://localhost:8000/api/profiles/notifications/' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

### Management Command Testing

```bash
# Test with specific property
python manage.py check_msp_notifications --property-id abc-123

# Test with specific user
python manage.py check_msp_notifications --user-id 1

# Test with all users (dry run in dev)
python manage.py check_msp_notifications --all-users
```

---

## Troubleshooting

### Notifications Not Being Created

1. **Check if MSP actually exists**:
   ```python
   from dynamic_pricing.models import DpMinimumSellingPrice
   today = date.today()
   DpMinimumSellingPrice.objects.filter(
       property_id=property,
       valid_from__lte=today,
       valid_until__gte=today
   )
   ```

2. **Check for duplicate prevention**:
   - Notifications won't be created if one was sent in the last 24 hours
   - Check existing notifications:
   ```python
   from profiles.models import Notification
   Notification.objects.filter(user=user, category='pricing').order_by('-created_at')
   ```

3. **Check logs**:
   ```bash
   tail -f logs/django.log | grep "MSP"
   ```

### Too Many Notifications

- Adjust the deduplication window in notification trigger functions
- Current default: 24 hours
- Can be changed in `trigger_msp_not_configured_*_notification()` functions

---

## Best Practices

1. ✅ **Run scheduled checks daily** at a consistent time (e.g., 9 AM)
2. ✅ **Check after MSP updates** to clear/update notifications
3. ✅ **Check on dashboard load** for immediate feedback
4. ✅ **Monitor logs** for any errors in notification creation
5. ✅ **Adjust deduplication window** based on user feedback
6. ✅ **Add action URLs** so users can fix issues immediately

---

## Future Enhancements

Potential improvements:
1. **Email Notifications**: Send email when critical notifications are created
2. **Configurable Thresholds**: Let users set when they want to be notified (e.g., 14 days ahead)
3. **Auto-dismiss**: Automatically dismiss notifications when MSP is added
4. **Aggregated Notifications**: Combine multiple properties into one notification
5. **Push Notifications**: Browser push notifications for urgent issues
6. **Notification Preferences**: Let users configure which notifications they want

---

## Related Documentation

- [Notification System Documentation](../../profiles/NOTIFICATIONS_README.md)
- [Notification Utilities](../../profiles/notification_utils.py)
- [MSP Model](./models.py#DpMinimumSellingPrice)
- [MSP Views](./views.py#PropertyMSPView)

