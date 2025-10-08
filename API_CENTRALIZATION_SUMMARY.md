# API Centralization - Notification Functions

## ✅ What Changed

All notification API functions have been **moved from a standalone file to `profiles.ts`** to centralize the API logic, following the same pattern as `dynamic.ts`.

---

## 📁 File Changes

### Deleted
- ❌ `frontend/shared/api/notifications.ts` (removed)

### Modified
- ✅ `frontend/shared/api/profiles.ts` (added notification functions)
- ✅ `frontend/client/pages/dashboard/Notifications.tsx` (updated imports)

---

## 🎯 API Structure

All API services are now centralized in their respective service files:

### `profilesService` (profiles.ts)
```typescript
import { profilesService } from '@/shared/api/profiles';

// Profile operations
profilesService.getProfile()
profilesService.updateProfile()

// Support tickets
profilesService.createSupportTicket()
profilesService.getSupportTickets()

// Onboarding
profilesService.getOnboardingProgress()
profilesService.updateOnboardingProgress()

// ✨ NEW: Notifications
profilesService.getNotifications()
profilesService.markNotificationAsRead()
profilesService.deleteNotification()
profilesService.markAllNotificationsAsRead()
profilesService.getNotificationUnreadCount()
```

### `dynamicPricingService` (dynamic.ts)
```typescript
import { dynamicPricingService } from '@/shared/api/dynamic';

// Properties
dynamicPricingService.getProperties()
dynamicPricingService.createProperty()

// MSP
dynamicPricingService.getMSPEntries()
dynamicPricingService.createPropertyMSP()

// ✨ MSP Checks
dynamicPricingService.checkMSPStatus()
dynamicPricingService.checkMSPStatusAllProperties()

// Price History
dynamicPricingService.getPriceHistory()
// ... etc
```

---

## 🔧 Updated Component Imports

### Before (Standalone Import)
```typescript
import { 
  getNotifications, 
  markNotificationAsRead, 
  deleteNotification, 
  markAllNotificationsAsRead 
} from "../../../shared/api/notifications";

// Usage
await getNotifications({ filter: 'unread' });
await markNotificationAsRead(id);
```

### After (Centralized in profilesService)
```typescript
import { profilesService } from "../../../shared/api/profiles";

// Usage
await profilesService.getNotifications({ filter: 'unread' });
await profilesService.markNotificationAsRead(id);
```

---

## ✅ Benefits

1. **Consistency**: All API calls follow the same pattern
2. **Organization**: Related functions grouped together
3. **Easy to Find**: Notifications are in `profilesService` (profiles-related)
4. **Less Imports**: One import instead of multiple
5. **Maintainability**: Centralized location for all API logic

---

## 📋 All Notification Functions Available

### In `profilesService`:

```typescript
// Get notifications with optional filters
profilesService.getNotifications({
  filter?: 'all' | 'unread' | 'read' | 'new',
  category?: string,
  priority?: string,
  limit?: number,
  offset?: number
})

// Mark single notification as read
profilesService.markNotificationAsRead(notificationId)

// Delete notification
profilesService.deleteNotification(notificationId)

// Mark all as read
profilesService.markAllNotificationsAsRead()

// Get unread count (for badges)
profilesService.getNotificationUnreadCount()
```

---

## 🎯 Current API Structure

```
frontend/shared/api/
├── client.ts         - Base apiRequest function
├── profiles.ts       - Profile & notification functions ✅
├── dynamic.ts        - Dynamic pricing functions ✅
├── auth.ts           - Authentication functions
└── hooks.ts          - React Query hooks
```

---

## ✨ The Fix

The CORS error you saw was likely because the API endpoint path wasn't being constructed correctly. Now it uses the same `apiRequest` pattern as all other API calls, which handles:

- ✅ Base URL construction
- ✅ Authentication headers
- ✅ CORS handling
- ✅ Error handling
- ✅ Response parsing

---

## 🧪 Testing

The notification functions now use the same centralized API client, so they should work exactly like your other API calls (MSP, properties, etc.).

**Default View**: Now shows **"Unread"** notifications first!

```
User visits /notifications
       ↓
Loads with "Unread" tab selected
       ↓
Triggers MSP check for all properties
       ↓
Fetches unread notifications from:
  GET /api/profiles/notifications/?filter=unread&limit=100
       ↓
Displays in UI
```

---

**The API is now properly centralized and should work without CORS issues! 🎉**

