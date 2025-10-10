# Comprehensive Dashboard i18n Audit - All Hardcoded Strings

## Total Pages Needing Translation: 8

---

## HOTEL MANAGEMENT PAGES (3 pages)

### 1. SpecialOffers.tsx - ~25 Hardcoded Strings

**Desktop Table Headers (Lines 360-377):**
- `<div>Offer Name*</div>`
- `<div>Valid From*</div>`
- `<div>Valid Until*</div>`
- `<div>Available From Days</div>`
- `<div>Available Until Days</div>`
- `<div>Type</div>`
- `<div>Value*</div>`

**Mobile Form Labels (Lines 524, 541, 555, 573, 589, 609, 621):**
- `<label>Offer Name*</label>`
- `<label>Valid From*</label>`
- `<label>Valid Until*</label>`
- `<label>Available From Days</label>`
- `<label>Available Until Days</label>`
- `<label>Type</label>`
- `<label>Value*</label>`

**Placeholders (Lines 404, 418, 431, 529, 547, 561, 579, 595, 626):**
- `placeholder="Discount Name"` (2x)
- `placeholder="Select start date"` (2x)
- `placeholder="Select end date"` (2x)
- `placeholder="0"` (3x)

**Dropdown Options (Lines 472-473, 615-616):**
- `<option value="Percentage">Percentage</option>` (2x)
- `<option value="Additional">Additional</option>` (2x)

---

### 2. LosSetupRules.tsx - ~15 Hardcoded Strings

**Desktop Table Headers (Lines 462, 466, 470, 474):**
- `<span>From</span>`
- `<span>To</span>`
- `<span>Day</span>`
- `<span>LOS Value</span>`

**Section Headers (Lines 449, 452):**
- `<h3>Setup Rules</h3>`
- `{fields.length} rule{fields.length !== 1 ? 's' : ''}`

**Error States (Lines 409-410):**
- `No property selected`
- `Please select a property to configure LOS setup rules`

**Mobile Labels (Lines 556, 574, 605, 625):**
- `From*`
- `To*`
- Repeated labels in mobile view

---

### 3. LosReductionRules.tsx - ~25 Hardcoded Strings

**Page Title/Subtitle (Lines 361, 364):**
- `<h2>LOS Reduction Rules</h2>`
- `<p>Configure conditions to reduce length of stay requirements.</p>`

**Info Section (Lines 382-394):**
- `<h3>How Reduction Rules Work</h3>`
- `Reduction rules automatically reduce the LOS requirement when specific conditions are met:`
- `• <strong>Lead Time:</strong> Days between booking and check-in`
- `• <strong>Occupancy Level:</strong> Current occupancy percentage`
- `• <strong>LOS Value:</strong> How much to reduce the LOS by`
- `<strong>Example:</strong> If lead time ≤ 7 days and occupancy ≤ 50% → reduce LOS by 1 night.`

**Section Headers (Lines 401, 404):**
- `<h3>Reduction Rules</h3>`
- `{reductionRules.length} rule{reductionRules.length !== 1 ? 's' : ''}`

**Desktop Table Headers (Lines 414, 418, 422):**
- `<span>Lead Time Category</span>`
- `<span>Occupancy Category</span>`
- `<span>LOS Reduction</span>`

**Mobile Labels (Lines 505, 523, 543):**
- `Lead Time Category`
- `Occupancy Category`
- `LOS Reduction`

---

## OTHER DASHBOARD PAGES (5 pages)

### 4. Support.tsx - ~15 Hardcoded Strings

**Page Headers (Lines 154-160):**
- `<h1>Support Center</h1>`
- `Need help? Create a support ticket and our team will get back to you as soon as possible.`

**Form Header (Line 171):**
- `<h2>Create Support Ticket</h2>`

**Form Labels (Lines 179, 237, 268):**
- `What can we help you with?`
- `Description` (or similar label)
- Screenshot/attachment labels

