import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Index("app_settings_pkey", ["id"], { unique: true })
@Entity("app_settings", { schema: "public" })
export class AppSettings {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: string;

  @Column("bigint", { name: "request_limit", default: () => "10" })
  requestLimit: string;

  @Column("interval", { name: "request_window", default: () => "'00:10:00'" })
  requestWindow: any;

  @Column("interval", {
    name: "request_block_duration",
    default: () => "'01:00:00'",
  })
  requestBlockDuration: any;

  @Column("boolean", { name: "password_require_digit", default: () => "false" })
  passwordRequireDigit: boolean;

  @Column("boolean", {
    name: "password_require_lowercase",
    default: () => "false",
  })
  passwordRequireLowercase: boolean;

  @Column("boolean", {
    name: "password_require_uppercase",
    default: () => "false",
  })
  passwordRequireUppercase: boolean;

  @Column("boolean", {
    name: "password_require_special",
    default: () => "false",
  })
  passwordRequireSpecial: boolean;

  @Column("numeric", {
    name: "vat_percentage",
    precision: 5,
    scale: 2,
    default: () => "0.00",
  })
  vatPercentage: string;

  @Column("bigint", { name: "report_row_limit_display", default: () => "1000" })
  reportRowLimitDisplay: string;

  @Column("interval", {
    name: "campaign_status_update_interval",
    default: () => "'00:05:00'",
  })
  campaignStatusUpdateInterval: any;

  @Column("interval", {
    name: "target_group_status_update_interval",
    default: () => "'00:01:00'",
  })
  targetGroupStatusUpdateInterval: any;

  @Column("time with time zone", {
    name: "target_group_status_update_initial_time",
    default: () => "'00:00:00+00'",
  })
  targetGroupStatusUpdateInitialTime: string;
}
