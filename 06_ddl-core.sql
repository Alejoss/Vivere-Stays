-- Create core schema and unified reservations tables
-- This file creates the schema and tables for consolidating reservation data from all PMSs

-- Create core schema
CREATE SCHEMA IF NOT EXISTS core;

-- Create unified reservations table (simplified for KPI calculations only)
CREATE TABLE IF NOT EXISTS core.unified_reservations (
    -- Primary identifiers
    reservation_id VARCHAR NOT NULL,
    property_id VARCHAR NOT NULL, -- Internal property ID (unique across all PMSs)
    pms_source VARCHAR NOT NULL, -- 'apaleo' or 'mrplan'
    pms_hotel_id VARCHAR NOT NULL, -- PMS-specific hotel identifier
    
    -- Booking identifier (to distinguish between bookings and reservations)
    booking_id VARCHAR NOT NULL, -- Customer's booking request ID
    
    -- Essential dates for KPI calculations
    checkin_date DATE NOT NULL,
    checkout_date DATE NOT NULL,
    
    -- Guest information (needed for occupancy calculations)
    total_guests INTEGER NOT NULL DEFAULT 0,
    
    -- Financial information (needed for RevPAR, ADR, and revenue)
    price DECIMAL(10,2) NOT NULL,
    
    -- Status (needed to filter active vs cancelled reservations)
    status VARCHAR NOT NULL,
    
    -- Data tracking
    last_updated TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Primary key and constraints
    PRIMARY KEY (reservation_id, property_id),
    
    -- Foreign key constraint to ensure property_id exists in dynamic.property
    CONSTRAINT fk_unified_reservations_property 
        FOREIGN KEY (property_id) REFERENCES dynamic.property(id),
    
    -- Indexes for performance (only essential ones)
    CONSTRAINT valid_dates CHECK (checkin_date <= checkout_date),
    CONSTRAINT valid_guests CHECK (total_guests > 0),
    CONSTRAINT valid_price CHECK (price >= 0)
);

-- Create only essential indexes for main query patterns
CREATE INDEX IF NOT EXISTS idx_unified_reservations_property_date 
ON core.unified_reservations(property_id, checkin_date, checkout_date);

CREATE INDEX IF NOT EXISTS idx_unified_reservations_pms_source 
ON core.unified_reservations(property_id, pms_source);

-- Create daily performance table for aggregated KPIs
CREATE TABLE IF NOT EXISTS core.daily_performance (
    property_id VARCHAR NOT NULL,
    pms_source VARCHAR NOT NULL,
    kpi_date DATE NOT NULL,
    metric_type VARCHAR NOT NULL, -- 'actual', 'prev_year_actual', 'bob', 'prev_year_bob'
    total_units INTEGER NOT NULL DEFAULT 0,
    available_units INTEGER NOT NULL DEFAULT 0,
    units_reserved INTEGER NOT NULL DEFAULT 0,
    total_guests INTEGER NOT NULL DEFAULT 0,
    guests_reserved INTEGER NOT NULL DEFAULT 0,
    daily_revenue DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_bookings INTEGER NOT NULL DEFAULT 0, -- Unique booking requests
    total_room_nights INTEGER NOT NULL DEFAULT 0, -- Total room nights
    occupancy_rate DECIMAL(5,2) NOT NULL DEFAULT 0, -- Percentage
    revpar DECIMAL(10,2) NOT NULL DEFAULT 0, -- Revenue per available room
    adr DECIMAL(10,2) NOT NULL DEFAULT 0, -- Average daily rate
    last_updated TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (property_id, kpi_date, metric_type),
    
    -- Foreign key constraint to ensure property_id exists in dynamic.property
    CONSTRAINT fk_daily_performance_property 
        FOREIGN KEY (property_id) REFERENCES dynamic.property(id),
    
    CONSTRAINT valid_occupancy CHECK (occupancy_rate >= 0 AND occupancy_rate <= 100),
    CONSTRAINT valid_units CHECK (total_units >= 0 AND available_units >= 0 AND units_reserved >= 0),
    CONSTRAINT valid_revenue CHECK (daily_revenue >= 0),
    CONSTRAINT valid_metric_type CHECK (metric_type IN ('actual', 'prev_year_actual', 'bob', 'prev_year_bob'))
);

-- Create indexes for daily performance table
CREATE INDEX IF NOT EXISTS idx_daily_performance_property_date 
ON core.daily_performance(property_id, kpi_date);

CREATE INDEX IF NOT EXISTS idx_daily_performance_metric_type 
ON core.daily_performance(metric_type);

-- Create unified rooms and rates table for consolidating room and rate data from all PMSs
CREATE TABLE IF NOT EXISTS core.unified_rooms_and_rates (
    id SERIAL PRIMARY KEY,
    property_id VARCHAR NOT NULL REFERENCES dynamic.property(id),
    pms_source VARCHAR(50) NOT NULL,
    pms_hotel_id VARCHAR(255) NOT NULL,
    room_id VARCHAR(255) NOT NULL,
    rate_id VARCHAR(255) NOT NULL,
    room_name VARCHAR(255) NOT NULL,
    room_description TEXT,
    rate_name VARCHAR(255) NOT NULL,
    rate_description TEXT,
    rate_category VARCHAR(255),
    last_updated TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_room_rate UNIQUE (property_id, room_id, rate_id)
);

COMMENT ON TABLE core.unified_rooms_and_rates IS 'Unified rooms and rates table for consolidating room and rate data from all PMSs. Links properties to their room and rate configurations with proper field length constraints and unique constraints instead of composite primary keys.';
COMMENT ON COLUMN core.unified_rooms_and_rates.id IS 'Primary key for the unified rooms and rates record';

-- Create essential indexes for main query patterns
CREATE INDEX IF NOT EXISTS idx_unified_rooms_rates_property 
ON core.unified_rooms_and_rates(property_id);

CREATE INDEX IF NOT EXISTS idx_unified_rooms_rates_pms_source 
ON core.unified_rooms_and_rates(property_id, pms_source);

CREATE INDEX IF NOT EXISTS idx_unified_rooms_rates_room 
ON core.unified_rooms_and_rates(property_id, room_id);

-- Grant permissions
GRANT USAGE ON SCHEMA core TO webapp_writer, dynamic_writer;
GRANT SELECT, INSERT, UPDATE ON core.unified_reservations TO webapp_writer, dynamic_writer;
GRANT SELECT, INSERT, UPDATE ON core.daily_performance TO webapp_writer, dynamic_writer;
GRANT SELECT, INSERT, UPDATE ON core.unified_rooms_and_rates TO webapp_writer, dynamic_writer;
