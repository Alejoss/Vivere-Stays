-- Cleanup: Drop all existing tables in the dynamic schema
-- Drop tables in dependency order (child tables first, then parent tables)

-- Drop tables that reference other tables first
-- DROP TABLE IF EXISTS dynamic.dp_room_rates CASCADE;
-- DROP TABLE IF EXISTS dynamic.dp_minimum_selling_price CASCADE;
-- DROP TABLE IF EXISTS dynamic.dp_los_reduction CASCADE;
-- DROP TABLE IF EXISTS dynamic.dp_los_setup CASCADE;
-- DROP TABLE IF EXISTS dynamic.dp_offer_increments CASCADE;
-- DROP TABLE IF EXISTS dynamic.dp_dynamic_increments_v2 CASCADE;
-- DROP TABLE IF EXISTS dynamic.dp_property_competitor CASCADE;
-- DROP TABLE IF EXISTS dynamic.dp_general_settings CASCADE;
-- DROP TABLE IF EXISTS dynamic.dp_price_change_history CASCADE;

-- -- Drop junction tables
-- DROP TABLE IF EXISTS dynamic.property_profiles CASCADE;

-- -- Drop new tables
-- DROP TABLE IF EXISTS dynamic.competitor_candidate CASCADE;

-- -- Drop parent tables last
-- DROP TABLE IF EXISTS dynamic.property CASCADE;
-- DROP TABLE IF EXISTS dynamic.property_management_system CASCADE;

-- -- Create schemas
-- CREATE SCHEMA IF NOT EXISTS dynamic;

