import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Notifications } from "./Notifications";

@Index("emails_pkey", ["id"], { unique: true })
@Entity("emails", { schema: "public" })
export class Emails {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: string;

  @Column("jsonb", { name: "data_object", nullable: true })
  dataObject: object | null;

  @Column("integer", { name: "attempts", default: () => "0" })
  attempts: number;

  @Column("timestamp with time zone", { name: "last_attempt", nullable: true })
  lastAttempt: Date | null;

  @Column("timestamp with time zone", { name: "sent_at", nullable: true })
  sentAt: Date | null;

  @Column("text", { name: "status", default: () => "'pending'" })
  status: string;

  @Column("timestamp with time zone", {
    name: "created_at",
    default: () => "now()",
  })
  createdAt: Date;

  @Column("text", { name: "error_type", nullable: true })
  errorType: string | null;

  @Column("text", { name: "error", nullable: true })
  error: string | null;

  @Column("integer", { name: "priority", nullable: true, default: () => "5" })
  priority: number | null;

  @Column("timestamp with time zone", { name: "retry_after", nullable: true })
  retryAfter: Date | null;

  @Column("timestamp with time zone", {
    name: "processing_started_at",
    nullable: true,
  })
  processingStartedAt: Date | null;

  @Column("uuid", { name: "lock_id", nullable: true })
  lockId: string | null;

  @Column("bigint", { name: "recipient_id", nullable: true })
  recipientId: string | null;

  @Column("text", { name: "recipient_email", nullable: true })
  recipientEmail: string | null;

  @Column("text", { name: "text_content", nullable: true })
  textContent: string | null;

  @Column("text", { name: "subject", nullable: true })
  subject: string | null;

  @Column("text", { name: "type", default: () => "'Email'" })
  type: string;

  @ManyToOne(() => Notifications, (notifications) => notifications.emails)
  @JoinColumn([{ name: "notification_id", referencedColumnName: "id" }])
  notification: Notifications;
}
