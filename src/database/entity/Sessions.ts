import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Captchas } from "./Captchas";
import { Carts } from "./Carts";
import { FailedAttempts } from "./FailedAttempts";
import { SessionTypes } from "./SessionTypes";
import { Users } from "./Users";

@Index("sessions_pkey", ["id"], { unique: true })
@Index("sessions_session_hash_key", ["sessionHash"], { unique: true })
@Entity("sessions", { schema: "public" })
export class Sessions {
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

  @OneToMany(() => Captchas, (captchas) => captchas.session)
  captchas: Captchas[];

  @OneToMany(() => Carts, (carts) => carts.session)
  carts: Carts[];

  @OneToMany(() => FailedAttempts, (failedAttempts) => failedAttempts.session)
  failedAttempts: FailedAttempts[];

  @ManyToOne(() => SessionTypes, (sessionTypes) => sessionTypes.sessions)
  @JoinColumn([{ name: "session_type_id", referencedColumnName: "id" }])
  sessionType: SessionTypes;

  @ManyToOne(() => Users, (users) => users.sessions)
  @JoinColumn([{ name: "user_id", referencedColumnName: "id" }])
  user: Users;
}
