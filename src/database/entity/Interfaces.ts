import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Permissions } from "./Permissions";

@Index("interfaces_pkey", ["id"], { unique: true })
@Index("interfaces_name_key", ["name"], { unique: true })
@Entity("interfaces", { schema: "public" })
export class Interfaces {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: string;

  @Column("text", { name: "name", unique: true })
  name: string;

  @Column("boolean", { name: "is_active", default: () => "true" })
  isActive: boolean;

  @Column("timestamp with time zone", {
    name: "created_at",
    default: () => "now()",
  })
  createdAt: Date;

  @OneToMany(() => Permissions, (permissions) => permissions.interface)
  permissions: Permissions[];
}
