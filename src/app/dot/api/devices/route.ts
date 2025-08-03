import { NextRequest, NextResponse } from "next/server";
import Cloudflare from "cloudflare";
import { ZodError } from "zod";
import {
  DeviceSchema,
  CreateDeviceRequestSchema,
  UpdateDeviceRequestSchema,
  UpdateDeviceContentRequestSchema,
  QueryDevicesByOwnerSchema,
  normalizeDeviceData,
  validateDevice,
  type Device,
  type CreateDeviceRequest,
  type UpdateDeviceRequest,
  type UpdateDeviceContentRequest,
  type QueryDevicesByOwner,
} from "@/lib/schemas";

// Cloudflare 配置
const CLOUDFLARE_CONFIG = {
  apiToken: process.env.CLOUDFLARE_API_TOKEN || "",
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID || "",
  namespaceId: process.env.CLOUDFLARE_KV_NAMESPACE_ID || "",
};

// 初始化 Cloudflare 客户端
const cf = new Cloudflare({
  apiToken: CLOUDFLARE_CONFIG.apiToken,
});

// 错误处理工具函数
function handleError(error: unknown, operation: string) {
  console.error(`设备 ${operation} 错误:`, error);

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "数据验证失败",
        details: error.errors.map((err) => ({
          path: err.path.join("."),
          message: err.message,
        })),
      },
      { status: 400 }
    );
  }

  return NextResponse.json(
    {
      error: `${operation}失败`,
      details: error instanceof Error ? error.message : "未知错误",
    },
    { status: 500 }
  );
}

// 通用响应格式
function createSuccessResponse(data: any, type: string) {
  return NextResponse.json({
    success: true,
    type,
    timestamp: new Date().toISOString(),
    ...data,
  });
}

// GET - 获取设备信息或设备列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");
    const owner = searchParams.get("owner");
    const ownerKey = searchParams.get("ownerKey");

    // 如果提供了owner和ownerKey，返回该用户的所有设备
    if (owner && ownerKey) {
      const keysList = await cf.kv.namespaces.keys.list(
        CLOUDFLARE_CONFIG.namespaceId,
        {
          account_id: CLOUDFLARE_CONFIG.accountId,
        }
      );

      const devices: Device[] = [];

      // 获取所有设备并筛选属于该用户的设备
      for (const item of keysList.result || []) {
        try {
          const result = await cf.kv.namespaces.values.get(
            CLOUDFLARE_CONFIG.namespaceId,
            item.name,
            {
              account_id: CLOUDFLARE_CONFIG.accountId,
            }
          );

          if (result) {
            const resultText = await result.text();
            if (resultText) {
              const deviceData = JSON.parse(resultText);

              // 验证设备数据
              try {
                const validatedDevice = validateDevice(deviceData);

                // 检查是否属于指定用户
                if (
                  validatedDevice.owner === owner &&
                  validatedDevice.ownerKey === ownerKey
                ) {
                  devices.push(validatedDevice);
                }
              } catch (error) {
                console.log(`跳过无效设备数据: ${item.name}`);
              }
            }
          }
        } catch (error) {
          console.log(`跳过无法读取的数据: ${item.name}`);
        }
      }

      return createSuccessResponse(
        {
          owner,
          devices,
          count: devices.length,
        },
        "devices_by_owner"
      );
    }

    // 如果没有传入 key 参数，返回所有设备键的列表
    if (!key) {
      const keysList = await cf.kv.namespaces.keys.list(
        CLOUDFLARE_CONFIG.namespaceId,
        {
          account_id: CLOUDFLARE_CONFIG.accountId,
        }
      );

      const devices: Device[] = [];

      for (const item of keysList.result || []) {
        try {
          const result = await cf.kv.namespaces.values.get(
            CLOUDFLARE_CONFIG.namespaceId,
            item.name,
            {
              account_id: CLOUDFLARE_CONFIG.accountId,
            }
          );

          if (result) {
            const resultText = await result.text();
            if (resultText) {
              const deviceData = JSON.parse(resultText);

              // 验证设备数据
              try {
                const validatedDevice = validateDevice(deviceData);
                devices.push(validatedDevice);
              } catch (error) {
                console.log(`跳过无效设备数据: ${item.name}`);
              }
            }
          }
        } catch (error) {
          console.log(`跳过无法读取的数据: ${item.name}`);
        }
      }

      return createSuccessResponse(
        {
          devices,
          count: devices.length,
        },
        "all_devices"
      );
    }

    // 获取特定设备的详细信息
    try {
      const result = await cf.kv.namespaces.values.get(
        CLOUDFLARE_CONFIG.namespaceId,
        key,
        {
          account_id: CLOUDFLARE_CONFIG.accountId,
        }
      );

      if (!result) {
        return NextResponse.json(
          { error: "未找到指定的设备" },
          { status: 404 }
        );
      }

      // 解析并验证数据
      const resultText = await result.text();
      const deviceData = JSON.parse(resultText);
      const validatedDevice = validateDevice(deviceData);

      return createSuccessResponse(
        {
          key,
          device: validatedDevice,
        },
        "device_details"
      );
    } catch (error) {
      // 如果是KV相关错误，返回404
      if (error instanceof Error && error.message.includes("not found")) {
        return NextResponse.json(
          { error: "未找到指定的设备" },
          { status: 404 }
        );
      }
      // 其他错误继续抛出
      throw error;
    }
  } catch (error) {
    return handleError(error, "获取设备数据");
  }
}