**Issue Types Array (Lines 18-23):**
- `"Technical Issue"`
- `"Billing Question"`
- `"Feature Request"`
- `"Bug Report"`
- `"General Inquiry"`

**Error Messages (Lines 52, 127, 137):**
- `"Description must be at least 10 characters long."`
- `"Please select an image file for the screenshot."`
- `"Screenshot must be smaller than 5MB."`

---

### 5. MyAccount.tsx - ~30 Hardcoded Strings

**Page Headers (Lines 182-183):**
- `<h1>My Account</h1>`
- `Manage your account settings and security`

**Section Headers (Lines 193, and others):**
- `<h2>Profile Information</h2>`
- Password change section header

**Profile Labels (Lines 201, 210, 221):**
- `Email`
- `Member Since`
- `Name`

**Password Form:**
- All password-related labels
- Current Password, New Password, Confirm Password

**Error Message (Line 136):**
- `"Failed to change password. Please try again."`

**Loading State (Line 158):**
- `Loading profile...`

**Error State (Line 168):**
- `Failed to load profile information`

---

### 6. PropertyList.tsx - ~10 Hardcoded Strings

**Page Headers (Lines 62-64):**
- `<h1>Your Properties</h1>`
- `Select a property to view its pricing calendar and manage dynamic pricing settings.`

**Empty State (Lines 40-43, 48):**
- `<h3>No Properties Found</h3>`
- `You haven't added any properties yet. Please complete the onboarding process to add your first property.`
- `Add Your First Property` button

**Labels (Lines 98, 105, 112, 118):**
- `Property Type`
- `Rooms`
- `Status`
- `Active` / `Inactive`

**Fallback (Line 100):**
- `'Not specified'`

---

### 7. AnalyticsPerformance.tsx - ~5 Hardcoded Strings

**Chart Titles (Lines 88-90):**
- `title="Revenue"`
- `title="Average Daily Rate"`
- `title="RevPAR"`

**Placeholder (Line 77):**
- `placeholder="Metric"` (potentially)

---

### 8. AnalyticsPickup.tsx - ~15 Hardcoded Strings

**Page Title (Line 65):**
- `<div>Pickup</div>`

**Sub-header (Line 70):**
- `Pickup last {days} days {metric === 'bookings' ? '(Bookings)' : '(Room nights)'}`

**Dropdown Options (Lines 77, 80-81, 86, 89-91):**
- `placeholder="Metric"`
- `<SelectItem value="bookings">Bookings</SelectItem>`
- `<SelectItem value="room_nights">Room nights</SelectItem>`
- `placeholder="7 days"`
- `<SelectItem value="3">3 days</SelectItem>`
- `<SelectItem value="7">7 days</SelectItem>`
- `<SelectItem value="15">15 days</SelectItem>`

**Metric Labels (Line 126):**
- `'Bookings made'`
- `'Room nights sold'`

**States (Lines 120, 123, 50):**
- `Loading...`
- `Failed to load pickup data`

**Legend (Line 130):**
- `vs STLY`

---

## SUMMARY BY CATEGORY

| Page | Est. Strings | Complexity | Priority |
|------|--------------|------------|----------|
| **LosReductionRules** | ~25 | High | 1 |
| **SpecialOffers** | ~25 | High | 2 |
| **MyAccount** | ~30 | Medium | 3 |
| **LosSetupRules** | ~15 | Medium | 4 |
| **Support** | ~15 | Medium | 5 |
| **AnalyticsPickup** | ~15 | Low | 6 |
| **PropertyList** | ~10 | Low | 7 |
| **AnalyticsPerformance** | ~5 | Low | 8 |

**Total Estimated:** ~140 hardcoded strings across 8 pages

---

## PAGES ALREADY COMPLETE (13 pages)

