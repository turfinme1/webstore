import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Carts } from "./Carts";
import { Products } from "./Products";

@Index("unique_cart_product", ["cartId", "productId"], { unique: true })
@Index("cart_items_pkey", ["id"], { unique: true })
@Entity("cart_items", { schema: "public" })
export class CartItems {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: string;

  @Column("bigint", { name: "cart_id" })
  cartId: string;

  @Column("bigint", { name: "product_id" })
  productId: string;

  @Column("bigint", { name: "quantity" })
  quantity: string;

  @Column("numeric", { name: "unit_price", precision: 12, scale: 2 })
  unitPrice: string;

  @Column("numeric", {
    name: "total_price",
    nullable: true,
    precision: 12,
    scale: 2,
  })
  totalPrice: string | null;

  @Column("timestamp with time zone", {
    name: "created_at",
    default: () => "now()",
  })
  createdAt: Date;

  @ManyToOne(() => Carts, (carts) => carts.cartItems)
  @JoinColumn([{ name: "cart_id", referencedColumnName: "id" }])
  cart: Carts;

  @ManyToOne(() => Products, (products) => products.cartItems)
  @JoinColumn([{ name: "product_id", referencedColumnName: "id" }])
  product: Products;
}
