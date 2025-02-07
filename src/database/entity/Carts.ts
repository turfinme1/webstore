import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { CartItems } from "./CartItems";
import { Sessions } from "./Sessions";
import { Users } from "./Users";
import { Vouchers } from "./Vouchers";

@Index("carts_pkey", ["id"], { unique: true })
@Entity("carts", { schema: "public" })
export class Carts {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: string;

  @Column("timestamp with time zone", {
    name: "created_at",
    default: () => "now()",
  })
  createdAt: Date;

  @Column("boolean", { name: "is_active", default: () => "true" })
  isActive: boolean;

  @Column("numeric", {
    name: "voucher_discount_amount",
    nullable: true,
    precision: 12,
    scale: 2,
    default: () => "0",
  })
  voucherDiscountAmount: string | null;

  @OneToMany(() => CartItems, (cartItems) => cartItems.cart)
  cartItems: CartItems[];

  @ManyToOne(() => Sessions, (sessions) => sessions.carts)
  @JoinColumn([{ name: "session_id", referencedColumnName: "id" }])
  session: Sessions;

  @ManyToOne(() => Users, (users) => users.carts)
  @JoinColumn([{ name: "user_id", referencedColumnName: "id" }])
  user: Users;

  @ManyToOne(() => Vouchers, (vouchers) => vouchers.carts)
  @JoinColumn([{ name: "voucher_id", referencedColumnName: "id" }])
  voucher: Vouchers;
}
