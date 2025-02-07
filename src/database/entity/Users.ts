import {
  Column,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Addresses } from "./Addresses";
import { Carts } from "./Carts";
import { Comments } from "./Comments";
import { EmailVerifications } from "./EmailVerifications";
import { Logs } from "./Logs";
import { Orders } from "./Orders";
import { Ratings } from "./Ratings";
import { Sessions } from "./Sessions";
import { TargetGroups } from "./TargetGroups";
import { IsoCountryCodes } from "./IsoCountryCodes";
import { Genders } from "./Genders";
import { Vouchers } from "./Vouchers";

@Index("users_email_key", ["email"], { unique: true })
@Index("users_pkey", ["id"], { unique: true })
@Index("users_user_hash_key", ["userHash"], { unique: true })
@Entity("users", { schema: "public" })
export class Users {
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

  @Column("text", { name: "email", unique: true })
  email: string;

  @Column("text", { name: "phone" })
  phone: string;

  @Column("text", { name: "address", nullable: true })
  address: string | null;

  @Column("boolean", { name: "is_email_verified", default: () => "false" })
  isEmailVerified: boolean;

  @Column("boolean", { name: "has_first_login", default: () => "false" })
  hasFirstLogin: boolean;

  @Column("boolean", { name: "is_active", default: () => "true" })
  isActive: boolean;

  @Column("date", { name: "birth_date", nullable: true })
  birthDate: string | null;

  @Column("timestamp with time zone", {
    name: "created_at",
    default: () => "now()",
  })
  createdAt: Date;

  @OneToMany(() => Addresses, (addresses) => addresses.user)
  addresses: Addresses[];

  @OneToMany(() => Carts, (carts) => carts.user)
  carts: Carts[];

  @OneToMany(() => Comments, (comments) => comments.user)
  comments: Comments[];

  @OneToMany(
    () => EmailVerifications,
    (emailVerifications) => emailVerifications.user
  )
  emailVerifications: EmailVerifications[];

  @OneToMany(() => Logs, (logs) => logs.user)
  logs: Logs[];

  @OneToMany(() => Orders, (orders) => orders.user)
  orders: Orders[];

  @OneToMany(() => Ratings, (ratings) => ratings.user)
  ratings: Ratings[];

  @OneToMany(() => Sessions, (sessions) => sessions.user)
  sessions: Sessions[];

  @ManyToMany(() => TargetGroups, (targetGroups) => targetGroups.users)
  targetGroups: TargetGroups[];

  @ManyToOne(() => IsoCountryCodes, (isoCountryCodes) => isoCountryCodes.users)
  @JoinColumn([{ name: "country_id", referencedColumnName: "id" }])
  country: IsoCountryCodes;

  @ManyToOne(() => Genders, (genders) => genders.users)
  @JoinColumn([{ name: "gender_id", referencedColumnName: "id" }])
  gender: Genders;

  @ManyToOne(() => IsoCountryCodes, (isoCountryCodes) => isoCountryCodes.users2)
  @JoinColumn([{ name: "iso_country_code_id", referencedColumnName: "id" }])
  isoCountryCode: IsoCountryCodes;

  @ManyToMany(() => Vouchers, (vouchers) => vouchers.users)
  @JoinTable({
    name: "voucher_usages",
    joinColumns: [{ name: "user_id", referencedColumnName: "id" }],
    inverseJoinColumns: [{ name: "voucher_id", referencedColumnName: "id" }],
    schema: "public",
  })
  vouchers: Vouchers[];
}