// POST - 创建新设备
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 创建新设备
    const validatedRequest: CreateDeviceRequest =
      CreateDeviceRequestSchema.parse(body);
    const { key, value, metadata, ttl } = validatedRequest;

    // 检查设备是否已存在
    try {
      const existingDevice = await cf.kv.namespaces.values.get(
        CLOUDFLARE_CONFIG.namespaceId,
        key,
        {
          account_id: CLOUDFLARE_CONFIG.accountId,
        }
      );

      if (existingDevice) {
        // 检查是否真的有数据
        const existingText = await existingDevice.text();
        if (existingText) {
          return NextResponse.json(
            { error: "设备已存在，请使用PUT方法更新" },
            { status: 409 }
          );
        }
      }
    } catch (error) {
      // 如果获取失败，可能是设备不存在，这是正常情况，继续创建
      console.log("设备不存在，准备创建新设备");
    }

    // 标准化设备数据
    const normalizedDevice = normalizeDeviceData(value);

    // 准备存储参数
    const params: any = {
      account_id: CLOUDFLARE_CONFIG.accountId,
    };

    if (metadata) {
      params.metadata = metadata;
    }
    if (ttl) {
      params.expiration_ttl = ttl;
    }

    // 存储到 Cloudflare KV
    await cf.kv.namespaces.values.update(CLOUDFLARE_CONFIG.namespaceId, key, {
      value: JSON.stringify(normalizedDevice),
      ...params,
    });

    return createSuccessResponse(
      {
        message: "设备创建成功",
        key,
        device: normalizedDevice,
      },
      "device_created"
    );
  } catch (error) {
    return handleError(error, "创建设备");
  }
}

// PUT - 更新设备信息
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // 尝试解析为内容更新请求或完整更新请求
    let key: string;
    let mergedData: any;
    let metadata: any;
    let ttl: number | undefined;

    try {
      // 尝试作为内容更新请求解析
      const contentRequest: UpdateDeviceContentRequest =
        UpdateDeviceContentRequestSchema.parse(body);
      key = contentRequest.key;

      // 获取现有设备数据并合并内容
      const existingData = await cf.kv.namespaces.values.get(
        CLOUDFLARE_CONFIG.namespaceId,
        key,
        {
          account_id: CLOUDFLARE_CONFIG.accountId,
        }
      );

      if (!existingData) {
        return NextResponse.json({ error: "设备不存在" }, { status: 404 });
      }

      const existingText = await existingData.text();
      if (!existingText) {
        return NextResponse.json({ error: "设备不存在" }, { status: 404 });
      }

      const existing = JSON.parse(existingText);
      mergedData = {
        ...existing,
        content: contentRequest.content,
        updatedAt: new Date().toISOString(),
      };
    } catch {
      // 如果不是内容更新请求，尝试作为完整更新请求解析
      const fullRequest: UpdateDeviceRequest =
        UpdateDeviceRequestSchema.parse(body);
      key = fullRequest.key;
      metadata = fullRequest.metadata;
      ttl = fullRequest.ttl;

      // 获取现有设备数据以保留某些字段
      mergedData = fullRequest.value;

      try {
        const existingData = await cf.kv.namespaces.values.get(
          CLOUDFLARE_CONFIG.namespaceId,
          key,
          {
            account_id: CLOUDFLARE_CONFIG.accountId,
          }
        );

        if (existingData) {
          const existingText = await existingData.text();
          const existing = JSON.parse(existingText);
          // 保留创建时间，更新修改时间
          mergedData = {
            ...fullRequest.value,
            createdAt: existing.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }
      } catch (error) {
        // 如果获取现有数据失败，使用新数据作为完整数据
        console.log("获取现有设备数据失败，将创建新设备");
      }
    }

    // 标准化数据
    const normalizedDevice = normalizeDeviceData(mergedData);

    // 准备存储参数
    const params: any = {
      account_id: CLOUDFLARE_CONFIG.accountId,
    };

    if (metadata) {
      params.metadata = metadata;
    }
    if (ttl) {
      params.expiration_ttl = ttl;
    }

    // 更新 Cloudflare KV
    await cf.kv.namespaces.values.update(CLOUDFLARE_CONFIG.namespaceId, key, {
      value: JSON.stringify(normalizedDevice),
      ...params,
    });

    // 如果更新了内容，发送通知API调用
    if (normalizedDevice.content) {
      try {
        const notifyPayload = {
          deviceId: normalizedDevice.deviceId,
          title: normalizedDevice.content.title,
          message: normalizedDevice.content.message,
          signature: normalizedDevice.content.signature || "",
          link: normalizedDevice.content.link || "",
        };

        const notifyResponse = await fetch(
          "https://dot.mindreset.tech/api/open/text",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${normalizedDevice.ownerKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(notifyPayload),
          }
        );

        console.log(`通知API响应状态: ${notifyResponse.status}`);

        if (!notifyResponse.ok) {
          console.warn(
            `通知API请求失败: ${notifyResponse.status} ${notifyResponse.statusText}`
          );
        }
      } catch (notifyError) {
        console.error("发送内容更新通知失败:", notifyError);
        // 不影响主要的更新操作，只记录错误
      }
    }

    return createSuccessResponse(
      {
        message: "设备更新成功",
        key,
        device: normalizedDevice,
      },
      "device_updated"
    );
  } catch (error) {
    return handleError(error, "更新设备");
  }
}

