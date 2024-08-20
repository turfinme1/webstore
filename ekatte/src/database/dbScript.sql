DROP TABLE IF EXISTS settlement;
DROP TABLE IF EXISTS town_hall;
DROP TABLE IF EXISTS municipality;
DROP TABLE IF EXISTS region;

CREATE TABLE region (
    id BIGSERIAL PRIMARY KEY,
    region_code TEXT UNIQUE NOT NULL CHECK (char_length(region_code) >= 3),
    name_en TEXT NOT NULL CHECK (char_length(name_en) >= 3),
    name TEXT NOT NULL CHECK (char_length(name) >= 3) 
);

CREATE TABLE municipality (
    id BIGSERIAL PRIMARY KEY,
    municipality_code TEXT UNIQUE NOT NULL CHECK (char_length(municipality_code) >= 5),
    name_en TEXT NOT NULL CHECK (char_length(name_en) >= 3), 
    name TEXT NOT NULL CHECK (char_length(name) >= 3),
    region_id BIGINT REFERENCES region (id)
);

CREATE TABLE town_hall (
    id BIGSERIAL PRIMARY KEY,
    town_hall_code TEXT UNIQUE NOT NULL CHECK (char_length(town_hall_code) >= 8), 
    name_en TEXT NOT NULL CHECK (char_length(name_en) >= 3), 
    name TEXT NOT NULL CHECK (char_length(name) >= 3),
    municipality_id BIGINT REFERENCES municipality (id)
);

CREATE TABLE settlement (
    id BIGSERIAL PRIMARY KEY,
    ekatte TEXT UNIQUE NOT NULL CHECK (char_length(ekatte) >= 5),
    name_en TEXT NOT NULL CHECK (char_length(name_en) >= 3), 
    name TEXT NOT NULL CHECK (char_length(name) >= 3), 
    town_hall_id BIGINT NULL REFERENCES town_hall (id)
);

CREATE INDEX index_town_hall_id_on_settlement
ON settlement (town_hall_id);

CREATE INDEX index_name_on_settlement
ON settlement (name);

CREATE INDEX index_municipality_id_on_town_hall
ON town_hall (municipality_id);

CREATE INDEX index_region_id_on_municipality
ON municipality (region_id);

CREATE OR REPLACE VIEW municipality_view AS
SELECT 
	municipality.*,
    region.name_en AS region_name_en,
    region.name AS region_name
FROM 
    municipality
JOIN 
    region ON region.id = municipality.region_id;
	
CREATE OR REPLACE VIEW town_hall_view AS
SELECT 
    town_hall.id,
    town_hall.town_hall_code,
    town_hall.name_en,
    town_hall.name,
    municipality.municipality_code,
    municipality.name_en AS municipality_name_en,
    municipality.name AS municipality_name,
    region.region_code AS region_code,
    region.name_en AS region_name_en,
    region.name AS region_name
FROM 
    town_hall
JOIN 
    municipality ON municipality.id = town_hall.municipality_id
JOIN 
    region ON region.id = municipality.region_id;

CREATE OR REPLACE VIEW settlement_view AS
SELECT 
    settlement.id,
    settlement.ekatte,
    settlement.name_en,
    settlement.name,
    town_hall.town_hall_code,
    town_hall.name_en AS town_hall_name_en,
    town_hall.name AS town_hall_name,
    municipality.municipality_code,
    municipality.name_en AS municipality_name_en,
    municipality.name AS municipality_name,
    region.region_code AS region_code,
    region.name_en AS region_name_en,
    region.name AS region_name
FROM 
    settlement
LEFT JOIN 
    town_hall ON town_hall.id = settlement.town_hall_id
LEFT JOIN 
    municipality ON municipality.id = town_hall.municipality_id
LEFT JOIN 
    region ON region.id = municipality.region_id;

CREATE OR REPLACE VIEW full_hierarchy_view AS
SELECT 
    settlement.id AS settlement_id,
    settlement.ekatte,
    settlement.name_en AS settlement_name_en,
    settlement.name AS settlement_name,
    town_hall.id AS town_hall_id,
    town_hall.town_hall_code,
    town_hall.name_en AS town_hall_name_en,
    town_hall.name AS town_hall_name,
    municipality.id AS municipality_id,
    municipality.municipality_code,
    municipality.name_en AS municipality_name_en,
    municipality.name AS municipality_name,
    region.id AS region_id,
    region.region_code,
    region.name_en AS region_name_en,
    region.name AS region_name
FROM 
    settlement
LEFT JOIN 
    town_hall ON town_hall.id = settlement.town_hall_id
LEFT JOIN 
    municipality ON municipality.id = town_hall.municipality_id
LEFT JOIN 
    region ON region.id = municipality.region_id;
