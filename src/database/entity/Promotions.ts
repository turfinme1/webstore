import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Index("promotions_pkey", ["id"], { unique: true })
@Index("promotions_name_key", ["name"], { unique: true })
@Entity("promotions", { schema: "public" })
export class Promotions {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: string;

  @Column("text", { name: "name", unique: true })
  name: string;

  @Column("numeric", { name: "discount_percentage", precision: 5, scale: 2 })
  discountPercentage: string;

  @Column("timestamp with time zone", { name: "start_date" })
  startDate: Date;

  @Column("timestamp with time zone", { name: "end_date" })
  endDate: Date;

  @Column("boolean", { name: "is_active", default: () => "true" })
  isActive: boolean;
}
