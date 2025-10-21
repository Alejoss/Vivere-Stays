-- this file was run manually as initial DDL setup
\connect defaultdb;
CREATE SCHEMA booking;
CREATE TABLE booking.price_history (
	hotel_id VARCHAR NOT NULL,
	hotel_name VARCHAR NOT NULL,
	checkin_date DATE NOT NULL,
	checkout_date DATE NOT NULL,
	los_message VARCHAR,
	min_los INTEGER,
	sold_out_message VARCHAR,
	b_id INTEGER NOT NULL,
	b_roomtype_id INTEGER NOT NULL,
	b_name VARCHAR,
	b_has_room_inventory BOOLEAN,
	"b_blocks.b_block_id" VARCHAR NOT NULL,
	"b_blocks.b_raw_price" FLOAT,
	"b_blocks.b_mealplan_included_name" VARCHAR,
	"b_blocks.b_cancellation_type" VARCHAR NOT NULL,
	"b_blocks.b_max_persons" INTEGER,
	"b_blocks.b_price" VARCHAR,
	"b_blocks.b_rate_is_genius" BOOLEAN,
	"b_blocks.b_nr_stays" INTEGER NOT NULL,
	"b_blocks.b_price_breakdown_simplified.b_excluded_charges_amount" FLOAT,
	"b_blocks.b_price_breakdown_simplified.b_tax_exception" FLOAT,
	"b_blocks.b_price_breakdown_simplified.b_strikethrough_price_amount" FLOAT,
	"b_blocks.b_book_now_pay_later" BOOLEAN,
	"b_blocks.b_price_breakdown_simplified.b_headline_price_amount" FLOAT,
	"b_blocks.b_price_breakdown_simplified.b_vm_products" JSONB [],
	"b_blocks.b_price_breakdown_simplified.b_reward_credit_amount" FLOAT,
	"b_blocks.b_stay_prices.b_price" VARCHAR,
	"b_blocks.b_stay_prices.b_local_price" FLOAT,
	"b_blocks.b_stay_prices.b_raw_price" FLOAT,
	"b_blocks.b_stay_prices.b_stays" INTEGER NOT NULL,
	"b_blocks.b_stay_prices.b_price_per_night" VARCHAR,
	as_of TIMESTAMP WITHOUT TIME ZONE NOT NULL,
	region VARCHAR(100) NULL DEFAULT NULL::character varying,
	taking_reservations BOOLEAN,
	PRIMARY KEY (hotel_id, checkin_date, checkout_date, b_id, b_roomtype_id, "b_blocks.b_block_id", "b_blocks.b_cancellation_type", "b_blocks.b_stay_prices.b_stays", as_of)
);
GRANT USAGE ON SCHEMA booking TO booking_writer;
GRANT INSERT, SELECT ON booking.price_history TO booking_writer;

