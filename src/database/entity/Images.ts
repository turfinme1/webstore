import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Products } from "./Products";

@Index("images_pkey", ["id"], { unique: true })
@Index("idx_images_product_id", ["product"])
@Entity("images", { schema: "public" })
export class Images {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: string;

  @Column("text", { name: "url" })
  url: string;

  @ManyToOne(() => Products, (products) => products.images)
  @JoinColumn([{ name: "product_id", referencedColumnName: "id" }])
  product: Products;
}