// DELETE - 删除设备或批量删除
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");
    const owner = searchParams.get("owner");
    const ownerKey = searchParams.get("ownerKey");
    const deleteAll = searchParams.get("deleteAll") === "true";

    if (deleteAll && owner && ownerKey) {
      // 删除指定用户的所有设备
      const keysList = await cf.kv.namespaces.keys.list(
        CLOUDFLARE_CONFIG.namespaceId,
        {
          account_id: CLOUDFLARE_CONFIG.accountId,
        }
      );

      const deletedKeys: string[] = [];

      for (const item of keysList.result || []) {
        try {
          const result = await cf.kv.namespaces.values.get(
            CLOUDFLARE_CONFIG.namespaceId,
            item.name,
            {
              account_id: CLOUDFLARE_CONFIG.accountId,
            }
          );

          if (result) {
            const resultText = await result.text();
            if (resultText) {
              const deviceData = JSON.parse(resultText);

              // 验证设备数据且属于指定用户
              try {
                const validatedDevice = validateDevice(deviceData);

                if (
                  validatedDevice.owner === owner &&
                  validatedDevice.ownerKey === ownerKey
                ) {
                  await cf.kv.namespaces.values.delete(
                    CLOUDFLARE_CONFIG.namespaceId,
                    item.name,
                    {
                      account_id: CLOUDFLARE_CONFIG.accountId,
                    }
                  );
                  deletedKeys.push(item.name);
                }
              } catch (error) {
                console.log(`跳过无效设备数据: ${item.name}`);
              }
            }
          }
        } catch (error) {
          console.log(`删除设备失败: ${item.name}`);
        }
      }

      return createSuccessResponse(
        {
          message: `成功删除用户 ${owner} 的 ${deletedKeys.length} 个设备`,
          deletedKeys,
          owner,
        },
        "bulk_delete_completed"
      );
    }

    // 删除单个设备
    if (!key) {
      return NextResponse.json(
        { error: "缺少必需的参数: key" },
        { status: 400 }
      );
    }

    // 检查设备是否存在
    try {
      const existingDevice = await cf.kv.namespaces.values.get(
        CLOUDFLARE_CONFIG.namespaceId,
        key,
        {
          account_id: CLOUDFLARE_CONFIG.accountId,
        }
      );

      if (!existingDevice) {
        return NextResponse.json({ error: "设备不存在" }, { status: 404 });
      }

      // 检查设备是否真的有数据
      const existingText = await existingDevice.text();
      if (!existingText) {
        return NextResponse.json({ error: "设备不存在" }, { status: 404 });
      }
    } catch (error) {
      // 如果获取失败，说明设备不存在
      return NextResponse.json({ error: "设备不存在" }, { status: 404 });
    }

    // 删除设备
    await cf.kv.namespaces.values.delete(CLOUDFLARE_CONFIG.namespaceId, key, {
      account_id: CLOUDFLARE_CONFIG.accountId,
    });

    return createSuccessResponse(
      {
        message: "设备删除成功",
        key,
      },
      "device_deleted"
    );
  } catch (error) {
    return handleError(error, "删除设备");
  }
}

// OPTIONS - 处理 CORS 预检请求
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}
