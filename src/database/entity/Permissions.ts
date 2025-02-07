import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Interfaces } from "./Interfaces";
import { RolePermissions } from "./RolePermissions";

@Index("permissions_pkey", ["id"], { unique: true })
@Index("permissions_name_interface_id_key", ["interfaceId", "name"], {
  unique: true,
})
@Entity("permissions", { schema: "public" })
export class Permissions {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: string;

  @Column("text", { name: "name" })
  name: string;

  @Column("bigint", { name: "interface_id" })
  interfaceId: string;

  @Column("timestamp with time zone", {
    name: "created_at",
    default: () => "now()",
  })
  createdAt: Date;

  @ManyToOne(() => Interfaces, (interfaces) => interfaces.permissions)
  @JoinColumn([{ name: "interface_id", referencedColumnName: "id" }])
  interface: Interfaces;

  @OneToMany(
    () => RolePermissions,
    (rolePermissions) => rolePermissions.permission
  )
  rolePermissions: RolePermissions[];
}
