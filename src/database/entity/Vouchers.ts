import {
  Column,
  Entity,
  Index,
  ManyToMany,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Campaigns } from "./Campaigns";
import { Carts } from "./Carts";
import { Users } from "./Users";

@Index("vouchers_code_is_active_idx", ["code"], { unique: true })
@Index("vouchers_pkey", ["id"], { unique: true })
@Entity("vouchers", { schema: "public" })
export class Vouchers {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: string;

  @Column("text", { name: "name" })
  name: string;

  @Column("numeric", { name: "discount_amount", precision: 12, scale: 2 })
  discountAmount: string;

  @Column("text", { name: "code" })
  code: string;

  @Column("timestamp with time zone", { name: "start_date" })
  startDate: Date;

  @Column("timestamp with time zone", { name: "end_date" })
  endDate: Date;

  @Column("timestamp with time zone", {
    name: "created_at",
    nullable: true,
    default: () => "now()",
  })
  createdAt: Date | null;

  @Column("boolean", {
    name: "is_active",
    nullable: true,
    default: () => "true",
  })
  isActive: boolean | null;

  @OneToOne(() => Campaigns, (campaigns) => campaigns.voucher)
  campaigns: Campaigns;

  @OneToMany(() => Carts, (carts) => carts.voucher)
  carts: Carts[];

  @ManyToMany(() => Users, (users) => users.vouchers)
  users: Users[];
}
