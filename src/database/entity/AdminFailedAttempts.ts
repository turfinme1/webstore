import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { AdminSessions } from "./AdminSessions";
import { AttemptTypes } from "./AttemptTypes";

@Index("admin_failed_attempts_pkey", ["id"], { unique: true })
@Entity("admin_failed_attempts", { schema: "public" })
export class AdminFailedAttempts {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: string;

  @Column("timestamp with time zone", {
    name: "created_at",
    default: () => "now()",
  })
  createdAt: Date;

  @ManyToOne(
    () => AdminSessions,
    (adminSessions) => adminSessions.adminFailedAttempts
  )
  @JoinColumn([{ name: "admin_session_id", referencedColumnName: "id" }])
  adminSession: AdminSessions;

  @ManyToOne(
    () => AttemptTypes,
    (attemptTypes) => attemptTypes.adminFailedAttempts
  )
  @JoinColumn([{ name: "attempt_type_id", referencedColumnName: "id" }])
  attemptType: AttemptTypes;
}
