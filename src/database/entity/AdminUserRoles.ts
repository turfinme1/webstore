import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { AdminUsers } from "./AdminUsers";
import { Roles } from "./Roles";

@Index("admin_user_roles_pkey", ["adminUserId", "roleId"], { unique: true })
@Entity("admin_user_roles", { schema: "public" })
export class AdminUserRoles {
  @Column("bigint", { primary: true, name: "admin_user_id" })
  adminUserId: string;

  @Column("bigint", { primary: true, name: "role_id" })
  roleId: string;

  @Column("timestamp with time zone", {
    name: "created_at",
    default: () => "now()",
  })
  createdAt: Date;

  @ManyToOne(() => AdminUsers, (adminUsers) => adminUsers.adminUserRoles)
  @JoinColumn([{ name: "admin_user_id", referencedColumnName: "id" }])
  adminUser: AdminUsers;

  @ManyToOne(() => Roles, (roles) => roles.adminUserRoles)
  @JoinColumn([{ name: "role_id", referencedColumnName: "id" }])
  role: Roles;
}