-- Create archive table for old price history data
CREATE TABLE IF NOT EXISTS booking.price_history_archive (
	hotel_id VARCHAR NOT NULL,
	hotel_name VARCHAR NOT NULL,
	checkin_date DATE NOT NULL,
	checkout_date DATE NOT NULL,
	los_message VARCHAR,
	min_los INTEGER,
	sold_out_message VARCHAR,
	b_id INTEGER NOT NULL,
	b_roomtype_id INTEGER NOT NULL,
	b_name VARCHAR,
	b_has_room_inventory BOOLEAN,
	"b_blocks.b_block_id" VARCHAR NOT NULL,
	"b_blocks.b_raw_price" FLOAT,
	"b_blocks.b_mealplan_included_name" VARCHAR,
	"b_blocks.b_cancellation_type" VARCHAR NOT NULL,
	"b_blocks.b_max_persons" INTEGER,
	"b_blocks.b_price" VARCHAR,
	"b_blocks.b_rate_is_genius" BOOLEAN,
	"b_blocks.b_nr_stays" INTEGER NOT NULL,
	"b_blocks.b_price_breakdown_simplified.b_excluded_charges_amount" FLOAT,
	"b_blocks.b_price_breakdown_simplified.b_tax_exception" FLOAT,
	"b_blocks.b_price_breakdown_simplified.b_strikethrough_price_amount" FLOAT,
	"b_blocks.b_book_now_pay_later" BOOLEAN,
	"b_blocks.b_price_breakdown_simplified.b_headline_price_amount" FLOAT,
	"b_blocks.b_price_breakdown_simplified.b_vm_products" JSONB [],
	"b_blocks.b_price_breakdown_simplified.b_reward_credit_amount" FLOAT,
	"b_blocks.b_stay_prices.b_price" VARCHAR,
	"b_blocks.b_stay_prices.b_local_price" FLOAT,
	"b_blocks.b_stay_prices.b_raw_price" FLOAT,
	"b_blocks.b_stay_prices.b_stays" INTEGER NOT NULL,
	"b_blocks.b_stay_prices.b_price_per_night" VARCHAR,
	as_of TIMESTAMP WITHOUT TIME ZONE NOT NULL,
	region VARCHAR(100) NULL DEFAULT NULL::character varying,
	archive_date TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (hotel_id, checkin_date, checkout_date, b_id, b_roomtype_id, "b_blocks.b_block_id", "b_blocks.b_cancellation_type", "b_blocks.b_stay_prices.b_stays", as_of)
);

-- Create indexes for archive table
CREATE INDEX IF NOT EXISTS idx_price_history_archive_checkin_date 
ON booking.price_history_archive (checkin_date);

CREATE INDEX IF NOT EXISTS idx_price_history_archive_hotel_id 
ON booking.price_history_archive (hotel_id);

CREATE INDEX IF NOT EXISTS idx_price_history_archive_as_of 
ON booking.price_history_archive (as_of);

-- Grant permissions on archive table
GRANT SELECT, INSERT ON booking.price_history_archive TO booking_writer;

CREATE TABLE IF NOT EXISTS booking.competitors (
	competitor_id VARCHAR,
	competitor_name VARCHAR NOT NULL,
  booking_link VARCHAR NOT NULL,
  valid_from TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  valid_to TIMESTAMP WITHOUT TIME ZONE NULL,
	weekly_num_days INTEGER NOT NULL DEFAULT 180,
	region VARCHAR(100) NULL DEFAULT NULL::character varying,
	bimonthly_num_days INTEGER NOT NULL,
	quarterly_num_days INTEGER NOT NULL,
	morning_cutoff_hour_cet INTEGER,
	evening_cutoff_hour_cet INTEGER,
	morning_num_days INTEGER NOT NULL,
	evening_num_days INTEGER NOT NULL,
	country VARCHAR(25),
  PRIMARY KEY (competitor_id, valid_from)
);
INSERT INTO booking.competitors (competitor_id,competitor_name,booking_link,valid_from,valid_to,weekly_num_days,region,bimonthly_num_days,quarterly_num_days,morning_cutoff_hour_cet,evening_cutoff_hour_cet,morning_num_days,evening_num_days,country) VALUES
	 ('pension-kursaal-de-pensiones-con-encanto','Pension Kursaal','https://www.booking.com/hotel/es/pension-kursaal-de-pensiones-con-encanto.en-gb.html','2023-03-13 19:52:23.406108',NULL,180,'europe-west3',180,365,11,17,15,90,'ES'),
	 ('pension-altair','Pensión Altair','https://www.booking.com/hotel/es/pension-altair.en-gb.html','2023-03-13 19:52:23.406108',NULL,180,'europe-west3',180,365,11,17,15,90,'ES'),
	 ('pensia3n-urkia','Pensión Urkia','https://www.booking.com/hotel/es/pensia3n-urkia.en-gb.html','2023-03-13 19:52:23.406108',NULL,180,'europe-west3',180,365,11,17,15,90,'ES'),
	 ('pension-casa-nicolasa','Casa Nicolasa','https://www.booking.com/hotel/es/pension-casa-nicolasa.en-gb.html','2023-03-13 19:52:23.406108',NULL,180,'europe-west3',180,365,11,17,15,90,'ES'),
	 ('zaragoza-plaza','Hotel Zaragoza Plaza','https://www.booking.com/hotel/es/zaragoza-plaza.en-gb.html','2023-03-13 19:52:23.406108',NULL,180,'europe-west3',180,365,11,17,15,90,'ES'),
	 ('adarve','Adarve','https://www.booking.com/hotel/es/adarve.es.html','2023-03-13 19:52:23.406108',NULL,180,'europe-west3',180,365,11,17,15,90,'ES'),
	 ('cervantes-zafra','Cervantes Zafra','https://www.booking.com/hotel/es/cervantes-zafra.es.html','2023-03-13 19:52:23.406108',NULL,180,'europe-west3',180,365,11,17,15,90,'ES'),
	 ('plaza-grande','Plaza Grande','https://www.booking.com/hotel/es/plaza-grande.es.html','2023-03-13 19:52:23.406108',NULL,180,'europe-west3',180,365,11,17,15,90,'ES'),
	 ('hostal-carmen','Hostal Carmen','https://www.booking.com/hotel/es/hostal-carmen.es.html','2023-03-13 19:52:23.406108',NULL,180,'europe-west3',180,365,11,17,15,90,'ES'),
	 ('atalayas-extremadura','Atalayas Extremadura','https://www.booking.com/hotel/es/atalayas-extremadura.es.html','2023-03-13 19:52:23.406108',NULL,180,'europe-west3',180,365,11,17,15,90,'ES');
