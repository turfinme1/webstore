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

@Index("ratings_pkey", ["id"], { unique: true })
@Index("ratings_product_id_user_id_key", ["productId", "userId"], {
  unique: true,
})
@Index("idx_ratings_product_id", ["product"])
@Entity("ratings", { schema: "public" })
export class Ratings {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: string;

  @Column("bigint", { name: "product_id" })
  productId: string;

  @Column("bigint", { name: "user_id" })
  userId: string;

  @Column("bigint", { name: "rating", nullable: true })
  rating: string | null;

  @Column("timestamp with time zone", {
    name: "created_at",
    default: () => "now()",
  })
  createdAt: Date;

  @ManyToOne(() => Products, (products) => products.ratings)
  @JoinColumn([{ name: "product_id", referencedColumnName: "id" }])
  product: Products;

  @ManyToOne(() => Users, (users) => users.ratings)
  @JoinColumn([{ name: "user_id", referencedColumnName: "id" }])
  user: Users;
}
