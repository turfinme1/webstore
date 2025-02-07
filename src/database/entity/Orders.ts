import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { OrderItems } from "./OrderItems";
import { Payments } from "./Payments";
import { Addresses } from "./Addresses";
import { Users } from "./Users";

@Index("orders_pkey", ["id"], { unique: true })
@Index("orders_order_hash_key", ["orderHash"], { unique: true })
@Entity("orders", { schema: "public" })
export class Orders {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: string;

  @Column("uuid", {
    name: "order_hash",
    unique: true,
    default: () => "uuid_generate_v4()",
  })
  orderHash: string;

  @Column("text", { name: "status" })
  status: string;

  @Column("numeric", {
    name: "paid_amount",
    nullable: true,
    precision: 12,
    scale: 2,
  })
  paidAmount: string | null;

  @Column("numeric", { name: "total_price", precision: 12, scale: 2 })
  totalPrice: string;

  @Column("timestamp with time zone", {
    name: "created_at",
    default: () => "now()",
  })
  createdAt: Date;

  @Column("boolean", { name: "is_active", default: () => "true" })
  isActive: boolean;

  @Column("numeric", {
    name: "discount_percentage",
    precision: 5,
    scale: 2,
    default: () => "0",
  })
  discountPercentage: string;

  @Column("numeric", {
    name: "vat_percentage",
    precision: 5,
    scale: 2,
    default: () => "0",
  })
  vatPercentage: string;

  @Column("text", { name: "voucher_code", nullable: true })
  voucherCode: string | null;

  @Column("numeric", {
    name: "voucher_discount_amount",
    nullable: true,
    precision: 12,
    scale: 2,
    default: () => "0",
  })
  voucherDiscountAmount: string | null;

  @Column("numeric", {
    name: "total_stock_price",
    nullable: true,
    precision: 10,
    scale: 2,
    default: () => "0",
  })
  totalStockPrice: string | null;

  @OneToMany(() => OrderItems, (orderItems) => orderItems.order)
  orderItems: OrderItems[];

  @ManyToOne(() => Payments, (payments) => payments.orders)
  @JoinColumn([{ name: "payment_id", referencedColumnName: "id" }])
  payment: Payments;

  @ManyToOne(() => Addresses, (addresses) => addresses.orders)
  @JoinColumn([{ name: "shipping_address_id", referencedColumnName: "id" }])
  shippingAddress: Addresses;

  @ManyToOne(() => Users, (users) => users.orders)
  @JoinColumn([{ name: "user_id", referencedColumnName: "id" }])
  user: Users;

  @OneToOne(() => Payments, (payments) => payments.order)
  payments: Payments;
}
