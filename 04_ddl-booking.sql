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
	b_name VARCHAR NOT NULL,
	b_has_room_inventory BOOLEAN NOT NULL,
	"b_blocks.b_block_id" VARCHAR NOT NULL,
	"b_blocks.b_raw_price" FLOAT NOT NULL,
	"b_blocks.b_mealplan_included_name" VARCHAR,
	"b_blocks.b_cancellation_type" VARCHAR NOT NULL,
	"b_blocks.b_max_persons" INTEGER NOT NULL,
	"b_blocks.b_price" VARCHAR NOT NULL,
	"b_blocks.b_rate_is_genius" BOOLEAN NOT NULL,
	"b_blocks.b_nr_stays" INTEGER NOT NULL,
	"b_blocks.b_price_breakdown_simplified.b_excluded_charges_amount" FLOAT,
	"b_blocks.b_price_breakdown_simplified.b_tax_exception" FLOAT,
	"b_blocks.b_price_breakdown_simplified.b_strikethrough_price_amount" FLOAT,
	"b_blocks.b_book_now_pay_later" BOOLEAN,
	"b_blocks.b_price_breakdown_simplified.b_headline_price_amount" FLOAT NOT NULL,
	"b_blocks.b_price_breakdown_simplified.b_vm_products" JSONB [],
	"b_blocks.b_price_breakdown_simplified.b_reward_credit_amount" FLOAT,
	"b_blocks.b_stay_prices.b_price" VARCHAR NOT NULL,
	"b_blocks.b_stay_prices.b_local_price" FLOAT NOT NULL,
	"b_blocks.b_stay_prices.b_raw_price" FLOAT,
	"b_blocks.b_stay_prices.b_stays" INTEGER NOT NULL,
	"b_blocks.b_stay_prices.b_price_per_night" VARCHAR NOT NULL,
	as_of TIMESTAMP WITHOUT TIME ZONE NOT NULL,
	region VARCHAR(100) NULL DEFAULT NULL::character varying,
	PRIMARY KEY (hotel_id, checkin_date, checkout_date, b_id, b_roomtype_id, "b_blocks.b_block_id", "b_blocks.b_cancellation_type", "b_blocks.b_stay_prices.b_stays", as_of)
);
GRANT USAGE ON SCHEMA booking TO booking_writer;
GRANT INSERT, SELECT ON booking.price_history TO booking_writer;

CREATE TABLE IF NOT EXISTS booking.competitors (
	competitor_id VARCHAR,
	competitor_name VARCHAR NOT NULL,
  booking_link VARCHAR NOT NULL,
  valid_from TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  valid_to TIMESTAMP WITHOUT TIME ZONE NULL,
	daily_num_days INTEGER NOT NULL DEFAULT 15,
	weekly_num_days INTEGER NOT NULL DEFAULT 90,
	bimonthly_num_days INTEGER NOT NULL DEFAULT 180,
	quarterly_num_days INTEGER NOT NULL DEFAULT 365,
	first_cutoff_hour_cet INTEGER NOT NULL DEFAULT 11,
	second_cutoff_hour_cet INTEGER NOT NULL DEFAULT 17,
	region VARCHAR(100) NULL DEFAULT NULL::character varying,
  PRIMARY KEY (competitor_id, valid_from)
);
INSERT INTO booking.competitors (competitor_id,competitor_name,booking_link,valid_from,valid_to,daily_num_days,weekly_num_days,cutoff_hour_cet) VALUES
	 ('pension-kursaal-de-pensiones-con-encanto','Pension Kursaal','https://www.booking.com/hotel/es/pension-kursaal-de-pensiones-con-encanto.en-gb.html','2023-03-13 19:52:23.406108',NULL,45,180,3, 'europe-west3'),
	 ('pension-altair','Pensión Altair','https://www.booking.com/hotel/es/pension-altair.en-gb.html','2023-03-13 19:52:23.406108',NULL,45,180,3, 'europe-west3'),
	 ('pensia3n-urkia','Pensión Urkia','https://www.booking.com/hotel/es/pensia3n-urkia.en-gb.html','2023-03-13 19:52:23.406108',NULL,45,180,3, 'europe-west3'),
	 ('pension-casa-nicolasa','Casa Nicolasa','https://www.booking.com/hotel/es/pension-casa-nicolasa.en-gb.html','2023-03-13 19:52:23.406108',NULL,45,180,3, 'europe-west3'),
	 ('zaragoza-plaza','Hotel Zaragoza Plaza','https://www.booking.com/hotel/es/zaragoza-plaza.en-gb.html','2023-03-13 19:52:23.406108',NULL,45,180,3, 'europe-west3'),
	 ('adarve','Adarve','https://www.booking.com/hotel/es/adarve.es.html','2023-03-13 19:52:23.406108',NULL,45,180,3, 'europe-west3'),
	 ('cervantes-zafra','Cervantes Zafra','https://www.booking.com/hotel/es/cervantes-zafra.es.html','2023-03-13 19:52:23.406108',NULL,45,180,3, 'europe-west3'),
	 ('plaza-grande','Plaza Grande','https://www.booking.com/hotel/es/plaza-grande.es.html','2023-03-13 19:52:23.406108',NULL,45,180,3, 'europe-west3'),
	 ('hostal-carmen','Hostal Carmen','https://www.booking.com/hotel/es/hostal-carmen.es.html','2023-03-13 19:52:23.406108',NULL,45,180,3, 'europe-west3'),
	 ('atalayas-extremadura','Atalayas Extremadura','https://www.booking.com/hotel/es/atalayas-extremadura.es.html','2023-03-13 19:52:23.406108',NULL,45,180,3, 'europe-west3');
