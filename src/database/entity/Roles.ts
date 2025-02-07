import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { AdminUserRoles } from "./AdminUserRoles";
import { RolePermissions } from "./RolePermissions";

@Index("roles_pkey", ["id"], { unique: true })
@Index("roles_name_key", ["name"], { unique: true })
@Entity("roles", { schema: "public" })
export class Roles {
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

  @OneToMany(() => AdminUserRoles, (adminUserRoles) => adminUserRoles.role)
  adminUserRoles: AdminUserRoles[];

  @OneToMany(() => RolePermissions, (rolePermissions) => rolePermissions.role)
  rolePermissions: RolePermissions[];
}
