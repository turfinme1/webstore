import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { AdminSessions } from "./AdminSessions";
import { Sessions } from "./Sessions";

@Index("session_types_pkey", ["id"], { unique: true })
@Index("session_types_type_key", ["type"], { unique: true })
@Entity("session_types", { schema: "public" })
export class SessionTypes {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: string;

  @Column("text", { name: "type", unique: true })
  type: string;

  @OneToMany(() => AdminSessions, (adminSessions) => adminSessions.sessionType)
  adminSessions: AdminSessions[];

  @OneToMany(() => Sessions, (sessions) => sessions.sessionType)
  sessions: Sessions[];
}