INSERT INTO booking.competitors (competitor_id,competitor_name,booking_link,valid_from,valid_to,daily_num_days,weekly_num_days,cutoff_hour_cet) VALUES
	 ('hostal-universitat-cervera','Hostal Universitat','https://www.booking.com/hotel/es/hostal-universitat-cervera.es.html','2023-03-13 19:52:23.406108',NULL,45,180,3, 'europe-west3'),
	 ('restaurante-blanc-i-negre-2','Restaurante Blanc i Negre','https://www.booking.com/hotel/es/restaurante-blanc-i-negre-2.es.html','2023-03-13 19:52:23.406108',NULL,45,180,3, 'europe-west3'),
	 ('ciutat-de-tarrega','Hotel Ciutat de Tarrega','https://www.booking.com/hotel/es/ciutat-de-tarrega.es.html','2023-03-13 19:52:23.406108',NULL,45,180,3, 'europe-west3'),
	 ('cal-feliuet','Cal Feliuet','https://www.booking.com/hotel/es/cal-feliuet.es.html','2023-03-13 19:52:23.406108',NULL,45,180,3, 'europe-west3'),
	 ('ca-l-39-agustina','Ca l''Agustina','https://www.booking.com/hotel/es/ca-l-39-agustina.es.html','2023-03-13 19:52:23.406108',NULL,45,180,3, 'europe-west3'),
	 ('pension-kursaal-de-pensiones-con-encanto','Pension Kursaal','https://www.booking.com/hotel/es/pension-kursaal-de-pensiones-con-encanto.en-gb.html','2023-03-13 19:48:23.728356','2023-03-13 19:52:23.406',45,180,3, 'europe-west3'),
	 ('pension-altair','Pensión Altair','https://www.booking.com/hotel/es/pension-altair.en-gb.html','2023-03-13 19:48:23.728356','2023-03-13 19:52:23.406',45,180,3, 'europe-west3'),
	 ('pensia3n-urkia','Pensión Urkia','https://www.booking.com/hotel/es/pensia3n-urkia.en-gb.html','2023-03-13 19:48:23.728356','2023-03-13 19:52:23.406',45,180,3, 'europe-west3'),
	 ('pension-casa-nicolasa','Casa Nicolasa','https://www.booking.com/hotel/es/pension-casa-nicolasa.en-gb.html','2023-03-13 19:48:23.728356','2023-03-13 19:52:23.406',45,180,3, 'europe-west3'),
	 ('zaragoza-plaza','Hotel Zaragoza Plaza','https://www.booking.com/hotel/es/zaragoza-plaza.en-gb.html','2023-03-13 19:48:23.728356','2023-03-13 19:52:23.406',45,180,3, 'europe-west3');
INSERT INTO booking.competitors (competitor_id,competitor_name,booking_link,valid_from,valid_to,daily_num_days,weekly_num_days,cutoff_hour_cet) VALUES
	 ('adarve','Adarve','https://www.booking.com/hotel/es/adarve.es.html','2023-03-13 19:48:23.728356','2023-03-13 19:52:23.406',45,180,3, 'europe-west3'),
	 ('cervantes-zafra','Cervantes Zafra','https://www.booking.com/hotel/es/cervantes-zafra.es.html','2023-03-13 19:48:23.728356','2023-03-13 19:52:23.406',45,180,3, 'europe-west3'),
	 ('plaza-grande','Plaza Grande','https://www.booking.com/hotel/es/plaza-grande.es.html','2023-03-13 19:48:23.728356','2023-03-13 19:52:23.406',45,180,3, 'europe-west3'),
	 ('hostal-carmen','Hostal Carmen','https://www.booking.com/hotel/es/hostal-carmen.es.html','2023-03-13 19:48:23.728356','2023-03-13 19:52:23.406',45,180,3, 'europe-west3'),
	 ('atalayas-extremadura','Atalayas Extremadura','https://www.booking.com/hotel/es/atalayas-extremadura.es.html','2023-03-13 19:48:23.728356','2023-03-13 19:52:23.406',45,180,3, 'europe-west3'),
	 ('hostal-universitat-cervera','Hostal Universitat','https://www.booking.com/hotel/es/hostal-universitat-cervera.es.html','2023-03-13 19:48:23.728356','2023-03-13 19:52:23.406',45,180,3, 'europe-west3'),
	 ('restaurante-blanc-i-negre-2','Restaurante Blanc i Negre','https://www.booking.com/hotel/es/restaurante-blanc-i-negre-2.es.html','2023-03-13 19:48:23.728356','2023-03-13 19:52:23.406',45,180,3, 'europe-west3'),
	 ('pension-kursaal-de-pensiones-con-encanto','Pension Kursaal','https://www.booking.com/hotel/es/pension-kursaal-de-pensiones-con-encanto.en-gb.html','1900-01-01 00:00:00','2023-03-06 20:02:39.280984',45,180,3, 'europe-west3'),
	 ('pension-altair','Pensión Altair','https://www.booking.com/hotel/es/pension-altair.en-gb.html','1900-01-01 00:00:00','2023-03-06 20:02:39.280984',45,180,3, 'europe-west3'),
	 ('pensia3n-urkia','Pensión Urkia','https://www.booking.com/hotel/es/pensia3n-urkia.en-gb.html','1900-01-01 00:00:00','2023-03-06 20:02:39.280984',45,180,3, 'europe-west3');
