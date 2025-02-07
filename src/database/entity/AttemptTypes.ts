import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { AdminFailedAttempts } from "./AdminFailedAttempts";
import { FailedAttempts } from "./FailedAttempts";

@Index("attempt_types_pkey", ["id"], { unique: true })
@Index("attempt_types_type_key", ["type"], { unique: true })
@Entity("attempt_types", { schema: "public" })
export class AttemptTypes {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: string;

  @Column("text", { name: "type", unique: true })
  type: string;

  @OneToMany(
    () => AdminFailedAttempts,
    (adminFailedAttempts) => adminFailedAttempts.attemptType
  )
  adminFailedAttempts: AdminFailedAttempts[];

  @OneToMany(
    () => FailedAttempts,
    (failedAttempts) => failedAttempts.attemptType
  )
  failedAttempts: FailedAttempts[];
}
