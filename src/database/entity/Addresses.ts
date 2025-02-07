import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { IsoCountryCodes } from "./IsoCountryCodes";
import { Users } from "./Users";
import { Orders } from "./Orders";

@Index("addresses_pkey", ["id"], { unique: true })
@Entity("addresses", { schema: "public" })
export class Addresses {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: string;

  @Column("text", { name: "street" })
  street: string;

  @Column("text", { name: "city" })
  city: string;

  @Column("timestamp with time zone", {
    name: "created_at",
    default: () => "now()",
  })
  createdAt: Date;

  @ManyToOne(
    () => IsoCountryCodes,
    (isoCountryCodes) => isoCountryCodes.addresses
  )
  @JoinColumn([{ name: "country_id", referencedColumnName: "id" }])
  country: IsoCountryCodes;

  @ManyToOne(() => Users, (users) => users.addresses)
  @JoinColumn([{ name: "user_id", referencedColumnName: "id" }])
  user: Users;

  @OneToMany(() => Orders, (orders) => orders.shippingAddress)
  orders: Orders[];
}