INSERT INTO booking.competitors (competitor_id,competitor_name,booking_link,valid_from,valid_to,weekly_num_days,region,bimonthly_num_days,quarterly_num_days,morning_cutoff_hour_cet,evening_cutoff_hour_cet,morning_num_days,evening_num_days,country) VALUES
	 ('hostal-universitat-cervera','Hostal Universitat','https://www.booking.com/hotel/es/hostal-universitat-cervera.es.html','2023-03-13 19:52:23.406108',NULL,180,'europe-west3',180,365,11,17,15,90,'ES'),
	 ('restaurante-blanc-i-negre-2','Restaurante Blanc i Negre','https://www.booking.com/hotel/es/restaurante-blanc-i-negre-2.es.html','2023-03-13 19:52:23.406108',NULL,180,'europe-west3',180,365,11,17,15,90,'ES'),
	 ('ciutat-de-tarrega','Hotel Ciutat de Tarrega','https://www.booking.com/hotel/es/ciutat-de-tarrega.es.html','2023-03-13 19:52:23.406108',NULL,180,'europe-west3',180,365,11,17,15,90,'ES'),
	 ('cal-feliuet','Cal Feliuet','https://www.booking.com/hotel/es/cal-feliuet.es.html','2023-03-13 19:52:23.406108',NULL,180,'europe-west3',180,365,11,17,15,90,'ES'),
	 ('ca-l-39-agustina','Ca l''Agustina','https://www.booking.com/hotel/es/ca-l-39-agustina.es.html','2023-03-13 19:52:23.406108',NULL,180,'europe-west3',180,365,11,17,15,90,'ES'),
	 ('pension-kursaal-de-pensiones-con-encanto','Pension Kursaal','https://www.booking.com/hotel/es/pension-kursaal-de-pensiones-con-encanto.en-gb.html','2023-03-13 19:48:23.728356','2023-03-13 19:52:23.406',180,'europe-west3',180,365,11,17,15,90,'ES'),
	 ('pension-altair','Pensión Altair','https://www.booking.com/hotel/es/pension-altair.en-gb.html','2023-03-13 19:48:23.728356','2023-03-13 19:52:23.406',180,'europe-west3',180,365,11,17,15,90,'ES'),
	 ('pensia3n-urkia','Pensión Urkia','https://www.booking.com/hotel/es/pensia3n-urkia.en-gb.html','2023-03-13 19:48:23.728356','2023-03-13 19:52:23.406',180,'europe-west3',180,365,11,17,15,90,'ES'),
	 ('pension-casa-nicolasa','Casa Nicolasa','https://www.booking.com/hotel/es/pension-casa-nicolasa.en-gb.html','2023-03-13 19:48:23.728356','2023-03-13 19:52:23.406',180,'europe-west3',180,365,11,17,15,90,'ES'),
	 ('zaragoza-plaza','Hotel Zaragoza Plaza','https://www.booking.com/hotel/es/zaragoza-plaza.en-gb.html','2023-03-13 19:48:23.728356','2023-03-13 19:52:23.406',180,'europe-west3',180,365,11,17,15,90,'ES');
