import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { AdminCaptchas } from "./AdminCaptchas";
import { AdminFailedAttempts } from "./AdminFailedAttempts";
import { AdminUsers } from "./AdminUsers";
import { SessionTypes } from "./SessionTypes";

@Index("admin_sessions_pkey", ["id"], { unique: true })
@Index("admin_sessions_session_hash_key", ["sessionHash"], { unique: true })
@Entity("admin_sessions", { schema: "public" })
export class AdminSessions {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: string;

  @Column("uuid", {
    name: "session_hash",
    unique: true,
    default: () => "uuid_generate_v4()",
  })
  sessionHash: string;

  @Column("text", { name: "ip_address", nullable: true })
  ipAddress: string | null;

  @Column("timestamp with time zone", {
    name: "created_at",
    default: () => "now()",
  })
  createdAt: Date;

  @Column("timestamp with time zone", {
    name: "expires_at",
    default: () => "(now() + '00:10:00')",
  })
  expiresAt: Date;

  @Column("boolean", { name: "is_active", default: () => "true" })
  isActive: boolean;

  @Column("timestamp with time zone", {
    name: "rate_limited_until",
    nullable: true,
  })
  rateLimitedUntil: Date | null;

  @OneToMany(() => AdminCaptchas, (adminCaptchas) => adminCaptchas.adminSession)
  adminCaptchas: AdminCaptchas[];

  @OneToMany(
    () => AdminFailedAttempts,
    (adminFailedAttempts) => adminFailedAttempts.adminSession
  )
  adminFailedAttempts: AdminFailedAttempts[];

  @ManyToOne(() => AdminUsers, (adminUsers) => adminUsers.adminSessions)
  @JoinColumn([{ name: "admin_user_id", referencedColumnName: "id" }])
  adminUser: AdminUsers;

  @ManyToOne(() => SessionTypes, (sessionTypes) => sessionTypes.adminSessions)
  @JoinColumn([{ name: "session_type_id", referencedColumnName: "id" }])
  sessionType: SessionTypes;
}
