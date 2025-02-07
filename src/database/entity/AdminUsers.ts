import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { AdminSessions } from "./AdminSessions";
import { AdminUserRoles } from "./AdminUserRoles";
import { IsoCountryCodes } from "./IsoCountryCodes";
import { Genders } from "./Genders";
import { Logs } from "./Logs";

@Index("admin_users_active_email_idx", ["email"], { unique: true })
@Index("admin_users_pkey", ["id"], { unique: true })
@Index("admin_users_user_hash_key", ["userHash"], { unique: true })
@Entity("admin_users", { schema: "public" })
export class AdminUsers {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: string;

  @Column("uuid", {
    name: "user_hash",
    unique: true,
    default: () => "uuid_generate_v4()",
  })
  userHash: string;

  @Column("text", { name: "password_hash" })
  passwordHash: string;

  @Column("text", { name: "first_name" })
  firstName: string;

  @Column("text", { name: "last_name" })
  lastName: string;

  @Column("text", { name: "email" })
  email: string;

  @Column("text", { name: "phone" })
  phone: string;

  @Column("text", { name: "address", nullable: true })
  address: string | null;

  @Column("boolean", { name: "is_email_verified", default: () => "false" })
  isEmailVerified: boolean;

  @Column("boolean", { name: "has_first_login", default: () => "true" })
  hasFirstLogin: boolean;

  @Column("boolean", { name: "is_active", default: () => "true" })
  isActive: boolean;

  @Column("date", { name: "birth_date", nullable: true })
  birthDate: string | null;

  @OneToMany(() => AdminSessions, (adminSessions) => adminSessions.adminUser)
  adminSessions: AdminSessions[];

  @OneToMany(() => AdminUserRoles, (adminUserRoles) => adminUserRoles.adminUser)
  adminUserRoles: AdminUserRoles[];

  @ManyToOne(
    () => IsoCountryCodes,
    (isoCountryCodes) => isoCountryCodes.adminUsers
  )
  @JoinColumn([{ name: "country_id", referencedColumnName: "id" }])
  country: IsoCountryCodes;

  @ManyToOne(() => Genders, (genders) => genders.adminUsers)
  @JoinColumn([{ name: "gender_id", referencedColumnName: "id" }])
  gender: Genders;

  @ManyToOne(
    () => IsoCountryCodes,
    (isoCountryCodes) => isoCountryCodes.adminUsers2
  )
  @JoinColumn([{ name: "iso_country_code_id", referencedColumnName: "id" }])
  isoCountryCode: IsoCountryCodes;

  @OneToMany(() => Logs, (logs) => logs.adminUser)
  logs: Logs[];
}
