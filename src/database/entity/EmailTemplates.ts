import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Notifications } from "./Notifications";

@Index("email_templates_pkey", ["id"], { unique: true })
@Index("email_templates_type_unique", ["name"], { unique: true })
@Index("email_templates_type_key", ["name"], { unique: true })
@Entity("email_templates", { schema: "public" })
export class EmailTemplates {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: string;

  @Column("text", { name: "name" })
  name: string;

  @Column("text", { name: "subject" })
  subject: string;

  @Column("jsonb", { name: "placeholders", nullable: true })
  placeholders: object | null;

  @Column("text", { name: "template", nullable: true })
  template: string | null;

  @Column("bigint", { name: "table_border_width", nullable: true })
  tableBorderWidth: string | null;

  @Column("text", { name: "table_border_color", nullable: true })
  tableBorderColor: string | null;

  @Column("timestamp with time zone", {
    name: "created_at",
    default: () => "now()",
  })
  createdAt: Date;

  @Column("text", { name: "type", default: () => "'Email'" })
  type: string;

  @OneToMany(() => Notifications, (notifications) => notifications.template)
  notifications: Notifications[];
}
