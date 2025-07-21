-- Cleanup: Drop all existing tables in the dynamic schema
DROP TABLE IF EXISTS dynamic.dp_room_rates CASCADE;
DROP TABLE IF EXISTS dynamic.dp_events CASCADE;
DROP TABLE IF EXISTS dynamic.dp_weekday_increments CASCADE;
DROP TABLE IF EXISTS dynamic.dp_minimum_selling_price CASCADE;
DROP TABLE IF EXISTS dynamic.dp_los_reduction CASCADE;
DROP TABLE IF EXISTS dynamic.dp_los_setup CASCADE;
DROP TABLE IF EXISTS dynamic.dp_offer_increments CASCADE;
DROP TABLE IF EXISTS dynamic.dp_dynamic_increments_v2 CASCADE;
DROP TABLE IF EXISTS dynamic.dp_dynamic_increments_v1 CASCADE;
DROP TABLE IF EXISTS dynamic.dp_property_competitor CASCADE;
DROP TABLE IF EXISTS dynamic.dp_general_settings CASCADE;
DROP TABLE IF EXISTS dynamic.property CASCADE;

-- Create schemas
CREATE SCHEMA IF NOT EXISTS dynamic;

CREATE TABLE IF NOT EXISTS dynamic.property (
    id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    pms_name VARCHAR NOT NULL,
    pms_hotel_id VARCHAR NOT NULL,
    spreadsheet_id VARCHAR NOT NULL,
    booking_hotel_url TEXT,
    city VARCHAR,
    country VARCHAR,
    rm_email VARCHAR,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Add column comments
COMMENT ON COLUMN dynamic.property.id IS 'Unique identifier for the property';
COMMENT ON COLUMN dynamic.property.name IS 'Display name of the property';
COMMENT ON COLUMN dynamic.property.pms_name IS 'Type of Property Management System: mrplan, apaleo, avirato, or other';
COMMENT ON COLUMN dynamic.property.pms_hotel_id IS 'The unique identifier of the property in the PMS system';
COMMENT ON COLUMN dynamic.property.spreadsheet_id IS 'The Google Sheets spreadsheet ID where property data is stored';
COMMENT ON COLUMN dynamic.property.booking_hotel_url IS 'The URL of the property on Booking.com';
COMMENT ON COLUMN dynamic.property.city IS 'City where the property is located';
COMMENT ON COLUMN dynamic.property.country IS 'Country where the property is located';
COMMENT ON COLUMN dynamic.property.rm_email IS 'Revenue manager email for the property';
COMMENT ON COLUMN dynamic.property.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN dynamic.property.updated_at IS 'Timestamp when the record was last updated';
COMMENT ON COLUMN dynamic.property.is_active IS 'Flag indicating if this property is currently active';

-- Create dynamic pricing general settings table
CREATE TABLE IF NOT EXISTS dynamic.dp_general_settings (
    property_id VARCHAR PRIMARY KEY REFERENCES dynamic.property(id),
    base_rate_code VARCHAR,
    is_base_in_pms BOOLEAN, -- For Apaleo only
    min_competitors INTEGER DEFAULT 2,
    comp_price_calculation VARCHAR DEFAULT 'min', -- Minimum, etc.
    competitor_excluded TEXT,
    msp_include_events_weekend_increments BOOLEAN DEFAULT FALSE,
    future_days_to_price INTEGER DEFAULT 365,
    pricing_status VARCHAR DEFAULT 'offline',
    los_status VARCHAR DEFAULT 'offline',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add column comments for dp_general_settings
COMMENT ON COLUMN dynamic.dp_general_settings.property_id IS 'Primary key and foreign key reference to the property';
COMMENT ON COLUMN dynamic.dp_general_settings.base_rate_code IS 'Base rate code identifier';
COMMENT ON COLUMN dynamic.dp_general_settings.is_base_in_pms IS 'Whether the base rate code is the base in PMS (Apaleo only)';
COMMENT ON COLUMN dynamic.dp_general_settings.min_competitors IS 'Minimum number of competitors required for pricing (default: 2)';
COMMENT ON COLUMN dynamic.dp_general_settings.comp_price_calculation IS 'Method for calculating competitor base price (default: min)';
COMMENT ON COLUMN dynamic.dp_general_settings.competitor_excluded IS 'List of competitors excluded from price calculation';
COMMENT ON COLUMN dynamic.dp_general_settings.msp_include_events_weekend_increments IS 'Whether MSP includes events and weekend increments (default: false)';
COMMENT ON COLUMN dynamic.dp_general_settings.future_days_to_price IS 'Number of future days to price (default: 365)';
COMMENT ON COLUMN dynamic.dp_general_settings.pricing_status IS 'Dynamic pricing configuration status (default: offline)';
COMMENT ON COLUMN dynamic.dp_general_settings.los_status IS 'Dynamic length of stay configuration status (default: offline)';
COMMENT ON COLUMN dynamic.dp_general_settings.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN dynamic.dp_general_settings.updated_at IS 'Timestamp when the record was last updated';

-- Create dynamic pricing property competitor table
CREATE TABLE IF NOT EXISTS dynamic.dp_property_competitor (
    property_id VARCHAR NOT NULL REFERENCES dynamic.property(id),
    competitor_id VARCHAR NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (property_id, competitor_id)
);



-- Add column comments for dp_property_competitor
COMMENT ON COLUMN dynamic.dp_property_competitor.property_id IS 'Foreign key reference to the property (part of composite primary key)';
COMMENT ON COLUMN dynamic.dp_property_competitor.competitor_id IS 'Foreign key reference to booking.competitors (part of composite primary key)';
COMMENT ON COLUMN dynamic.dp_property_competitor.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN dynamic.dp_property_competitor.updated_at IS 'Timestamp when the record was last updated';

-- Create dynamic pricing increments v1 table (range-based format)
CREATE TABLE IF NOT EXISTS dynamic.dp_dynamic_increments_v1 (
    property_id VARCHAR NOT NULL REFERENCES dynamic.property(id),
    var_name VARCHAR NOT NULL,
    var_from FLOAT NOT NULL,
    var_to FLOAT NOT NULL,
    increment_type VARCHAR NOT NULL DEFAULT 'Additional',
    increment_value FLOAT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (property_id, var_name, var_from, var_to)
);

-- Add column comments for dp_dynamic_increments_v1
COMMENT ON COLUMN dynamic.dp_dynamic_increments_v1.property_id IS 'Foreign key reference to the property (part of composite primary key)';
COMMENT ON COLUMN dynamic.dp_dynamic_increments_v1.var_name IS 'Variable name: "occupancy" or "leadtime"';
COMMENT ON COLUMN dynamic.dp_dynamic_increments_v1.var_from IS 'Lower bound of the range (float value)';
COMMENT ON COLUMN dynamic.dp_dynamic_increments_v1.var_to IS 'Upper bound of the range (float value)';
COMMENT ON COLUMN dynamic.dp_dynamic_increments_v1.increment_type IS 'Type of increment: "Percentage" or "Additional" (defaults to "Additional")';
COMMENT ON COLUMN dynamic.dp_dynamic_increments_v1.increment_value IS 'Increment value for the given range';
COMMENT ON COLUMN dynamic.dp_dynamic_increments_v1.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN dynamic.dp_dynamic_increments_v1.updated_at IS 'Timestamp when the record was last updated';

-- Create dynamic pricing increments v2 table (point-based format)
CREATE TABLE IF NOT EXISTS dynamic.dp_dynamic_increments_v2 (
    property_id VARCHAR NOT NULL REFERENCES dynamic.property(id),
    occupancy_level FLOAT NOT NULL,
    lead_time_days INTEGER NOT NULL,
    increment_type VARCHAR NOT NULL DEFAULT 'Additional',
    increment_value FLOAT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (property_id, occupancy_level, lead_time_days)
);

-- Add column comments for dp_dynamic_increments_v2
COMMENT ON COLUMN dynamic.dp_dynamic_increments_v2.property_id IS 'Foreign key reference to the property (part of composite primary key)';
COMMENT ON COLUMN dynamic.dp_dynamic_increments_v2.occupancy_level IS 'Occupancy level as float (e.g., 0.3, 0.5, 0.7, 2.0 for ">100%")';
COMMENT ON COLUMN dynamic.dp_dynamic_increments_v2.lead_time_days IS 'Lead time in days (1, 3, 7, 14, 30, 45, 60, or future_days_to_calc for ">60")';
COMMENT ON COLUMN dynamic.dp_dynamic_increments_v2.increment_type IS 'Type of increment: "Percentage" or "Additional" (defaults to "Additional")';
COMMENT ON COLUMN dynamic.dp_dynamic_increments_v2.increment_value IS 'Increment value for the given occupancy level and lead time combination';
COMMENT ON COLUMN dynamic.dp_dynamic_increments_v2.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN dynamic.dp_dynamic_increments_v2.updated_at IS 'Timestamp when the record was last updated';

-- Create dynamic pricing offer increments table
CREATE TABLE IF NOT EXISTS dynamic.dp_offer_increments (
    property_id VARCHAR NOT NULL REFERENCES dynamic.property(id),
    offer_name VARCHAR,
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,
    applied_from_days INTEGER NOT NULL,
    applied_until_days INTEGER NOT NULL,
    increment_type VARCHAR NOT NULL DEFAULT 'Additional',
    increment_value INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (property_id, valid_from, valid_until)
);

-- Add column comments for dp_offer_increments
COMMENT ON COLUMN dynamic.dp_offer_increments.property_id IS 'Foreign key reference to the property (part of composite primary key)';
COMMENT ON COLUMN dynamic.dp_offer_increments.offer_name IS 'Optional name of the offer (e.g., "10% SUPL.OTAS")';
COMMENT ON COLUMN dynamic.dp_offer_increments.valid_from IS 'Start date of the offer validity period (part of composite primary key)';
COMMENT ON COLUMN dynamic.dp_offer_increments.valid_until IS 'End date of the offer validity period (part of composite primary key)';
COMMENT ON COLUMN dynamic.dp_offer_increments.applied_from_days IS 'Days prior to checkin when offer starts applying';
COMMENT ON COLUMN dynamic.dp_offer_increments.applied_until_days IS 'Days prior to checkin when offer stops applying';
COMMENT ON COLUMN dynamic.dp_offer_increments.increment_type IS 'Type of increment: "Percentage" or "Additional" (defaults to "Additional")';
COMMENT ON COLUMN dynamic.dp_offer_increments.increment_value IS 'Increment value for the offer';
COMMENT ON COLUMN dynamic.dp_offer_increments.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN dynamic.dp_offer_increments.updated_at IS 'Timestamp when the record was last updated';

-- Create dynamic pricing LOS setup table
CREATE TABLE IF NOT EXISTS dynamic.dp_los_setup (
    property_id VARCHAR NOT NULL REFERENCES dynamic.property(id),
    valid_from DATE NOT NULL,
    day_of_week VARCHAR NOT NULL,
    num_competitors INTEGER NOT NULL DEFAULT 2,
    los_aggregation VARCHAR NOT NULL DEFAULT 'min',
    valid_until DATE NOT NULL,
    los_value INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (property_id, valid_from, day_of_week)
);

-- Add column comments for dp_los_setup
COMMENT ON COLUMN dynamic.dp_los_setup.property_id IS 'Foreign key reference to the property (part of composite primary key)';
COMMENT ON COLUMN dynamic.dp_los_setup.valid_from IS 'Start date of the LOS setup period (part of composite primary key)';
COMMENT ON COLUMN dynamic.dp_los_setup.day_of_week IS 'Day of week: "mon", "tue", "wed", "thu", "fri", "sat", "sun" (part of composite primary key)';
COMMENT ON COLUMN dynamic.dp_los_setup.num_competitors IS 'Number of competitors with LOS (default: 2)';
COMMENT ON COLUMN dynamic.dp_los_setup.los_aggregation IS 'LOS aggregation method (default: min)';
COMMENT ON COLUMN dynamic.dp_los_setup.valid_until IS 'End date of the LOS setup period';
COMMENT ON COLUMN dynamic.dp_los_setup.los_value IS 'The LOS value for this day of week';
COMMENT ON COLUMN dynamic.dp_los_setup.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN dynamic.dp_los_setup.updated_at IS 'Timestamp when the record was last updated';

-- Create dynamic pricing LOS reduction table
CREATE TABLE IF NOT EXISTS dynamic.dp_los_reduction (
    property_id VARCHAR NOT NULL REFERENCES dynamic.property(id),
    lead_time_days INTEGER NOT NULL,
    occupancy_level VARCHAR NOT NULL,
    los_value INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (property_id, lead_time_days)
);

-- Add column comments for dp_los_reduction
COMMENT ON COLUMN dynamic.dp_los_reduction.property_id IS 'Foreign key reference to the property (part of composite primary key)';
COMMENT ON COLUMN dynamic.dp_los_reduction.lead_time_days IS 'Days prior to checkin (part of composite primary key)';
COMMENT ON COLUMN dynamic.dp_los_reduction.occupancy_level IS 'Occupancy level (e.g., "30", "50", "70", "200")';
COMMENT ON COLUMN dynamic.dp_los_reduction.los_value IS 'The LOS value to reduce from';
COMMENT ON COLUMN dynamic.dp_los_reduction.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN dynamic.dp_los_reduction.updated_at IS 'Timestamp when the record was last updated';


-- Create minimum selling price table
CREATE TABLE IF NOT EXISTS dynamic.dp_minimum_selling_price (
    property_id VARCHAR NOT NULL REFERENCES dynamic.property(id),
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,
    manual_alternative_price INTEGER NOT NULL,
    msp INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (property_id, valid_from)
);

-- Add column comments for dp_minimum_selling_price
COMMENT ON COLUMN dynamic.dp_minimum_selling_price.property_id IS 'Foreign key reference to the property (part of composite primary key)';
COMMENT ON COLUMN dynamic.dp_minimum_selling_price.valid_from IS 'Start date of the pricing period (part of composite primary key)';
COMMENT ON COLUMN dynamic.dp_minimum_selling_price.valid_until IS 'End date of the pricing period';
COMMENT ON COLUMN dynamic.dp_minimum_selling_price.manual_alternative_price IS 'Manual alternative price for the period';
COMMENT ON COLUMN dynamic.dp_minimum_selling_price.msp IS 'Market Selling Price for the period';
COMMENT ON COLUMN dynamic.dp_minimum_selling_price.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN dynamic.dp_minimum_selling_price.updated_at IS 'Timestamp when the record was last updated';

-- Create weekday increments table
CREATE TABLE IF NOT EXISTS dynamic.dp_weekday_increments (
    property_id VARCHAR NOT NULL REFERENCES dynamic.property(id),
    weekday VARCHAR NOT NULL,
    increment_type VARCHAR NOT NULL DEFAULT 'Additional',
    increment_value INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (property_id, weekday)
);

-- Add column comments for dp_weekday_increments
COMMENT ON COLUMN dynamic.dp_weekday_increments.property_id IS 'Foreign key reference to the property (part of composite primary key)';
COMMENT ON COLUMN dynamic.dp_weekday_increments.weekday IS 'Day of the week: "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday" (part of composite primary key)';
COMMENT ON COLUMN dynamic.dp_weekday_increments.increment_type IS 'Type of increment: "Percentage" or "Additional" (defaults to "Additional")';
COMMENT ON COLUMN dynamic.dp_weekday_increments.increment_value IS 'The increment value (defaults to 0 if no increment is applied)';
COMMENT ON COLUMN dynamic.dp_weekday_increments.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN dynamic.dp_weekday_increments.updated_at IS 'Timestamp when the record was last updated';

-- Create events table
CREATE TABLE IF NOT EXISTS dynamic.dp_events (
    property_id VARCHAR NOT NULL REFERENCES dynamic.property(id),
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,
    event_name VARCHAR NOT NULL,
    increment_type VARCHAR NOT NULL DEFAULT 'Additional',
    increment_value INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (property_id, valid_from)
);

-- Add column comments for dp_events
COMMENT ON COLUMN dynamic.dp_events.property_id IS 'Foreign key reference to the property (part of composite primary key)';
COMMENT ON COLUMN dynamic.dp_events.valid_from IS 'Start date of the event period (part of composite primary key)';
COMMENT ON COLUMN dynamic.dp_events.valid_until IS 'End date of the event period';
COMMENT ON COLUMN dynamic.dp_events.event_name IS 'Name of the event';
COMMENT ON COLUMN dynamic.dp_events.increment_type IS 'Type of increment: "Percentage" or "Additional" (defaults to "Additional")';
COMMENT ON COLUMN dynamic.dp_events.increment_value IS 'The increment value for the event';
COMMENT ON COLUMN dynamic.dp_events.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN dynamic.dp_events.updated_at IS 'Timestamp when the record was last updated';

-- Create room rates table
CREATE TABLE IF NOT EXISTS dynamic.dp_room_rates (
    property_id VARCHAR NOT NULL REFERENCES dynamic.property(id),
    rate_id VARCHAR NOT NULL,
    base_rate_id VARCHAR NOT NULL,
    increment_type VARCHAR NOT NULL DEFAULT 'Additional',
    increment_value INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (property_id, rate_id)
);

-- Add column comments for dp_room_rates
COMMENT ON COLUMN dynamic.dp_room_rates.property_id IS 'Foreign key reference to the property (part of composite primary key)';
COMMENT ON COLUMN dynamic.dp_room_rates.rate_id IS 'Rate ID (e.g., "2105839", "2133289") (part of composite primary key)';
COMMENT ON COLUMN dynamic.dp_room_rates.base_rate_id IS 'Base rate ID (e.g., "2105839", "2133289")';
COMMENT ON COLUMN dynamic.dp_room_rates.increment_type IS 'Type of increment: "Percentage" or "Additional" (defaults to "Additional")';
COMMENT ON COLUMN dynamic.dp_room_rates.increment_value IS 'Increment value (defaults to 0 if no value)';
COMMENT ON COLUMN dynamic.dp_room_rates.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN dynamic.dp_room_rates.updated_at IS 'Timestamp when the record was last updated';

GRANT USAGE ON SCHEMA dynamic TO dynamic_writer;
GRANT SELECT, INSERT, UPDATE ON dynamic.property TO dynamic_writer;
GRANT SELECT, INSERT, UPDATE ON dynamic.dp_general_settings TO dynamic_writer;
GRANT SELECT, INSERT, UPDATE ON dynamic.dp_property_competitor TO dynamic_writer;
GRANT SELECT, INSERT, UPDATE ON dynamic.dp_dynamic_increments_v1 TO dynamic_writer;
GRANT SELECT, INSERT, UPDATE ON dynamic.dp_dynamic_increments_v2 TO dynamic_writer;
GRANT SELECT, INSERT, UPDATE ON dynamic.dp_offer_increments TO dynamic_writer;
GRANT SELECT, INSERT, UPDATE ON dynamic.dp_los_setup TO dynamic_writer;
GRANT SELECT, INSERT, UPDATE ON dynamic.dp_los_reduction TO dynamic_writer;
GRANT SELECT, INSERT, UPDATE ON dynamic.dp_minimum_selling_price TO dynamic_writer;
GRANT SELECT, INSERT, UPDATE ON dynamic.dp_weekday_increments TO dynamic_writer;
GRANT SELECT, INSERT, UPDATE ON dynamic.dp_events TO dynamic_writer;
GRANT SELECT, INSERT, UPDATE ON dynamic.dp_room_rates TO dynamic_writer;

-- Grant read access to all other schemas and tables
-- Booking schema (referenced in comments)
GRANT USAGE ON SCHEMA booking TO dynamic_writer;
GRANT SELECT ON ALL TABLES IN SCHEMA booking TO dynamic_writer;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA booking TO dynamic_writer;

-- PMS schemas (apaleo, avirato, mrplan)
GRANT USAGE ON SCHEMA apaleo TO dynamic_writer;
GRANT SELECT ON ALL TABLES IN SCHEMA apaleo TO dynamic_writer;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA apaleo TO dynamic_writer;

GRANT USAGE ON SCHEMA avirato TO dynamic_writer;
GRANT SELECT ON ALL TABLES IN SCHEMA avirato TO dynamic_writer;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA avirato TO dynamic_writer;

GRANT USAGE ON SCHEMA mrplan TO dynamic_writer;
GRANT SELECT ON ALL TABLES IN SCHEMA mrplan TO dynamic_writer;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA mrplan TO dynamic_writer;

-- Information schema (for metadata access)
GRANT USAGE ON SCHEMA information_schema TO dynamic_writer;
GRANT SELECT ON ALL TABLES IN SCHEMA information_schema TO dynamic_writer;

-- Future tables in all schemas
ALTER DEFAULT PRIVILEGES IN SCHEMA booking GRANT SELECT ON TABLES TO dynamic_writer;
ALTER DEFAULT PRIVILEGES IN SCHEMA apaleo GRANT SELECT ON TABLES TO dynamic_writer;
ALTER DEFAULT PRIVILEGES IN SCHEMA avirato GRANT SELECT ON TABLES TO dynamic_writer;
ALTER DEFAULT PRIVILEGES IN SCHEMA mrplan GRANT SELECT ON TABLES TO dynamic_writer;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO dynamic_writer;
ALTER DEFAULT PRIVILEGES IN SCHEMA booking GRANT SELECT ON SEQUENCES TO dynamic_writer;
ALTER DEFAULT PRIVILEGES IN SCHEMA apaleo GRANT SELECT ON SEQUENCES TO dynamic_writer;
ALTER DEFAULT PRIVILEGES IN SCHEMA avirato GRANT SELECT ON SEQUENCES TO dynamic_writer;
ALTER DEFAULT PRIVILEGES IN SCHEMA mrplan GRANT SELECT ON SEQUENCES TO dynamic_writer;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON SEQUENCES TO dynamic_writer;

-- Grant read access to webapp_writer user for all schemas and tables
-- Dynamic schema (read access only)
GRANT USAGE ON SCHEMA dynamic TO webapp_writer;
GRANT SELECT ON dynamic.property TO webapp_writer;
GRANT SELECT ON dynamic.dp_general_settings TO webapp_writer;
GRANT SELECT ON dynamic.dp_property_competitor TO webapp_writer;
GRANT SELECT ON dynamic.dp_dynamic_increments_v1 TO webapp_writer;
GRANT SELECT ON dynamic.dp_dynamic_increments_v2 TO webapp_writer;
GRANT SELECT ON dynamic.dp_offer_increments TO webapp_writer;
GRANT SELECT ON dynamic.dp_los_setup TO webapp_writer;
GRANT SELECT ON dynamic.dp_los_reduction TO webapp_writer;
GRANT SELECT ON dynamic.dp_minimum_selling_price TO webapp_writer;
GRANT SELECT ON dynamic.dp_weekday_increments TO webapp_writer;
GRANT SELECT ON dynamic.dp_events TO webapp_writer;
GRANT SELECT ON dynamic.dp_room_rates TO webapp_writer;

-- Booking schema
GRANT USAGE ON SCHEMA booking TO webapp_writer;
GRANT SELECT ON ALL TABLES IN SCHEMA booking TO webapp_writer;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA booking TO webapp_writer;

-- PMS schemas (apaleo, avirato, mrplan)
GRANT USAGE ON SCHEMA apaleo TO webapp_writer;
GRANT SELECT ON ALL TABLES IN SCHEMA apaleo TO webapp_writer;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA apaleo TO webapp_writer;

GRANT USAGE ON SCHEMA avirato TO webapp_writer;
GRANT SELECT ON ALL TABLES IN SCHEMA avirato TO webapp_writer;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA avirato TO webapp_writer;

GRANT USAGE ON SCHEMA mrplan TO webapp_writer;
GRANT SELECT ON ALL TABLES IN SCHEMA mrplan TO webapp_writer;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA mrplan TO webapp_writer;

-- Information schema (for metadata access)
GRANT USAGE ON SCHEMA information_schema TO webapp_writer;
GRANT SELECT ON ALL TABLES IN SCHEMA information_schema TO webapp_writer;

-- Future tables in all schemas for webapp_writer
ALTER DEFAULT PRIVILEGES IN SCHEMA booking GRANT SELECT ON TABLES TO webapp_writer;
ALTER DEFAULT PRIVILEGES IN SCHEMA apaleo GRANT SELECT ON TABLES TO webapp_writer;
ALTER DEFAULT PRIVILEGES IN SCHEMA avirato GRANT SELECT ON TABLES TO webapp_writer;
ALTER DEFAULT PRIVILEGES IN SCHEMA mrplan GRANT SELECT ON TABLES TO webapp_writer;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO webapp_writer;
ALTER DEFAULT PRIVILEGES IN SCHEMA booking GRANT SELECT ON SEQUENCES TO webapp_writer;
ALTER DEFAULT PRIVILEGES IN SCHEMA apaleo GRANT SELECT ON SEQUENCES TO webapp_writer;
ALTER DEFAULT PRIVILEGES IN SCHEMA avirato GRANT SELECT ON SEQUENCES TO webapp_writer;
ALTER DEFAULT PRIVILEGES IN SCHEMA mrplan GRANT SELECT ON SEQUENCES TO webapp_writer;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON SEQUENCES TO webapp_writer;

