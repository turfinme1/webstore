import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { Permissions } from "./Permissions";
import { Roles } from "./Roles";

@Index("role_permissions_pkey", ["permissionId", "roleId"], { unique: true })
@Entity("role_permissions", { schema: "public" })
export class RolePermissions {
  @Column("bigint", { primary: true, name: "role_id" })
  roleId: string;

  @Column("bigint", { primary: true, name: "permission_id" })
  permissionId: string;

  @Column("timestamp with time zone", {
    name: "created_at",
    default: () => "now()",
  })
  createdAt: Date;

  @ManyToOne(() => Permissions, (permissions) => permissions.rolePermissions)
  @JoinColumn([{ name: "permission_id", referencedColumnName: "id" }])
  permission: Permissions;

  @ManyToOne(() => Roles, (roles) => roles.rolePermissions)
  @JoinColumn([{ name: "role_id", referencedColumnName: "id" }])
  role: Roles;
}
