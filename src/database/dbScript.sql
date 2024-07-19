drop table if exists naseleno_mqsto;
drop table if exists kmetstvo;
drop table if exists obshtina;
drop table if exists oblast;

create table oblast (
	id bigserial primary key,
	oblast_code text UNIQUE NOT NULL,
	name_en text NOT NULL,
	name text NOT NULL
);

create table obshtina (
	id bigserial primary key,
	obshtina_code text UNIQUE NOT NULL,
	name_en text NOT NULL,
	name text NOT NULL,
	oblast_id bigint references oblast (id)
);

create table kmetstvo (
	id bigserial primary key,
	kmetstvo_code text UNIQUE NOT NULL,
	name_en text NOT NULL,
	name text NOT NULL,
	obshtina_id bigint references obshtina (id)
);

create table naseleno_mqsto(
	id bigserial primary key,
	ekatte text UNIQUE NOT NULL,
	name_en text NOT NULL,
	name text NOT NULL,
	kmetstvo_id bigint NULL references kmetstvo (id)
);