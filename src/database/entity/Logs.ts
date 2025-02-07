import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { AdminUsers } from "./AdminUsers";
import { Users } from "./Users";

@Index("logs_pkey", ["id"], { unique: true })
@Entity("logs", { schema: "public" })
export class Logs {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: string;

  @Column("text", { name: "status_code" })
  statusCode: string;

  @Column("text", { name: "log_level" })
  logLevel: string;

  @Column("text", { name: "short_description" })
  shortDescription: string;

  @Column("text", { name: "long_description", nullable: true })
  longDescription: string | null;

  @Column("text", { name: "debug_info", nullable: true })
  debugInfo: string | null;

  @Column("timestamp with time zone", {
    name: "created_at",
    default: () => "now()",
  })
  createdAt: Date;

  @Column("text", { name: "audit_type", default: () => "'ASSERT'" })
  auditType: string;

  @ManyToOne(() => AdminUsers, (adminUsers) => adminUsers.logs)
  @JoinColumn([{ name: "admin_user_id", referencedColumnName: "id" }])
  adminUser: AdminUsers;

  @ManyToOne(() => Users, (users) => users.logs)
  @JoinColumn([{ name: "user_id", referencedColumnName: "id" }])
  user: Users;
}
