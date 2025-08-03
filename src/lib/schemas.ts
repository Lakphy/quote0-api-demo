import { z } from "zod";

// 设备内容Schema
export const DeviceContentSchema = z.object({
  title: z.string().max(100, "标题不能超过100个字符").optional(),
  message: z.string().max(500, "内容不能超过500个字符").optional(),
  signature: z.string().max(50, "签名不能超过50个字符").optional(),
  link: z.string().optional(),
});

// 设备Schema（作为KV的值）
export const DeviceSchema = z.object({
  owner: z.string().min(1, "拥有者不能为空").max(30, "拥有者不能超过30个字符"),
  ownerKey: z.string().regex(/^dot_app_[A-Za-z0-9]{64}$/, "API密钥格式不正确"),
  deviceId: z.string().regex(/^[A-F0-9]{12}$/, "设备ID必须是12位十六进制字符"),
  name: z
    .string()
    .min(1, "设备名称不能为空")
    .max(50, "设备名称不能超过50个字符"),
  content: DeviceContentSchema,
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

// === API请求Schema ===

// 创建设备请求
export const CreateDeviceRequestSchema = z.object({
  key: z.string().min(1, "设备ID不能为空"),
  value: DeviceSchema,
  metadata: z.record(z.any()).optional(),
  ttl: z.number().min(60).max(31536000).optional(), // 1分钟到1年
});

// 更新设备请求（完整更新）
export const UpdateDeviceRequestSchema = CreateDeviceRequestSchema;

// 更新设备内容请求（仅更新内容）
export const UpdateDeviceContentRequestSchema = z.object({
  key: z.string().min(1, "设备ID不能为空"),
  content: DeviceContentSchema,
});

// 按拥有者查询设备请求
export const QueryDevicesByOwnerSchema = z.object({
  owner: z.string().min(1, "拥有者不能为空"),
  ownerKey: z.string().regex(/^dot_app_[A-Za-z0-9]{64}$/, "API密钥格式不正确"),
});

// 数据迁移请求
export const MigrateAccountRequestSchema = z.object({
  operation: z.literal("migrate"),
  accountKey: z.string().min(1, "账户key不能为空"),
});

// === 类型定义 ===

export type DeviceContent = z.infer<typeof DeviceContentSchema>;
export type Device = z.infer<typeof DeviceSchema>;
export type CreateDeviceRequest = z.infer<typeof CreateDeviceRequestSchema>;
export type UpdateDeviceRequest = z.infer<typeof UpdateDeviceRequestSchema>;
export type UpdateDeviceContentRequest = z.infer<
  typeof UpdateDeviceContentRequestSchema
>;
export type QueryDevicesByOwner = z.infer<typeof QueryDevicesByOwnerSchema>;
export type MigrateAccountRequest = z.infer<typeof MigrateAccountRequestSchema>;

// === 验证函数 ===

export function validateDevice(data: unknown): Device {
  return DeviceSchema.parse(data);
}

export function validateDeviceContent(data: unknown): DeviceContent {
  return DeviceContentSchema.parse(data);
}

// === 数据转换函数 ===

/**
 * 标准化设备数据，确保包含必要的时间戳
 */
export function normalizeDeviceData(rawData: any): Device {
  const now = new Date().toISOString();

  return {
    ...rawData,
    createdAt: rawData.createdAt || now,
    updatedAt: now,
  };
}

/**
 * 验证设备拥有权
 */
export function validateDeviceOwnership(
  device: Device,
  owner: string,
  ownerKey: string
): boolean {
  return device.owner === owner && device.ownerKey === ownerKey;
}