INSERT INTO booking.competitors (competitor_id,competitor_name,booking_link,valid_from,valid_to,weekly_num_days,region,bimonthly_num_days,quarterly_num_days,morning_cutoff_hour_cet,evening_cutoff_hour_cet,morning_num_days,evening_num_days,country) VALUES
	 ('adarve','Adarve','https://www.booking.com/hotel/es/adarve.es.html','2023-03-13 19:48:23.728356','2023-03-13 19:52:23.406',180,'europe-west3',180,365,11,17,15,90,'ES'),
	 ('cervantes-zafra','Cervantes Zafra','https://www.booking.com/hotel/es/cervantes-zafra.es.html','2023-03-13 19:48:23.728356','2023-03-13 19:52:23.406',180,'europe-west3',180,365,11,17,15,90,'ES'),
	 ('plaza-grande','Plaza Grande','https://www.booking.com/hotel/es/plaza-grande.es.html','2023-03-13 19:48:23.728356','2023-03-13 19:52:23.406',180,'europe-west3',180,365,11,17,15,90,'ES'),
	 ('hostal-carmen','Hostal Carmen','https://www.booking.com/hotel/es/hostal-carmen.es.html','2023-03-13 19:48:23.728356','2023-03-13 19:52:23.406',180,'europe-west3',180,365,11,17,15,90,'ES'),
	 ('atalayas-extremadura','Atalayas Extremadura','https://www.booking.com/hotel/es/atalayas-extremadura.es.html','2023-03-13 19:48:23.728356','2023-03-13 19:52:23.406',180,'europe-west3',180,365,11,17,15,90,'ES'),
	 ('hostal-universitat-cervera','Hostal Universitat','https://www.booking.com/hotel/es/hostal-universitat-cervera.es.html','2023-03-13 19:48:23.728356','2023-03-13 19:52:23.406',180,'europe-west3',180,365,11,17,15,90,'ES'),
	 ('restaurante-blanc-i-negre-2','Restaurante Blanc i Negre','https://www.booking.com/hotel/es/restaurante-blanc-i-negre-2.es.html','2023-03-13 19:48:23.728356','2023-03-13 19:52:23.406',180,'europe-west3',180,365,11,17,15,90,'ES'),
	 ('pension-kursaal-de-pensiones-con-encanto','Pension Kursaal','https://www.booking.com/hotel/es/pension-kursaal-de-pensiones-con-encanto.en-gb.html','1900-01-01 00:00:00','2023-03-06 20:02:39.280984',180,'europe-west3',180,365,11,17,15,90,'ES'),
	 ('pension-altair','Pensión Altair','https://www.booking.com/hotel/es/pension-altair.en-gb.html','1900-01-01 00:00:00','2023-03-06 20:02:39.280984',180,'europe-west3',180,365,11,17,15,90,'ES'),
	 ('pensia3n-urkia','Pensión Urkia','https://www.booking.com/hotel/es/pensia3n-urkia.en-gb.html','1900-01-01 00:00:00','2023-03-06 20:02:39.280984',180,'europe-west3',180,365,11,17,15,90,'ES');
