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
