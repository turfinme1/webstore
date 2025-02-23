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

  @Column("integer", { name: "email_attempts", default: () => "0" })
  emailAttempts: number;

  @Column("timestamp with time zone", { name: "email_last_attempt", nullable: true })
  emailLastAttempt: Date | null;

  @Column("timestamp with time zone", { name: "sent_at", nullable: true })
  sentAt: Date | null;

  @Column("text", { name: "status", default: () => "'pending'" })
  status: string;

  @Column("timestamp with time zone", {
    name: "created_at",
    default: () => "now()",
  })
  createdAt: Date;

  @Column("integer", { name: "email_priority", nullable: true, default: () => "5" })
  emailPriority: number | null;

  @Column("timestamp with time zone", { name: "email_retry_after", nullable: true })
  emailRetryAfter: Date | null;

  @Column("timestamp with time zone", {
    name: "email_processing_started_at",
    nullable: true,
  })
  emailProcessingStartedAt: Date | null;

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
