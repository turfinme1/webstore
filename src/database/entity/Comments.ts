import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Products } from "./Products";
import { Users } from "./Users";

@Index("comments_pkey", ["id"], { unique: true })
@Index("comments_product_id_user_id_key", ["productId", "userId"], {
  unique: true,
})
@Entity("comments", { schema: "public" })
export class Comments {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: string;

  @Column("bigint", { name: "product_id", unique: true })
  productId: string;

  @Column("bigint", { name: "user_id", unique: true })
  userId: string;

  @Column("text", { name: "comment" })
  comment: string;

  @Column("timestamp with time zone", {
    name: "created_at",
    default: () => "now()",
  })
  createdAt: Date;

  @ManyToOne(() => Products, (products) => products.comments)
  @JoinColumn([{ name: "product_id", referencedColumnName: "id" }])
  product: Products;

  @ManyToOne(() => Users, (users) => users.comments)
  @JoinColumn([{ name: "user_id", referencedColumnName: "id" }])
  user: Users;
}