INSERT INTO booking.competitors (competitor_id,competitor_name,booking_link,valid_from,valid_to,weekly_num_days,region,bimonthly_num_days,quarterly_num_days,morning_cutoff_hour_cet,evening_cutoff_hour_cet,morning_num_days,evening_num_days,country) VALUES
	 ('pension-casa-nicolasa','Casa Nicolasa','https://www.booking.com/hotel/es/pension-casa-nicolasa.en-gb.html','1900-01-01 00:00:00','2023-03-06 20:02:39.280984',180,'europe-west3',180,365,11,17,15,90,'ES'),
	 ('zaragoza-plaza','Hotel Zaragoza Plaza','https://www.booking.com/hotel/es/zaragoza-plaza.en-gb.html','1900-01-01 00:00:00','2023-03-06 20:02:39.280984',180,'europe-west3',180,365,11,17,15,90,'ES'),
	 ('hostal-bar-restaurante-quot-la-fuente-quot','Hostal Quot La Fuente','https://www.booking.com/hotel/es/hostal-bar-restaurante-quot-la-fuente-quot.es.html','1900-01-01 00:00:00','2023-03-06 20:02:39.280984',180,'europe-west3',180,365,11,17,15,90,'ES'),
	 ('hostal-santiago-2-burgos','Hostal Santiago 2','https://www.booking.com/hotel/es/hostal-santiago-2-burgos.es.html','1900-01-01 00:00:00','2023-03-06 20:02:39.280984',180,'europe-west3',180,365,11,17,15,90,'ES'),
	 ('domus-buenos-aires','Domus Buenos Aires','https://www.booking.com/hotel/es/domus-buenos-aires.es.html','1900-01-01 00:00:00','2023-03-06 20:02:39.280984',180,'europe-west3',180,365,11,17,15,90,'ES'),
	 ('hostal-acanto','Hostal Acanto','https://www.booking.com/hotel/es/hostal-acanto.es.html','1900-01-01 00:00:00','2023-03-06 20:02:39.280984',180,'europe-west3',180,365,11,17,15,90,'ES'),
	 ('campus-tavern','Campus Tavern','https://www.booking.com/hotel/es/campus-tavern.es.html','1900-01-01 00:00:00','2023-03-06 20:02:39.280984',180,'europe-west3',180,365,11,17,15,90,'ES'),
	 ('hostal-universitat-cervera','Hostal Universitat Cervera','https://www.booking.com/hotel/es/hostal-universitat-cervera.es.html','1900-01-01 00:00:00','2023-03-06 20:02:39.280984',180,'europe-west3',180,365,11,17,15,90,'ES'),
	 ('restaurante-blanc-i-negre-2','Restaurante Blanc i Negre','https://www.booking.com/hotel/es/restaurante-blanc-i-negre-2.es.html','1900-01-01 00:00:00','2023-03-06 20:02:39.280984',180,'europe-west3',180,365,11,17,15,90,'ES'),
	 ('ciutat-de-tarrega','Hotel Ciutat de Tarrega','https://www.booking.com/hotel/es/ciutat-de-tarrega.es.html','2023-03-13 19:48:23.728356','2023-03-13 19:52:23.406',180,'europe-west3',180,365,11,17,15,90,'ES');
