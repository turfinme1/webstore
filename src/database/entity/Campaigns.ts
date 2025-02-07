import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { TargetGroups } from "./TargetGroups";
import { Vouchers } from "./Vouchers";

@Index("campaigns_pkey", ["id"], { unique: true })
@Index("campaigns_voucher_id_key", ["voucherId"], { unique: true })
@Entity("campaigns", { schema: "public" })
export class Campaigns {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: string;

  @Column("text", { name: "name" })
  name: string;

  @Column("timestamp with time zone", { name: "start_date" })
  startDate: Date;

  @Column("timestamp with time zone", { name: "end_date" })
  endDate: Date;

  @Column("text", { name: "status" })
  status: string;

  @Column("bigint", { name: "voucher_id", unique: true })
  voucherId: string;

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

  @ManyToOne(() => TargetGroups, (targetGroups) => targetGroups.campaigns)
  @JoinColumn([{ name: "target_group_id", referencedColumnName: "id" }])
  targetGroup: TargetGroups;

  @OneToOne(() => Vouchers, (vouchers) => vouchers.campaigns)
  @JoinColumn([{ name: "voucher_id", referencedColumnName: "id" }])
  voucher: Vouchers;
}
