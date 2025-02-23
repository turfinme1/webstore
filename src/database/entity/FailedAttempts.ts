import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { AttemptTypes } from "./AttemptTypes";
import { Sessions } from "./Sessions";

@Index("failed_attempts_pkey", ["id"], { unique: true })
@Entity("failed_attempts", { schema: "public" })
export class FailedAttempts {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: string;

  @Column("timestamp with time zone", {
    name: "created_at",
    default: () => "now()",
  })
  createdAt: Date;

  @ManyToOne(() => AttemptTypes, (attemptTypes) => attemptTypes.failedAttempts)
  @JoinColumn([{ name: "attempt_type_id", referencedColumnName: "id" }])
  attemptType: AttemptTypes;

  @ManyToOne(() => Sessions, (sessions) => sessions.failedAttempts)
  @JoinColumn([{ name: "session_id", referencedColumnName: "id" }])
  session: Sessions;
}
