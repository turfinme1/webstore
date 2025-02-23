import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { AdminUsers } from "./AdminUsers";
import { Users } from "./Users";

@Index("genders_pkey", ["id"], { unique: true })
@Index("genders_type_key", ["type"], { unique: true })
@Entity("genders", { schema: "public" })
export class Genders {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: string;

  @Column("text", { name: "type", unique: true })
  type: string;

  @OneToMany(() => AdminUsers, (adminUsers) => adminUsers.gender)
  adminUsers: AdminUsers[];

  @OneToMany(() => Users, (users) => users.gender)
  users: Users[];
}
