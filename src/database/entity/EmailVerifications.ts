import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Users } from "./Users";

@Index("email_verifications_pkey", ["id"], { unique: true })
@Index("email_verifications_token_hash_key", ["tokenHash"], { unique: true })
@Entity("email_verifications", { schema: "public" })
export class EmailVerifications {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: string;

  @Column("uuid", {
    name: "token_hash",
    unique: true,
    default: () => "uuid_generate_v4()",
  })
  tokenHash: string;

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

  @ManyToOne(() => Users, (users) => users.emailVerifications)
  @JoinColumn([{ name: "user_id", referencedColumnName: "id" }])
  user: Users;
}