INSERT INTO booking.competitors (competitor_id,competitor_name,booking_link,valid_from,valid_to,weekly_num_days,region,bimonthly_num_days,quarterly_num_days,morning_cutoff_hour_cet,evening_cutoff_hour_cet,morning_num_days,evening_num_days,country) VALUES
	 ('cal-feliuet','Cal Feliuet','https://www.booking.com/hotel/es/cal-feliuet.es.html','2023-03-13 19:48:23.728356','2023-03-13 19:52:23.406',180,'europe-west3',180,365,11,17,15,90,'ES'),
	 ('ca-l-39-agustina','Ca l''Agustina','https://www.booking.com/hotel/es/ca-l-39-agustina.es.html','2023-03-13 19:48:23.728356','2023-03-13 19:52:23.406',180,'europe-west3',180,365,11,17,15,90,'ES'),
	 ('ciutat-de-tarrega','Ciutat De Tarrega','https://www.booking.com/hotel/es/ciutat-de-tarrega.es.html','1900-01-01 00:00:00','2023-03-06 20:02:39.280984',180,'europe-west3',180,365,11,17,15,90,'ES'),
	 ('cal-feliuet','Cal Feliuet','https://www.booking.com/hotel/es/cal-feliuet.es.html','1900-01-01 00:00:00','2023-03-06 20:02:39.280984',180,'europe-west3',180,365,11,17,15,90,'ES'),
	 ('ca-l-39-agustina','Ca L''Augustina','https://www.booking.com/hotel/es/ca-l-39-agustina.es.html','1900-01-01 00:00:00','2023-03-06 20:02:39.280984',180,'europe-west3',180,365,11,17,15,90,'ES');
GRANT SELECT ON booking.competitors TO booking_writer;

-- Create a table to store the competitor prices with historical data
CREATE TABLE IF NOT EXISTS booking.historical_competitor_prices (
  id SERIAL PRIMARY KEY,
  competitor_id VARCHAR NOT NULL,
  hotel_name VARCHAR(255) NOT NULL,
  room_name VARCHAR(255) NOT NULL,
  checkin_date DATE NOT NULL,
  checkout_date DATE NOT NULL,
  raw_price FLOAT,
  currency VARCHAR(10),
  cancellation_type VARCHAR(255),
  max_persons INTEGER,
  min_los INTEGER,
  sold_out_message VARCHAR(500),
  taking_reservations BOOLEAN,
  scrape_date DATE NOT NULL,
  is_available INTEGER,
  num_days INTEGER,
  price FLOAT,
  update_tz TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  CONSTRAINT unique_historical_competitor_price UNIQUE (competitor_id, checkin_date, room_name, max_persons)
);

COMMENT ON TABLE booking.historical_competitor_prices IS 'Historical competitor prices imported from booking.historical_competitor_prices. Stores competitor pricing data with proper foreign key relationships and field length constraints.';
COMMENT ON COLUMN booking.historical_competitor_prices.id IS 'Primary key for the historical competitor price record';

-- Create index for efficient lookups based on main filtering fields
CREATE INDEX IF NOT EXISTS idx_historical_competitor_prices_lookup 
ON booking.historical_competitor_prices (competitor_id, checkin_date);

-- Create additional index for queries that filter by max_persons
CREATE INDEX IF NOT EXISTS idx_historical_competitor_prices_guest_lookup 
ON booking.historical_competitor_prices (competitor_id, checkin_date, max_persons);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON booking.historical_competitor_prices TO webapp_writer;

