import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Addresses } from "./Addresses";
import { AdminUsers } from "./AdminUsers";
import { Users } from "./Users";

@Index("iso_country_codes_country_code_key", ["countryCode"], { unique: true })
@Index("iso_country_codes_country_name_key", ["countryName"], { unique: true })
@Index("iso_country_codes_pkey", ["id"], { unique: true })
@Entity("iso_country_codes", { schema: "public" })
export class IsoCountryCodes {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: string;

  @Column("text", { name: "country_name", unique: true })
  countryName: string;

  @Column("text", { name: "country_code", unique: true })
  countryCode: string;

  @Column("text", { name: "phone_code" })
  phoneCode: string;

  @OneToMany(() => Addresses, (addresses) => addresses.country)
  addresses: Addresses[];

  @OneToMany(() => AdminUsers, (adminUsers) => adminUsers.country)
  adminUsers: AdminUsers[];

  @OneToMany(() => AdminUsers, (adminUsers) => adminUsers.isoCountryCode)
  adminUsers2: AdminUsers[];

  @OneToMany(() => Users, (users) => users.country)
  users: Users[];

  @OneToMany(() => Users, (users) => users.isoCountryCode)
  users2: Users[];
}