✅ Competitors.tsx
✅ HotelInformation.tsx
✅ MSPManagement.tsx
✅ DynamicSetup.tsx
✅ AvailableRates.tsx
✅ LosGeneralSettings.tsx
✅ ChangePrices.tsx
✅ Notifications.tsx (partial)
✅ LengthOfStay.tsx
✅ PropertyDashboard.tsx (uses PriceCalendar)
✅ Index.tsx (uses PriceCalendar)
✅ DashboardRedirect.tsx (no content)
✅ Sidebar.tsx

---

## IMPLEMENTATION PLAN

### Page-by-Page Approach (User Requested: 2.b)

**Page 1: SpecialOffers.tsx**
1. Translate all 7 desktop table headers
2. Translate all 7 mobile form labels
3. Translate all 9 placeholders (use `replace_all`)
4. Translate dropdown options (Percentage/Additional)

**Page 2: LosSetupRules.tsx**
1. Translate 4 desktop table headers
2. Translate section headers
3. Translate error state messages
4. Translate mobile labels

**Page 3: LosReductionRules.tsx**
1. Translate page title and subtitle
2. Translate entire "How Reduction Rules Work" section
3. Translate 3 desktop table headers
4. Translate 3 mobile labels
5. Translate section headers with rule count

**Page 4: Support.tsx**
1. Translate page headers
2. Translate form header
3. Translate issue types array
4. Translate all form labels
5. Translate 3 validation error messages

**Page 5: MyAccount.tsx**
1. Translate page headers
2. Translate all profile section labels
3. Translate password form labels
4. Translate loading/error states
5. Translate error messages

**Page 6: PropertyList.tsx**
1. Translate page headers
2. Translate empty state content
3. Translate all property card labels
4. Translate status labels

**Page 7: AnalyticsPickup.tsx**
1. Translate page title
2. Translate dropdown options
3. Translate metric labels
4. Translate loading/error states
5. Translate "vs STLY" legend

**Page 8: AnalyticsPerformance.tsx**
1. Translate 3 chart titles
2. Translate any other labels

---

## TRANSLATION KEYS TO ADD

### For SpecialOffers:
- `offerName`, `validFrom`, `validUntil`, `availableFromDays`, `availableUntilDays`, `type`, `value`
- `discountNamePlaceholder`, `selectStartDate`, `selectEndDate`

### For LosSetupRules:
- `from`, `to`, `day`, `losValue`, `setupRules`, `ruleCount`

### For LosReductionRules:
- `title`, `subtitle`, `howItWorksTitle`, `howItWorksDesc`, etc.
- `leadTimeCategory`, `occupancyCategory`, `losReduction`, `reductionRules`

### For Support:
- `supportCenter`, `needHelp`, `createTicket`, `whatCanWeHelp`, `descriptionLabel`
- Issue types, validation messages

### For MyAccount:
- `profileInformation`, `email`, `memberSince`, `name`, `passwordChange`
- All password labels, loading/error states

### For PropertyList:
- `yourProperties`, `selectProperty`, `noProperties`, `addFirstProperty`
- `propertyType`, `rooms`, `status`, `active`, `inactive`

### For Analytics:
- Pickup: `pickup`, `bookings`, `roomNights`, `days`, `vsSTLY`, `bookingsMade`, `roomNightsSold`
- Performance: `revenue`, `averageDailyRate`, `revpar`

---

## EXECUTION ORDER (Page-by-Page as Requested)

1. **SpecialOffers.tsx** - Complete all ~25 strings
2. **LosSetupRules.tsx** - Complete all ~15 strings  
3. **LosReductionRules.tsx** - Complete all ~25 strings
4. **Support.tsx** - Complete all ~15 strings
5. **MyAccount.tsx** - Complete all ~30 strings
6. **PropertyList.tsx** - Complete all ~10 strings
7. **AnalyticsPickup.tsx** - Complete all ~15 strings
8. **AnalyticsPerformance.tsx** - Complete all ~5 strings

Each page fully complete before moving to next.

---

## OUTCOME

- 8 pages fully translated
- ~140 translation keys added (×3 languages = 420 translations)
- 100% dashboard i18n coverage
- Zero hardcoded English strings remaining
- Production-ready

