import {
  Column,
  Entity,
  Index,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Orders } from "./Orders";

@Index("payments_pkey", ["id"], { unique: true })
@Index("payments_order_id_key", ["orderId"], { unique: true })
@Index("payments_payment_hash_key", ["paymentHash"], { unique: true })
@Entity("payments", { schema: "public" })
export class Payments {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: string;

  @Column("uuid", {
    name: "payment_hash",
    unique: true,
    default: () => "uuid_generate_v4()",
  })
  paymentHash: string;

  @Column("bigint", { name: "order_id", unique: true })
  orderId: string;

  @Column("text", { name: "payment_provider", nullable: true })
  paymentProvider: string | null;

  @Column("text", { name: "provider_payment_id" })
  providerPaymentId: string;

  @Column("numeric", {
    name: "paid_amount",
    nullable: true,
    precision: 12,
    scale: 2,
  })
  paidAmount: string | null;

  @Column("text", { name: "status" })
  status: string;

  @Column("timestamp with time zone", {
    name: "created_at",
    default: () => "now()",
  })
  createdAt: Date;

  @OneToMany(() => Orders, (orders) => orders.payment)
  orders: Orders[];

  @OneToOne(() => Orders, (orders) => orders.payments)
  @JoinColumn([{ name: "order_id", referencedColumnName: "id" }])
  order: Orders;
}
