import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Products } from "./Products";

@Index("inventories_pkey", ["id"], { unique: true })
@Entity("inventories", { schema: "public" })
export class Inventories {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: string;

  @Column("bigint", { name: "quantity" })
  quantity: string;

  @ManyToOne(() => Products, (products) => products.inventories)
  @JoinColumn([{ name: "product_id", referencedColumnName: "id" }])
  product: Products;
}
