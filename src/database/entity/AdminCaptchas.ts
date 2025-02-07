import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { AdminSessions } from "./AdminSessions";

@Index("admin_captchas_pkey", ["id"], { unique: true })
@Entity("admin_captchas", { schema: "public" })
export class AdminCaptchas {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: string;

  @Column("text", { name: "equation" })
  equation: string;

  @Column("text", { name: "answer" })
  answer: string;

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

  @ManyToOne(
    () => AdminSessions,
    (adminSessions) => adminSessions.adminCaptchas
  )
  @JoinColumn([{ name: "admin_session_id", referencedColumnName: "id" }])
  adminSession: AdminSessions;
}
