import {
  Column,
  Entity,
  Index,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { CartItems } from "./CartItems";
import { Comments } from "./Comments";
import { Images } from "./Images";
import { Inventories } from "./Inventories";
import { OrderItems } from "./OrderItems";
import { Categories } from "./Categories";
import { Ratings } from "./Ratings";

@Index("products_code_key", ["code"], { unique: true })
@Index("products_pkey", ["id"], { unique: true })
@Index("products_price_idx", ["price"])
@Entity("products", { schema: "public" })
export class Products {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: string;

  @Column("text", { name: "name" })
  name: string;

  @Column("numeric", { name: "price", precision: 12, scale: 2 })
  price: string;

  @Column("text", { name: "short_description" })
  shortDescription: string;

  @Column("text", { name: "long_description" })
  longDescription: string;

  @Column("text", {
    name: "code",
    unique: true,
    default: () => "substring((uuid_generate_v4())::text, 1, 8)",
  })
  code: string;

  @Column("numeric", {
    name: "stock_price",
    nullable: true,
    precision: 10,
    scale: 2,
    default: () => "0",
  })
  stockPrice: string | null;

  @OneToMany(() => CartItems, (cartItems) => cartItems.product)
  cartItems: CartItems[];

  @OneToMany(() => Comments, (comments) => comments.product)
  comments: Comments[];

  @OneToMany(() => Images, (images) => images.product)
  images: Images[];

  @OneToMany(() => Inventories, (inventories) => inventories.product)
  inventories: Inventories[];

  @OneToMany(() => OrderItems, (orderItems) => orderItems.product)
  orderItems: OrderItems[];

  @ManyToMany(() => Categories, (categories) => categories.products)
  categories: Categories[];

  @OneToMany(() => Ratings, (ratings) => ratings.product)
  ratings: Ratings[];
}