CREATE TABLE IF NOT EXISTS booking.scraper_batch_metrics (
    batch_id VARCHAR NOT NULL,
    batch_timestamp TIMESTAMP NOT NULL,
    
    -- Batch details
    vm_id VARCHAR(50),
    region VARCHAR(100),
    device_type VARCHAR NOT NULL,
    scraper_frequency VARCHAR,
    
    -- Batch statistics
    total_requests INTEGER NOT NULL DEFAULT 0,
    successful_requests INTEGER NOT NULL DEFAULT 0,
    failed_requests INTEGER NOT NULL DEFAULT 0,
    
    -- Error breakdown
    not_parsable_count INTEGER NOT NULL DEFAULT 0,
    tpi_parse_failed_count INTEGER NOT NULL DEFAULT 0,
    request_failed_count INTEGER NOT NULL DEFAULT 0,
    bot_detection_count INTEGER NOT NULL DEFAULT 0,
    other_error_count INTEGER NOT NULL DEFAULT 0,
    
    -- Performance metrics
    avg_response_time_ms FLOAT,
    total_response_time_ms INTEGER,
    avg_response_size_bytes FLOAT,
    success_rate FLOAT,
    
    -- Business metrics
    total_rooms_found INTEGER,
    total_tpi_offers INTEGER,
    los_restriction_count INTEGER NOT NULL DEFAULT 0,
    not_taking_reservations_count INTEGER NOT NULL DEFAULT 0,
    
    -- Unique hotels in batch
    unique_hotels INTEGER NOT NULL DEFAULT 0,
    unique_dates INTEGER NOT NULL DEFAULT 0,
    
    -- Primary key
    PRIMARY KEY (batch_id, batch_timestamp)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_scraper_batch_metrics_timestamp 
    ON booking.scraper_batch_metrics (batch_timestamp);

CREATE INDEX IF NOT EXISTS idx_scraper_batch_metrics_success_rate 
    ON booking.scraper_batch_metrics (success_rate);

CREATE INDEX IF NOT EXISTS idx_scraper_batch_metrics_vm_id 
    ON booking.scraper_batch_metrics (vm_id);

CREATE INDEX IF NOT EXISTS idx_scraper_batch_metrics_region 
    ON booking.scraper_batch_metrics (region);

CREATE INDEX IF NOT EXISTS idx_scraper_batch_metrics_device_type 
    ON booking.scraper_batch_metrics (device_type);

GRANT SELECT, INSERT, UPDATE ON booking.scraper_batch_metrics TO booking_writer, webapp_writer;

-- Create PriceHistoryDev table (development version of price_history)
CREATE TABLE IF NOT EXISTS booking.price_history_dev (
	hotel_id VARCHAR NOT NULL,
	hotel_name VARCHAR NOT NULL,
	checkin_date DATE NOT NULL,
	checkout_date DATE NOT NULL,
	los_message VARCHAR,
	min_los INTEGER,
	sold_out_message VARCHAR,
	b_id INTEGER NOT NULL,
	b_roomtype_id INTEGER NOT NULL,
	b_name VARCHAR,
	b_has_room_inventory BOOLEAN,
	"b_blocks.b_block_id" VARCHAR NOT NULL,
	"b_blocks.b_raw_price" FLOAT,
	"b_blocks.b_mealplan_included_name" VARCHAR,
	"b_blocks.b_cancellation_type" VARCHAR NOT NULL,
	"b_blocks.b_max_persons" INTEGER,
	"b_blocks.b_price" VARCHAR,
	"b_blocks.b_rate_is_genius" BOOLEAN,
	"b_blocks.b_nr_stays" INTEGER NOT NULL,
	"b_blocks.b_price_breakdown_simplified.b_excluded_charges_amount" FLOAT,
	"b_blocks.b_price_breakdown_simplified.b_tax_exception" FLOAT,
	"b_blocks.b_price_breakdown_simplified.b_strikethrough_price_amount" FLOAT,
	"b_blocks.b_book_now_pay_later" BOOLEAN,
	"b_blocks.b_price_breakdown_simplified.b_headline_price_amount" FLOAT,
	"b_blocks.b_price_breakdown_simplified.b_vm_products" JSONB [],
	"b_blocks.b_price_breakdown_simplified.b_reward_credit_amount" FLOAT,
	"b_blocks.b_stay_prices.b_price" VARCHAR,
	"b_blocks.b_stay_prices.b_local_price" FLOAT,
	"b_blocks.b_stay_prices.b_raw_price" FLOAT,
	"b_blocks.b_stay_prices.b_stays" INTEGER NOT NULL,
	"b_blocks.b_stay_prices.b_price_per_night" VARCHAR,
	as_of TIMESTAMP WITHOUT TIME ZONE NOT NULL,
	region VARCHAR(100) NULL DEFAULT NULL::character varying,
	PRIMARY KEY (hotel_id, checkin_date, checkout_date, b_id, b_roomtype_id, "b_blocks.b_block_id", "b_blocks.b_cancellation_type", "b_blocks.b_stay_prices.b_stays", as_of)
);

-- Grant permissions on price_history_dev table
GRANT SELECT, INSERT, UPDATE ON booking.price_history_dev TO booking_writer, webapp_writer;
