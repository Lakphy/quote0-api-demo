import {
  Device,
  DeviceContent,
  CreateDeviceRequest,
  UpdateDeviceRequest,
  UpdateDeviceContentRequest,
  validateDevice,
} from "./schemas";
import Cloudflare from "cloudflare";

// API 响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  type: string;
  timestamp: string;
  error?: string;
  details?: any;
  data?: T;
}

export interface DeviceListResponse extends ApiResponse {
  devices: Device[];
  count: number;
}

export interface DeviceDetailResponse extends ApiResponse {
  key: string;
  device: Device;
}

export interface DevicesByOwnerResponse extends ApiResponse {
  owner: string;
  devices: Device[];
  count: number;
}

export interface DeviceOperationResponse extends ApiResponse {
  message: string;
  key: string;
  device?: Device;
}

// API 客户端类
export class DeviceApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = "/dot/api/devices") {
    this.baseUrl = baseUrl;
  }

  // 获取所有设备
  async getAllDevices(): Promise<DeviceListResponse> {
    const response = await fetch(this.baseUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  // 根据拥有者获取设备列表
  async getDevicesByOwner(
    owner: string,
    ownerKey: string
  ): Promise<DevicesByOwnerResponse> {
    const url = new URL(this.baseUrl, document.baseURI);
    url.searchParams.set("owner", owner);
    url.searchParams.set("ownerKey", ownerKey);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  // 获取单个设备
  async getDevice(key: string): Promise<DeviceDetailResponse> {
    const url = new URL(this.baseUrl, document.baseURI);
    url.searchParams.set("key", key);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  // 创建设备
  async createDevice(
    request: CreateDeviceRequest
  ): Promise<DeviceOperationResponse> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `HTTP error! status: ${response.status}`
      );
    }
    return response.json();
  }

  // 更新设备
  async updateDevice(
    request: UpdateDeviceRequest
  ): Promise<DeviceOperationResponse> {
    const response = await fetch(this.baseUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `HTTP error! status: ${response.status}`
      );
    }
    return response.json();
  }

  // 仅更新设备内容
  async updateDeviceContent(
    request: UpdateDeviceContentRequest
  ): Promise<DeviceOperationResponse> {
    const url = new URL(this.baseUrl, document.baseURI);
    url.searchParams.set("contentOnly", "true");

    const response = await fetch(url.toString(), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `HTTP error! status: ${response.status}`
      );
    }
    return response.json();
  }

  // 删除设备
  async deleteDevice(key: string): Promise<DeviceOperationResponse> {
    const url = new URL(this.baseUrl, document.baseURI);
    url.searchParams.set("key", key);

    const response = await fetch(url.toString(), {
      method: "DELETE",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `HTTP error! status: ${response.status}`
      );
    }
    return response.json();
  }

  // 批量删除用户的所有设备
  async deleteAllUserDevices(
    owner: string,
    ownerKey: string
  ): Promise<DeviceOperationResponse> {
    const url = new URL(this.baseUrl, document.baseURI);
    url.searchParams.set("deleteAll", "true");
    url.searchParams.set("owner", owner);
    url.searchParams.set("ownerKey", ownerKey);

    const response = await fetch(url.toString(), {
      method: "DELETE",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `HTTP error! status: ${response.status}`
      );
    }
    return response.json();
  }
}

// 导出默认实例
export const deviceApi = new DeviceApiClient();

export function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

// 服务端专用的设备获取函数
export async function getDevicesServerSide(): Promise<{
  devices: Device[];
  error?: string;
}> {
  try {
    // 只在服务端使用
    if (typeof window !== "undefined") {
      throw new Error("This function should only be called on the server side");
    }

    const CLOUDFLARE_CONFIG = {
      apiToken:
        process.env.CLOUDFLARE_API_TOKEN ||
        "vAx9NhGM3-uC-U1ot2lAhAfWXcZukOTJrjL1Nb-e",
      accountId:
        process.env.CLOUDFLARE_ACCOUNT_ID || "b90cae86b5123e559993090555497f3d",
      namespaceId:
        process.env.CLOUDFLARE_KV_NAMESPACE_ID ||
        "45466a713a09496a9b4cd8b1c6d8853a",
    };

    const cf = new Cloudflare({
      apiToken: CLOUDFLARE_CONFIG.apiToken,
    });

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

    return { devices };
  } catch (error) {
    console.error("服务端获取设备数据失败:", error);
    return {
      devices: [],
      error: error instanceof Error ? error.message : "获取设备数据失败",
    };
  }
}
