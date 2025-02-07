import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Emails } from "./Emails";
import { EmailTemplates } from "./EmailTemplates";

@Index("notifications_pkey", ["id"], { unique: true })
@Entity("notifications", { schema: "public" })
export class Notifications {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: string;

  @Column("text", { name: "name" })
  name: string;

  @Column("text", { name: "user_ids" })
  userIds: string;

  @Column("boolean", { name: "is_active", default: () => "true" })
  isActive: boolean;

  @Column("timestamp with time zone", {
    name: "created_at",
    default: () => "now()",
  })
  createdAt: Date;

  @OneToMany(() => Emails, (emails) => emails.notification)
  emails: Emails[];

  @ManyToOne(
    () => EmailTemplates,
    (emailTemplates) => emailTemplates.notifications
  )
  @JoinColumn([{ name: "template_id", referencedColumnName: "id" }])
  template: EmailTemplates;
}
