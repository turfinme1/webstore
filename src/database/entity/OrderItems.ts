import {
  Column,
  Entity,
  Generated,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Orders } from "./Orders";
import { Products } from "./Products";

@Index("order_items_pkey", ["id"], { unique: true })
@Entity("order_items", { schema: "public" })
export class OrderItems {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: string;

  @Column("bigint", { name: "quantity" })
  quantity: string;

  @Column("numeric", { name: "unit_price", precision: 12, scale: 2 })
  unitPrice: string;

  @Column({
    type: "numeric",
    name: "total_price",
    precision: 12,
    scale: 2,
    generatedType: "STORED",
    asExpression: "quantity * unit_price"
  })
  totalPrice: string;

  @Column("timestamp with time zone", {
    name: "created_at",
    default: () => "now()",
  })
  createdAt: Date;

  @ManyToOne(() => Orders, (orders) => orders.orderItems)
  @JoinColumn([{ name: "order_id", referencedColumnName: "id" }])
  order: Orders;

  @ManyToOne(() => Products, (products) => products.orderItems)
  @JoinColumn([{ name: "product_id", referencedColumnName: "id" }])
  product: Products;
}
