# Dynamic Pricing API

This module provides API endpoints for managing properties and dynamic pricing configurations.

## Property Endpoints

### Create Property
**POST** `/api/dynamic-pricing/properties/create/`

Creates a new property with basic information.

**Required Fields:**
- `name` (string): Hotel/Property name
- `booking_hotel_url` (string): Booking.com URL for the property
- `street_address` (string): Street address including building number and street name
- `city` (string): City where the property is located
- `country` (string): Country where the property is located
- `postal_code` (string): Postal/ZIP code

**Example Request:**
```json
{
    "name": "Grand Hotel Example",
    "booking_hotel_url": "https://www.booking.com/hotel/example.html",
    "street_address": "123 Main Street",
    "city": "New York",
    "country": "United States",
    "postal_code": "10001"
}
```

**Example Response:**
```json
{
    "message": "Property created successfully",
    "property": {
        "id": "uuid-here",
        "name": "Grand Hotel Example",
        "pms_name": "manual",
        "pms_hotel_id": "uuid-here",
        "spreadsheet_id": "",
        "booking_hotel_url": "https://www.booking.com/hotel/example.html",
        "street_address": "123 Main Street",
        "city": "New York",
        "country": "United States",
        "postal_code": "10001",
        "state_province": null,
        "latitude": null,
        "longitude": null,
        "rm_email": null,
        "is_active": true,
        "created_at": "2024-01-01T12:00:00Z",
        "updated_at": "2024-01-01T12:00:00Z",
        "full_address": "123 Main Street, New York, 10001, United States"
    }
}
```

### List Properties
**GET** `/api/dynamic-pricing/properties/`

Retrieves a list of all properties with optional filtering.

**Query Parameters:**
- `is_active` (boolean): Filter by active status (default: true)
- `city` (string): Filter by city (partial match)
- `country` (string): Filter by country (partial match)

**Example Response:**
```json
{
    "properties": [
        {
            "id": "uuid-here",
            "name": "Grand Hotel Example",
            "city": "New York",
            "country": "United States",
            "full_address": "123 Main Street, New York, 10001, United States",
            "is_active": true,
            "created_at": "2024-01-01T12:00:00Z"
        }
    ],
    "count": 1
}
```

### Get Property Details
**GET** `/api/dynamic-pricing/properties/{property_id}/`

Retrieves detailed information about a specific property.

**Example Response:**
```json
{
    "property": {
        "id": "uuid-here",
        "name": "Grand Hotel Example",
        "pms_name": "manual",
        "pms_hotel_id": "uuid-here",
        "spreadsheet_id": "",
        "booking_hotel_url": "https://www.booking.com/hotel/example.html",
        "street_address": "123 Main Street",
        "city": "New York",
        "country": "United States",
        "postal_code": "10001",
        "state_province": null,
        "latitude": null,
        "longitude": null,
        "rm_email": null,
        "is_active": true,
        "created_at": "2024-01-01T12:00:00Z",
        "updated_at": "2024-01-01T12:00:00Z",
        "full_address": "123 Main Street, New York, 10001, United States"
    }
}
```

### Update Property
**PUT** `/api/dynamic-pricing/properties/{property_id}/`

Updates a specific property. All fields are optional for partial updates.

**Example Request:**
```json
{
    "state_province": "NY",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "rm_email": "manager@example.com"
}
```

### Update Property PMS (Dedicated Endpoint)
**PUT** `/api/dynamic-pricing/properties/{property_id}/pms/`

Updates the PMS name for a property with additional validation and integration logic.

**Required Fields:**
- `pms_name` (string): Must be one of: `mrplan`, `apaleo`, `avirato`, `manual`

**Example Request:**
```json
{
    "pms_name": "apaleo"
}
```

**Example Response:**
```json
{
    "message": "PMS updated successfully from manual to apaleo",
    "property": {
        "id": "uuid-here",
        "name": "Grand Hotel Example",
        "pms_name": "apaleo",
        "pms_hotel_id": "uuid-here",
        "spreadsheet_id": "",
        "booking_hotel_url": "https://www.booking.com/hotel/example.html",
        "street_address": "123 Main Street",
        "city": "New York",
        "country": "United States",
        "postal_code": "10001",
        "state_province": null,
        "latitude": null,
        "longitude": null,
        "rm_email": null,
        "is_active": true,
        "created_at": "2024-01-01T12:00:00Z",
        "updated_at": "2024-01-01T12:00:00Z",
        "full_address": "123 Main Street, New York, 10001, United States"
    },
    "pms_change": {
        "old_pms": "manual",
        "new_pms": "apaleo"
    }
}
```

**PMS-Specific Logic:**
When the PMS is updated, the system automatically:
- **Apaleo**: Sets up Apaleo-specific settings, validates credentials, configures webhooks
- **MrPlan**: Sets up MrPlan integration, configures data synchronization
- **Avirato**: Sets up Avirato API connections, configures pricing rules
- **Manual**: Disables automatic integrations, sets up manual controls

### Delete Property (Soft Delete)
**DELETE** `/api/dynamic-pricing/properties/{property_id}/`

Deactivates a property by setting `is_active` to `false`.

**Example Response:**
```json
{
    "message": "Property deactivated successfully"
}
```

## Authentication

All endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Error Handling

All endpoints return appropriate HTTP status codes and error messages:

- `400 Bad Request`: Validation errors
- `401 Unauthorized`: Authentication required
- `404 Not Found`: Property not found
- `500 Internal Server Error`: Server error

Error responses include a message and detailed error information:

```json
{
    "message": "Property creation failed",
    "errors": {
        "name": ["Property name cannot be empty."],
        "booking_hotel_url": ["Please provide a valid Booking.com URL."]
    }
}
``` 