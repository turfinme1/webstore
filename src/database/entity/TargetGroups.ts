import {
  Column,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Campaigns } from "./Campaigns";
import { Users } from "./Users";

@Index("target_groups_pkey", ["id"], { unique: true })
@Index("target_groups_name_key", ["name"], { unique: true })
@Entity("target_groups", { schema: "public" })
export class TargetGroups {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: string;

  @Column("text", { name: "name", unique: true })
  name: string;

  @Column("jsonb", { name: "filters" })
  filters: object;

  @Column("timestamp with time zone", {
    name: "created_at",
    default: () => "now()",
  })
  createdAt: Date;

  @Column("boolean", { name: "is_active", default: () => "true" })
  isActive: boolean;

  @Column("timestamp with time zone", { name: "updated_at", nullable: true })
  updatedAt: Date | null;

  @OneToMany(() => Campaigns, (campaigns) => campaigns.targetGroup)
  campaigns: Campaigns[];

  @ManyToMany(() => Users, (users) => users.targetGroups)
  @JoinTable({
    name: "user_target_groups",
    joinColumns: [{ name: "target_group_id", referencedColumnName: "id" }],
    inverseJoinColumns: [{ name: "user_id", referencedColumnName: "id" }],
    schema: "public",
  })
  users: Users[];
}
