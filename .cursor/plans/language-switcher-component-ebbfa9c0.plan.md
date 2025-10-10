<!-- ebbfa9c0-9e05-428f-9e6b-161cc853eb1e e81ee5a0-0ad4-4876-8011-2f87e5918360 -->
# Complete Dashboard i18n Translation

## Objective

Translate all remaining 11 dashboard components to complete full i18n coverage across the entire application.

## Current Status

- Completed: 29 components (auth + onboarding + 11 hotel management pages)
- Remaining: 11 dashboard components (~3,300 lines)
- Translation infrastructure: Complete (all JSON files ready)

## Implementation Strategy

Follow proven DRY patterns from completed work:

- Reuse `common:buttons.*` for all buttons
- Reuse `common:messages.*` for all toasts
- Add page-specific keys only for unique content
- Use `replace_all` for batch toast message updates

## Phase 1: Complex Components First (Priority)

### 1.1 PriceCalendar.tsx (549 lines) - Shared Component

**Location:** `frontend/client/components/dashboard/PriceCalendar.tsx`

**Used by:** PropertyDashboard.tsx, Index.tsx

**Translatable content:**

- "Price Calendar" title
- 12 month names array (January-December)
- 7 day headers (Sun, Mon, Tue, Wed, Thu, Fri, Sat)
- Price type dropdown: "Average Daily Rate", "PMS Price", "Competitor Average", "MSP"
- Loading states: "Loading properties..."
- Empty states: "No properties found. Please add a property first."
- "Close" button
- Occupancy legend: "0-35% (Low)", "36-69% (Medium)", "70%+ (High)"
- PMS warning message

**Approach:**

1. Add `useTranslation` hook
2. Add month/day translations to `dashboard.json` under `calendar` namespace
3. Translate all UI strings using existing shared keys where applicable

### 1.2 ChangePrices.tsx (1,095 lines) - Largest Page

**Location:** `frontend/client/pages/dashboard/ChangePrices.tsx`

**Translatable content:**

- Page title and navigation
- Week view table with competitor data
- "Occupancy (%)", "Competitor Avg", "Your Price" row labels
- Date navigation controls
- Save/update buttons
- Toast messages (success/error)
- Loading/error states

**Approach:**

1. Add `useTranslation` hook
2. Translate table headers and labels
3. Use `common:buttons.*` for action buttons
4. Batch update all toast messages with `replace_all`

## Phase 2: User-Facing Pages (High Visibility)

### 2.1 Notifications.tsx (339 lines)

- Notification list UI
- "Mark as read", "Delete" actions
- Empty state: "No notifications"
- Filter/sort options

### 2.2 Support.tsx (330 lines)

- Support form fields
- "Send" button → `common:buttons.submit`
- Success/error messages
- Form validation

### 2.3 MyAccount.tsx (376 lines)

- Account settings form
- Profile fields
- Password change section
- Save button → `common:buttons.save`

## Phase 3: Property & Analytics Pages

### 3.1 PropertyDashboard.tsx (107 lines)

- Uses PriceCalendar component (translated in Phase 1)
- Minimal additional translation needed

### 3.2 PropertyList.tsx (146 lines)

- Property list table
- "Add Property" button
- Table columns
- Empty state

### 3.3 AnalyticsPerformance.tsx (93 lines)

- Chart labels
- Metric names
- Date range selector

### 3.4 AnalyticsPickup.tsx (139 lines)

- Similar to Performance
- Chart/metric translations

## Phase 4: Minimal Pages

### 4.1 Index.tsx (39 lines)

- Uses PriceCalendar (already translated)
- Minimal wrapper

### 4.2 DashboardRedirect.tsx (43 lines)

- Routing logic only, likely no translatable content

## Translation Keys to Add

### dashboard.json additions:

```json
{
  "calendar": {
    "title": "Price Calendar",
    "months": [...],
    "days": [...],
    "priceTypes": {
      "averageDailyRate": "Average Daily Rate",
      "pmsPrice": "PMS Price",
      "competitorAverage": "Competitor Average",
      "msp": "MSP"
    },
    "occupancyLevels": {
      "low": "0-35% (Low)",
      "medium": "36-69% (Medium)",
      "high": "70%+ (High)"
    }
  },
  "changePrices": {
    "title": "Change Prices",
    "occupancy": "Occupancy (%)",
    "competitorAvg": "Competitor Avg",
    "yourPrice": "Your Price"
  },
  "notifications": {...},
  "support": {...},
  "myAccount": {...},
  "propertyList": {...},
  "analytics": {...}
}
```

## Execution Order

1. Update dashboard.json files (en/es/de) with all new keys
2. PriceCalendar.tsx - Add hook + translate all UI
3. ChangePrices.tsx - Add hook + translate all UI
4. Notifications.tsx, Support.tsx, MyAccount.tsx
5. PropertyDashboard.tsx, PropertyList.tsx
6. AnalyticsPerformance.tsx, AnalyticsPickup.tsx
7. Index.tsx, DashboardRedirect.tsx (if needed)

## Expected Outcome

- 11 components fully translated
- ~500 new translation keys added
- 100% dashboard i18n coverage
- Consistent with established patterns
- Production-ready

### To-dos

- [ ] Add all new translation keys to dashboard.json (en/es/de) for remaining pages
- [ ] Translate PriceCalendar.tsx component (months, days, price types, legends)
- [ ] Translate ChangePrices.tsx page (largest remaining page)
- [ ] Translate Notifications.tsx page
- [ ] Translate Support.tsx page
- [ ] Translate MyAccount.tsx page
- [ ] Translate PropertyList.tsx page
- [ ] Translate PropertyDashboard.tsx page
- [ ] Translate AnalyticsPerformance.tsx page
- [ ] Translate AnalyticsPickup.tsx page
- [ ] Review and translate Index.tsx and DashboardRedirect.tsx (if needed)