INSERT INTO booking.competitors (competitor_id,competitor_name,booking_link,valid_from,valid_to,daily_num_days,weekly_num_days,cutoff_hour_cet) VALUES
	 ('pension-casa-nicolasa','Casa Nicolasa','https://www.booking.com/hotel/es/pension-casa-nicolasa.en-gb.html','1900-01-01 00:00:00','2023-03-06 20:02:39.280984',45,180,3, 'europe-west3'),
	 ('zaragoza-plaza','Hotel Zaragoza Plaza','https://www.booking.com/hotel/es/zaragoza-plaza.en-gb.html','1900-01-01 00:00:00','2023-03-06 20:02:39.280984',45,180,3, 'europe-west3'),
	 ('hostal-bar-restaurante-quot-la-fuente-quot','Hostal Quot La Fuente','https://www.booking.com/hotel/es/hostal-bar-restaurante-quot-la-fuente-quot.es.html','1900-01-01 00:00:00','2023-03-06 20:02:39.280984',45,180,3, 'europe-west3'),
	 ('hostal-santiago-2-burgos','Hostal Santiago 2','https://www.booking.com/hotel/es/hostal-santiago-2-burgos.es.html','1900-01-01 00:00:00','2023-03-06 20:02:39.280984',45,180,3, 'europe-west3'),
	 ('domus-buenos-aires','Domus Buenos Aires','https://www.booking.com/hotel/es/domus-buenos-aires.es.html','1900-01-01 00:00:00','2023-03-06 20:02:39.280984',45,180,3, 'europe-west3'),
	 ('hostal-acanto','Hostal Acanto','https://www.booking.com/hotel/es/hostal-acanto.es.html','1900-01-01 00:00:00','2023-03-06 20:02:39.280984',45,180,3, 'europe-west3'),
	 ('campus-tavern','Campus Tavern','https://www.booking.com/hotel/es/campus-tavern.es.html','1900-01-01 00:00:00','2023-03-06 20:02:39.280984',45,180,3, 'europe-west3'),
	 ('hostal-universitat-cervera','Hostal Universitat Cervera','https://www.booking.com/hotel/es/hostal-universitat-cervera.es.html','1900-01-01 00:00:00','2023-03-06 20:02:39.280984',45,180,3, 'europe-west3'),
	 ('restaurante-blanc-i-negre-2','Restaurante Blanc i Negre','https://www.booking.com/hotel/es/restaurante-blanc-i-negre-2.es.html','1900-01-01 00:00:00','2023-03-06 20:02:39.280984',45,180,3, 'europe-west3'),
	 ('ciutat-de-tarrega','Hotel Ciutat de Tarrega','https://www.booking.com/hotel/es/ciutat-de-tarrega.es.html','2023-03-13 19:48:23.728356','2023-03-13 19:52:23.406',45,180,3, 'europe-west3');
INSERT INTO booking.competitors (competitor_id,competitor_name,booking_link,valid_from,valid_to,daily_num_days,weekly_num_days,cutoff_hour_cet) VALUES
	 ('cal-feliuet','Cal Feliuet','https://www.booking.com/hotel/es/cal-feliuet.es.html','2023-03-13 19:48:23.728356','2023-03-13 19:52:23.406',45,180,3, 'europe-west3'),
	 ('ca-l-39-agustina','Ca l''Agustina','https://www.booking.com/hotel/es/ca-l-39-agustina.es.html','2023-03-13 19:48:23.728356','2023-03-13 19:52:23.406',45,180,3, 'europe-west3'),
	 ('ciutat-de-tarrega','Ciutat De Tarrega','https://www.booking.com/hotel/es/ciutat-de-tarrega.es.html','1900-01-01 00:00:00','2023-03-06 20:02:39.280984',45,180,3, 'europe-west3'),
	 ('cal-feliuet','Cal Feliuet','https://www.booking.com/hotel/es/cal-feliuet.es.html','1900-01-01 00:00:00','2023-03-06 20:02:39.280984',45,180,3, 'europe-west3'),
	 ('ca-l-39-agustina','Ca L''Augustina','https://www.booking.com/hotel/es/ca-l-39-agustina.es.html','1900-01-01 00:00:00','2023-03-06 20:02:39.280984',45,180,3, 'europe-west3');
GRANT SELECT ON booking.competitors TO booking_writer;