-- Create PropertyManagementSystem table
CREATE TABLE IF NOT EXISTS dynamic.property_management_system (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE dynamic.property_management_system IS 'Property management systems';
COMMENT ON COLUMN dynamic.property_management_system.id IS 'Primary key';
COMMENT ON COLUMN dynamic.property_management_system.name IS 'Name of the PMS system';
COMMENT ON COLUMN dynamic.property_management_system.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN dynamic.property_management_system.updated_at IS 'Timestamp when the record was last updated';

CREATE TABLE IF NOT EXISTS dynamic.property (
    id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    pms_name VARCHAR,
    pms_hotel_id VARCHAR,
    spreadsheet_id VARCHAR,
    booking_hotel_url TEXT,
    city VARCHAR,
    country VARCHAR,
    -- Address fields
    street_address VARCHAR(500),
    postal_code VARCHAR(20),
    state_province VARCHAR(100),
    phone_number VARCHAR(20),
    website VARCHAR(255),
    cif VARCHAR(255),
    number_of_rooms INTEGER NOT NULL,
    property_type VARCHAR(255),
    -- Geolocation fields
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6),
    -- PMS relationship
    pms_id INTEGER REFERENCES dynamic.property_management_system(id),
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
COMMENT ON COLUMN dynamic.property.street_address IS 'Street address including building number and street name';
COMMENT ON COLUMN dynamic.property.postal_code IS 'Postal/ZIP code';
COMMENT ON COLUMN dynamic.property.state_province IS 'State, province, or region';
COMMENT ON COLUMN dynamic.property.phone_number IS 'Phone number in international format (e.g. +34612345678)';
COMMENT ON COLUMN dynamic.property.website IS 'Property website URL';
COMMENT ON COLUMN dynamic.property.cif IS 'Tax identification number';
COMMENT ON COLUMN dynamic.property.number_of_rooms IS 'Total number of rooms in the property';
COMMENT ON COLUMN dynamic.property.property_type IS 'Type of property: hotel, apartment, hostel, guesthouse, other';
COMMENT ON COLUMN dynamic.property.latitude IS 'Latitude coordinate';
COMMENT ON COLUMN dynamic.property.longitude IS 'Longitude coordinate';
COMMENT ON COLUMN dynamic.property.pms_id IS 'Foreign key reference to property management system';
COMMENT ON COLUMN dynamic.property.rm_email IS 'Revenue manager email for the property';
COMMENT ON COLUMN dynamic.property.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN dynamic.property.updated_at IS 'Timestamp when the record was last updated';
COMMENT ON COLUMN dynamic.property.is_active IS 'Flag indicating if this property is currently active';

-- Create dynamic pricing general settings table
CREATE TABLE IF NOT EXISTS dynamic.dp_general_settings (
    property_id VARCHAR PRIMARY KEY REFERENCES dynamic.property(id),
    user_id INTEGER NOT NULL REFERENCES auth_user(id),
    min_competitors INTEGER NOT NULL DEFAULT 2,
    comp_price_calculation VARCHAR(255) NOT NULL DEFAULT 'min',
    future_days_to_price INTEGER NOT NULL DEFAULT 365,
    pricing_status VARCHAR(255) NOT NULL DEFAULT 'offline',
    los_status VARCHAR(255) NOT NULL DEFAULT 'offline',
    otas_price_diff FLOAT NOT NULL DEFAULT 0,
    los_num_competitors INTEGER NOT NULL DEFAULT 2,
    los_aggregation VARCHAR(255) NOT NULL DEFAULT 'min',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE dynamic.dp_general_settings IS 'Dynamic pricing general settings for each property. Contains user ownership, pricing configuration, and LOS-specific settings.';

-- Add column comments for dp_general_settings
COMMENT ON COLUMN dynamic.dp_general_settings.property_id IS 'Primary key and foreign key reference to the property';
COMMENT ON COLUMN dynamic.dp_general_settings.min_competitors IS 'Minimum number of competitors required for pricing (default: 2)';
COMMENT ON COLUMN dynamic.dp_general_settings.comp_price_calculation IS 'Method for calculating competitor base price (default: min)';
COMMENT ON COLUMN dynamic.dp_general_settings.future_days_to_price IS 'Number of future days to price (default: 365)';
COMMENT ON COLUMN dynamic.dp_general_settings.pricing_status IS 'Dynamic pricing configuration status (default: offline)';
COMMENT ON COLUMN dynamic.dp_general_settings.los_status IS 'Dynamic length of stay configuration status (default: offline)';
COMMENT ON COLUMN dynamic.dp_general_settings.otas_price_diff IS 'Price difference for OTAs (default: 0)';
COMMENT ON COLUMN dynamic.dp_general_settings.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN dynamic.dp_general_settings.updated_at IS 'Timestamp when the record was last updated';

-- Create dynamic pricing property competitor table
CREATE TABLE IF NOT EXISTS dynamic.dp_property_competitor (
    property_id VARCHAR NOT NULL REFERENCES dynamic.property(id),
    user_id INTEGER NOT NULL REFERENCES auth_user(id),
    competitor_id VARCHAR NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    only_follow BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (property_id, competitor_id)
);

COMMENT ON TABLE dynamic.dp_property_competitor IS 'Property-competitor relationships for dynamic pricing. Links properties to their competitors with user ownership tracking.';



-- Add column comments for dp_property_competitor
COMMENT ON COLUMN dynamic.dp_property_competitor.property_id IS 'Foreign key reference to the property (part of composite primary key)';
COMMENT ON COLUMN dynamic.dp_property_competitor.competitor_id IS 'Foreign key reference to booking.competitors (part of composite primary key)';
COMMENT ON COLUMN dynamic.dp_property_competitor.deleted_at IS 'Soft delete timestamp';
COMMENT ON COLUMN dynamic.dp_property_competitor.only_follow IS 'Whether to only follow this competitor without full tracking';
COMMENT ON COLUMN dynamic.dp_property_competitor.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN dynamic.dp_property_competitor.updated_at IS 'Timestamp when the record was last updated';



-- Create dynamic pricing increments v2 table (category-based format)
CREATE TABLE IF NOT EXISTS dynamic.dp_dynamic_increments_v2 (
    property_id VARCHAR NOT NULL REFERENCES dynamic.property(id),
    user_id INTEGER NOT NULL REFERENCES auth_user(id),
    occupancy_category VARCHAR(10) NOT NULL DEFAULT '50-70',
    lead_time_category VARCHAR(10) NOT NULL DEFAULT '3-7',
    increment_type VARCHAR(255) NOT NULL DEFAULT 'Additional',
    increment_value FLOAT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (property_id, occupancy_category, lead_time_category)
);

COMMENT ON TABLE dynamic.dp_dynamic_increments_v2 IS 'Dynamic pricing increments v2 (category-based format). Defines pricing increments based on occupancy and lead time categories with user ownership.';

-- Add column comments for dp_dynamic_increments_v2
COMMENT ON COLUMN dynamic.dp_dynamic_increments_v2.property_id IS 'Foreign key reference to the property (part of composite primary key)';
COMMENT ON COLUMN dynamic.dp_dynamic_increments_v2.occupancy_category IS 'Occupancy level category (0-30, 30-50, 50-70, 70-80, 80-90, 90-100, 100+)';
COMMENT ON COLUMN dynamic.dp_dynamic_increments_v2.lead_time_category IS 'Lead time category (0-1, 1-3, 3-7, 7-14, 14-30, 30-45, 45-60, 60+ days)';
COMMENT ON COLUMN dynamic.dp_dynamic_increments_v2.increment_type IS 'Type of increment: "Percentage" or "Additional" (defaults to "Additional")';
COMMENT ON COLUMN dynamic.dp_dynamic_increments_v2.increment_value IS 'Increment value for the given occupancy and lead time category combination';
COMMENT ON COLUMN dynamic.dp_dynamic_increments_v2.user_id IS 'User who created this dynamic increment';
COMMENT ON COLUMN dynamic.dp_dynamic_increments_v2.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN dynamic.dp_dynamic_increments_v2.updated_at IS 'Timestamp when the record was last updated';

-- Create dynamic pricing offer increments table
CREATE TABLE IF NOT EXISTS dynamic.dp_offer_increments (
    property_id VARCHAR NOT NULL REFERENCES dynamic.property(id),
    user_id INTEGER NOT NULL REFERENCES auth_user(id),
    offer_name VARCHAR(255),
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,
    applied_from_days INTEGER,
    applied_until_days INTEGER,
    increment_type VARCHAR(255) NOT NULL DEFAULT 'Additional',
    increment_value INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (property_id, valid_from, valid_until)
);

COMMENT ON TABLE dynamic.dp_offer_increments IS 'Dynamic pricing offer increments. Defines special pricing offers with validity periods and application rules.';

-- Add column comments for dp_offer_increments
COMMENT ON COLUMN dynamic.dp_offer_increments.property_id IS 'Foreign key reference to the property (part of composite primary key)';
COMMENT ON COLUMN dynamic.dp_offer_increments.offer_name IS 'Optional name of the offer (e.g., "10% SUPL.OTAS")';
COMMENT ON COLUMN dynamic.dp_offer_increments.valid_from IS 'Start date of the offer validity period (part of composite primary key)';
COMMENT ON COLUMN dynamic.dp_offer_increments.valid_until IS 'End date of the offer validity period (part of composite primary key)';
COMMENT ON COLUMN dynamic.dp_offer_increments.applied_from_days IS 'Days prior to checkin when offer starts applying (nullable)';
COMMENT ON COLUMN dynamic.dp_offer_increments.applied_until_days IS 'Days prior to checkin when offer stops applying (nullable)';
COMMENT ON COLUMN dynamic.dp_offer_increments.increment_type IS 'Type of increment: "Percentage" or "Additional" (defaults to "Additional")';
COMMENT ON COLUMN dynamic.dp_offer_increments.increment_value IS 'Increment value for the offer';
COMMENT ON COLUMN dynamic.dp_offer_increments.user_id IS 'User who created this offer increment';
COMMENT ON COLUMN dynamic.dp_offer_increments.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN dynamic.dp_offer_increments.updated_at IS 'Timestamp when the record was last updated';

-- Create dynamic pricing LOS setup table
CREATE TABLE IF NOT EXISTS dynamic.dp_los_setup (
    id SERIAL PRIMARY KEY,
    property_id VARCHAR NOT NULL REFERENCES dynamic.property(id),
    valid_from DATE NOT NULL,
    day_of_week VARCHAR NOT NULL DEFAULT 'Monday',
    valid_until DATE NOT NULL,
    los_value INTEGER NOT NULL DEFAULT 1,
    user_id INTEGER REFERENCES auth_user(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (property_id, valid_from, day_of_week)
);

-- Add column comments for dp_los_setup
COMMENT ON COLUMN dynamic.dp_los_setup.property_id IS 'Foreign key reference to the property (part of composite primary key)';
COMMENT ON COLUMN dynamic.dp_los_setup.valid_from IS 'Start date of the LOS setup period (part of composite primary key)';
COMMENT ON COLUMN dynamic.dp_los_setup.day_of_week IS 'Day of week: "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday" (part of composite primary key, default: Monday)';
COMMENT ON COLUMN dynamic.dp_los_setup.valid_until IS 'End date of the LOS setup period';
COMMENT ON COLUMN dynamic.dp_los_setup.los_value IS 'The LOS value for this day of week (default: 1)';
COMMENT ON COLUMN dynamic.dp_los_setup.user_id IS 'User who created this LOS setup';
COMMENT ON COLUMN dynamic.dp_los_setup.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN dynamic.dp_los_setup.updated_at IS 'Timestamp when the record was last updated';

-- Create dynamic pricing LOS reduction table
CREATE TABLE IF NOT EXISTS dynamic.dp_los_reduction (
    id SERIAL PRIMARY KEY,
    property_id VARCHAR NOT NULL REFERENCES dynamic.property(id),
    occupancy_category VARCHAR(10) NOT NULL DEFAULT '50-70',
    lead_time_category VARCHAR(10) NOT NULL DEFAULT '7-14',
    los_value INTEGER NOT NULL DEFAULT 1,
    user_id INTEGER REFERENCES auth_user(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (property_id, occupancy_category, lead_time_category)
);

-- Add column comments for dp_los_reduction
COMMENT ON COLUMN dynamic.dp_los_reduction.property_id IS 'Foreign key reference to the property (part of unique constraint)';
COMMENT ON COLUMN dynamic.dp_los_reduction.occupancy_category IS 'Occupancy level category (0-30, 30-50, 50-70, 70-80, 80-90, 90-100, 100+, default: 50-70, part of unique constraint)';
COMMENT ON COLUMN dynamic.dp_los_reduction.lead_time_category IS 'Lead time category (0-1, 1-3, 3-7, 7-14, 14-30, 30-45, 45-60, 60+ days, default: 7-14, part of unique constraint)';
COMMENT ON COLUMN dynamic.dp_los_reduction.los_value IS 'The LOS value to reduce from (default: 1)';
COMMENT ON COLUMN dynamic.dp_los_reduction.user_id IS 'User who created this LOS reduction';
COMMENT ON COLUMN dynamic.dp_los_reduction.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN dynamic.dp_los_reduction.updated_at IS 'Timestamp when the record was last updated';


-- Create minimum selling price table
CREATE TABLE IF NOT EXISTS dynamic.dp_minimum_selling_price (
    id SERIAL PRIMARY KEY,
    property_id VARCHAR NOT NULL REFERENCES dynamic.property(id),
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,
    msp INTEGER NOT NULL,
    period_title VARCHAR(255),
    user_id INTEGER REFERENCES auth_user(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (property_id, valid_from)
);

-- Add column comments for dp_minimum_selling_price
COMMENT ON COLUMN dynamic.dp_minimum_selling_price.property_id IS 'Foreign key reference to the property (part of composite primary key)';
COMMENT ON COLUMN dynamic.dp_minimum_selling_price.valid_from IS 'Start date of the pricing period (part of composite primary key)';
COMMENT ON COLUMN dynamic.dp_minimum_selling_price.valid_until IS 'End date of the pricing period (nullable)';
COMMENT ON COLUMN dynamic.dp_minimum_selling_price.msp IS 'Market Selling Price for the period';
COMMENT ON COLUMN dynamic.dp_minimum_selling_price.period_title IS 'Optional name for this MSP period';
COMMENT ON COLUMN dynamic.dp_minimum_selling_price.user_id IS 'User who created this minimum selling price';
COMMENT ON COLUMN dynamic.dp_minimum_selling_price.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN dynamic.dp_minimum_selling_price.updated_at IS 'Timestamp when the record was last updated';



-- Create room rates table
CREATE TABLE IF NOT EXISTS dynamic.dp_room_rates (
    id SERIAL PRIMARY KEY,
    property_id VARCHAR NOT NULL REFERENCES dynamic.property(id),
    rate_id VARCHAR NOT NULL,
    increment_type VARCHAR NOT NULL DEFAULT 'Additional',
    increment_value INTEGER DEFAULT 0,
    is_base_rate BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (property_id, rate_id)
);

-- Add column comments for dp_room_rates
COMMENT ON COLUMN dynamic.dp_room_rates.property_id IS 'Foreign key reference to the property (part of composite primary key)';
COMMENT ON COLUMN dynamic.dp_room_rates.rate_id IS 'Rate ID (e.g., "2105839", "2133289") (part of composite primary key)';
COMMENT ON COLUMN dynamic.dp_room_rates.increment_type IS 'Type of increment: "Percentage" or "Additional" (defaults to "Additional")';
COMMENT ON COLUMN dynamic.dp_room_rates.increment_value IS 'Increment value (defaults to 0 if no value)';
COMMENT ON COLUMN dynamic.dp_room_rates.is_base_rate IS 'Flag indicating if this rate is the base rate for the property (defaults to FALSE)';
COMMENT ON COLUMN dynamic.dp_room_rates.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN dynamic.dp_room_rates.updated_at IS 'Timestamp when the record was last updated';

-- Create price change history table
CREATE TABLE IF NOT EXISTS dynamic.dp_price_change_history (
    id SERIAL PRIMARY KEY,
    property_id VARCHAR NOT NULL REFERENCES dynamic.property(id),
    user_id INTEGER NOT NULL REFERENCES auth_user(id),
    pms_hotel_id VARCHAR NOT NULL,
    checkin_date DATE NOT NULL,
    as_of TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Key pricing data
    occupancy FLOAT,
    msp INTEGER NOT NULL,
    recom_price INTEGER NOT NULL,
    overwrite_price INTEGER,
    recom_los INTEGER NOT NULL,
    overwrite_los INTEGER,
    base_price INTEGER NOT NULL,
    base_price_choice VARCHAR NOT NULL,
    competitor_average FLOAT,
    
    UNIQUE(property_id, checkin_date, as_of)
);

-- Add column comments for dp_price_change_history
COMMENT ON COLUMN dynamic.dp_price_change_history.id IS 'Primary key (auto-incrementing)';
COMMENT ON COLUMN dynamic.dp_price_change_history.property_id IS 'Foreign key reference to the property (part of unique constraint)';
COMMENT ON COLUMN dynamic.dp_price_change_history.user_id IS 'User who owns this property (foreign key reference to auth_user)';
COMMENT ON COLUMN dynamic.dp_price_change_history.pms_hotel_id IS 'PMS hotel ID for the property';
COMMENT ON COLUMN dynamic.dp_price_change_history.checkin_date IS 'Date for which the price change was calculated (part of unique constraint)';
COMMENT ON COLUMN dynamic.dp_price_change_history.as_of IS 'Timestamp when the data was captured (part of unique constraint)';
COMMENT ON COLUMN dynamic.dp_price_change_history.occupancy IS 'Occupancy level';
COMMENT ON COLUMN dynamic.dp_price_change_history.msp IS 'Minimum Selling Price';
COMMENT ON COLUMN dynamic.dp_price_change_history.recom_price IS 'Recommended price';
COMMENT ON COLUMN dynamic.dp_price_change_history.overwrite_price IS 'Overwrite price (from RM)';
COMMENT ON COLUMN dynamic.dp_price_change_history.recom_los IS 'Recommended LOS';
COMMENT ON COLUMN dynamic.dp_price_change_history.overwrite_los IS 'Overwrite LOS (from RM)';
COMMENT ON COLUMN dynamic.dp_price_change_history.base_price IS 'Base price used in calculation';
COMMENT ON COLUMN dynamic.dp_price_change_history.base_price_choice IS 'Source of base price: "competitor" or "manual"';

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_dp_price_change_history_latest ON dynamic.dp_price_change_history(property_id, checkin_date, as_of DESC);
CREATE INDEX IF NOT EXISTS idx_dp_price_change_history_date ON dynamic.dp_price_change_history(checkin_date);

-- ============================================================================
-- NEW TABLES ADDED TO MATCH DJANGO MODELS
-- ============================================================================


-- Note: DpHistoricalCompetitorPrice references existing booking.historical_competitor_prices table
-- No new table creation needed - the Django model will reference the existing booking schema table

-- Create CompetitorCandidate table
CREATE TABLE IF NOT EXISTS dynamic.competitor_candidate (
    id SERIAL PRIMARY KEY,
    property_id VARCHAR NOT NULL REFERENCES dynamic.property(id),
    competitor_name VARCHAR(255) NOT NULL,
    booking_link VARCHAR,
    suggested_by_user BOOLEAN NOT NULL DEFAULT FALSE,
    similarity_score FLOAT,
    status VARCHAR(20) NOT NULL DEFAULT 'processing',
    only_follow BOOLEAN NOT NULL DEFAULT FALSE,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    user_id INTEGER REFERENCES auth_user(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    error_message TEXT,
    UNIQUE(property_id, competitor_name)
);

COMMENT ON TABLE dynamic.competitor_candidate IS 'Competitor candidates for properties - stores suggested competitors before they become active';
COMMENT ON COLUMN dynamic.competitor_candidate.property_id IS 'Foreign key reference to the property';
COMMENT ON COLUMN dynamic.competitor_candidate.competitor_name IS 'Name of the competitor hotel';
COMMENT ON COLUMN dynamic.competitor_candidate.booking_link IS 'Booking.com URL for the competitor (VARCHAR for URL validation)';
COMMENT ON COLUMN dynamic.competitor_candidate.suggested_by_user IS 'Whether this competitor was suggested by the user';
COMMENT ON COLUMN dynamic.competitor_candidate.similarity_score IS 'AI-generated similarity score (0.0 to 1.0)';
COMMENT ON COLUMN dynamic.competitor_candidate.status IS 'Current processing status: processing, finished, error';
COMMENT ON COLUMN dynamic.competitor_candidate.only_follow IS 'Whether to only follow this competitor without creating a full competitor record';
COMMENT ON COLUMN dynamic.competitor_candidate.deleted IS 'Soft delete flag';
COMMENT ON COLUMN dynamic.competitor_candidate.user_id IS 'User who suggested this competitor';
COMMENT ON COLUMN dynamic.competitor_candidate.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN dynamic.competitor_candidate.updated_at IS 'Timestamp when the record was last updated';
COMMENT ON COLUMN dynamic.competitor_candidate.processed_at IS 'When the candidate was processed';
COMMENT ON COLUMN dynamic.competitor_candidate.error_message IS 'Error message if status is error';

-- Create junction tables for many-to-many relationships
CREATE TABLE IF NOT EXISTS dynamic.property_profiles (
    property_id VARCHAR NOT NULL REFERENCES dynamic.property(id),
    profile_id INTEGER NOT NULL REFERENCES profile(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (property_id, profile_id)
);

COMMENT ON TABLE dynamic.property_profiles IS 'Many-to-many relationship between properties and profiles';
COMMENT ON COLUMN dynamic.property_profiles.property_id IS 'Foreign key reference to the property (part of composite primary key)';
COMMENT ON COLUMN dynamic.property_profiles.profile_id IS 'Foreign key reference to profile table (part of composite primary key)';
COMMENT ON COLUMN dynamic.property_profiles.created_at IS 'Timestamp when the relationship was created';
COMMENT ON COLUMN dynamic.property_profiles.updated_at IS 'Timestamp when the relationship was last updated';


-- Create additional indexes for new tables
-- Note: dp_historical_competitor_price references booking.historical_competitor_prices (indexes already exist)
CREATE INDEX IF NOT EXISTS idx_competitor_candidate_property ON dynamic.competitor_candidate(property_id);
CREATE INDEX IF NOT EXISTS idx_competitor_candidate_status ON dynamic.competitor_candidate(status);
CREATE INDEX IF NOT EXISTS idx_competitor_candidate_created_at ON dynamic.competitor_candidate(created_at);
CREATE INDEX IF NOT EXISTS idx_competitor_candidate_deleted_status ON dynamic.competitor_candidate(deleted, status);
CREATE INDEX IF NOT EXISTS idx_property_profiles_property ON dynamic.property_profiles(property_id);
CREATE INDEX IF NOT EXISTS idx_property_profiles_profile ON dynamic.property_profiles(profile_id);
CREATE INDEX IF NOT EXISTS idx_property_pms_id ON dynamic.property(pms_id);
CREATE INDEX IF NOT EXISTS idx_property_property_type ON dynamic.property(property_type);
CREATE INDEX IF NOT EXISTS idx_property_city_country ON dynamic.property(city, country);

GRANT USAGE ON SCHEMA dynamic TO dynamic_writer;
GRANT SELECT, INSERT, UPDATE, DELETE ON dynamic.property TO dynamic_writer;
GRANT SELECT, INSERT, UPDATE, DELETE ON dynamic.property_management_system TO dynamic_writer;
GRANT SELECT, INSERT, UPDATE, DELETE ON dynamic.dp_general_settings TO dynamic_writer;
GRANT SELECT, INSERT, UPDATE, DELETE ON dynamic.dp_property_competitor TO dynamic_writer;

GRANT SELECT, INSERT, UPDATE, DELETE ON dynamic.dp_dynamic_increments_v2 TO dynamic_writer;
GRANT SELECT, INSERT, UPDATE, DELETE ON dynamic.dp_offer_increments TO dynamic_writer;
GRANT SELECT, INSERT, UPDATE, DELETE ON dynamic.dp_los_setup TO dynamic_writer;
GRANT SELECT, INSERT, UPDATE, DELETE ON dynamic.dp_los_reduction TO dynamic_writer;
GRANT SELECT, INSERT, UPDATE, DELETE ON dynamic.dp_minimum_selling_price TO dynamic_writer;
GRANT SELECT, INSERT, UPDATE, DELETE ON dynamic.dp_room_rates TO dynamic_writer;
GRANT SELECT, INSERT, UPDATE, DELETE ON dynamic.dp_price_change_history TO dynamic_writer;
-- Note: dp_historical_competitor_price references booking.historical_competitor_prices (already has permissions)
GRANT SELECT, INSERT, UPDATE, DELETE ON dynamic.competitor_candidate TO dynamic_writer;
GRANT SELECT, INSERT, UPDATE, DELETE ON dynamic.property_profiles TO dynamic_writer;

-- Grant sequence permissions to dynamic_writer
GRANT USAGE, SELECT ON SEQUENCE dynamic.property_management_system_id_seq TO dynamic_writer;
GRANT USAGE, SELECT ON SEQUENCE dynamic.competitor_candidate_id_seq TO dynamic_writer;
GRANT USAGE, SELECT ON SEQUENCE dynamic.dp_price_change_history_id_seq TO dynamic_writer;
GRANT USAGE, SELECT ON SEQUENCE dynamic.dp_property_competitor_id_seq TO dynamic_writer;
GRANT USAGE, SELECT ON SEQUENCE dynamic.dp_dynamic_increments_v2_id_seq TO dynamic_writer;
GRANT USAGE, SELECT ON SEQUENCE dynamic.dp_offer_increments_id_seq TO dynamic_writer;
GRANT USAGE, SELECT ON SEQUENCE dynamic.dp_los_setup_id_seq TO dynamic_writer;
GRANT USAGE, SELECT ON SEQUENCE dynamic.dp_los_reduction_id_seq TO dynamic_writer;
GRANT USAGE, SELECT ON SEQUENCE dynamic.dp_minimum_selling_price_id_seq TO dynamic_writer;
GRANT USAGE, SELECT ON SEQUENCE dynamic.dp_room_rates_id_seq TO dynamic_writer;

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
GRANT SELECT ON dynamic.property_management_system TO webapp_writer;
GRANT SELECT ON dynamic.dp_general_settings TO webapp_writer;
GRANT SELECT ON dynamic.dp_property_competitor TO webapp_writer;

GRANT SELECT ON dynamic.dp_dynamic_increments_v2 TO webapp_writer;
GRANT SELECT ON dynamic.dp_offer_increments TO webapp_writer;
GRANT SELECT ON dynamic.dp_los_setup TO webapp_writer;
GRANT SELECT ON dynamic.dp_los_reduction TO webapp_writer;
GRANT SELECT ON dynamic.dp_minimum_selling_price TO webapp_writer;
GRANT SELECT ON dynamic.dp_room_rates TO webapp_writer;
GRANT SELECT ON dynamic.dp_price_change_history TO webapp_writer;
-- Note: dp_historical_competitor_price references booking.historical_competitor_prices (already has permissions)
GRANT SELECT ON dynamic.competitor_candidate TO webapp_writer;
GRANT SELECT ON dynamic.property_profiles TO webapp_writer;

-- Grant sequence permissions to webapp_writer (read access only)
GRANT SELECT ON SEQUENCE dynamic.property_management_system_id_seq TO webapp_writer;
GRANT SELECT ON SEQUENCE dynamic.competitor_candidate_id_seq TO webapp_writer;
GRANT SELECT ON SEQUENCE dynamic.dp_price_change_history_id_seq TO webapp_writer;
GRANT SELECT ON SEQUENCE dynamic.dp_property_competitor_id_seq TO webapp_writer;
GRANT SELECT ON SEQUENCE dynamic.dp_dynamic_increments_v2_id_seq TO webapp_writer;
GRANT SELECT ON SEQUENCE dynamic.dp_offer_increments_id_seq TO webapp_writer;
GRANT SELECT ON SEQUENCE dynamic.dp_los_setup_id_seq TO webapp_writer;
GRANT SELECT ON SEQUENCE dynamic.dp_los_reduction_id_seq TO webapp_writer;
GRANT SELECT ON SEQUENCE dynamic.dp_minimum_selling_price_id_seq TO webapp_writer;
GRANT SELECT ON SEQUENCE dynamic.dp_room_rates_id_seq TO webapp_writer;

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

-- Information schema (for metadata access) - COMMENTED OUT TO AVOID sql_parts ERROR
-- GRANT USAGE ON SCHEMA information_schema TO webapp_writer;
-- GRANT SELECT ON ALL TABLES IN SCHEMA information_schema TO webapp_writer;

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

