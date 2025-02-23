import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Index("file_uploads_pkey", ["id"], { unique: true })
@Entity("file_uploads", { schema: "public" })
export class FileUploads {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: string;

  @Column("text", { name: "file_name" })
  fileName: string;

  @Column("text", { name: "file_path" })
  filePath: string;

  @Column("text", { name: "status" })
  status: string;

  @Column("timestamp with time zone", {
    name: "created_at",
    default: () => "now()",
  })
  createdAt: Date;
}
