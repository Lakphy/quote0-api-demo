"use client";

import { useState, useEffect, useCallback } from "react";
import {
  deviceApi,
  DeviceListResponse,
  DeviceOperationResponse,
} from "@/lib/device-api";
import {
  Device,
  CreateDeviceRequest,
  UpdateDeviceRequest,
  UpdateDeviceContentRequest,
} from "@/lib/schemas";

// 设备列表 Hook
export function useDevices(initialDevices?: Device[], initialError?: string) {
  const [devices, setDevices] = useState<Device[]>(initialDevices || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError || null);

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await deviceApi.getAllDevices();
      setDevices(response.devices || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取设备列表失败");
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 如果没有初始数据，则获取数据
    // 如果有初始数据，则不需要立即获取，除非用户主动刷新
    if (!initialDevices || initialDevices.length === 0) {
      fetchDevices();
    }
  }, [fetchDevices, initialDevices]);

  const refreshDevices = useCallback(
    (timeout?: number = 0) => {
      setTimeout(() => {
        fetchDevices();
      }, timeout);
    },
    [fetchDevices]
  );

  return {
    devices,
    loading,
    error,
    refreshDevices,
  };
}

// 按用户获取设备 Hook
export function useUserDevices(owner?: string, ownerKey?: string) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserDevices = useCallback(async () => {
    if (!owner || !ownerKey) {
      setDevices([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await deviceApi.getDevicesByOwner(owner, ownerKey);
      setDevices(response.devices || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取用户设备失败");
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, [owner, ownerKey]);

  useEffect(() => {
    fetchUserDevices();
  }, [fetchUserDevices]);

  const refreshUserDevices = useCallback(() => {
    fetchUserDevices();
  }, [fetchUserDevices]);

  return {
    devices,
    loading,
    error,
    refreshUserDevices,
  };
}

// 设备操作 Hook
export function useDeviceOperations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createDevice = useCallback(
    async (
      request: CreateDeviceRequest
    ): Promise<DeviceOperationResponse | null> => {
      setLoading(true);
      setError(null);
      try {
        const response = await deviceApi.createDevice(request);
        return response;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "创建设备失败";
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const updateDevice = useCallback(
    async (
      request: UpdateDeviceRequest
    ): Promise<DeviceOperationResponse | null> => {
      setLoading(true);
      setError(null);
      try {
        const response = await deviceApi.updateDevice(request);
        return response;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "更新设备失败";
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const updateDeviceContent = useCallback(
    async (
      request: UpdateDeviceContentRequest
    ): Promise<DeviceOperationResponse | null> => {
      setLoading(true);
      setError(null);
      try {
        const response = await deviceApi.updateDeviceContent(request);
        return response;
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "更新设备内容失败";
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const deleteDevice = useCallback(
    async (key: string): Promise<DeviceOperationResponse | null> => {
      setLoading(true);
      setError(null);
      try {
        const response = await deviceApi.deleteDevice(key);
        return response;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "删除设备失败";
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const deleteAllUserDevices = useCallback(
    async (
      owner: string,
      ownerKey: string
    ): Promise<DeviceOperationResponse | null> => {
      setLoading(true);
      setError(null);
      try {
        const response = await deviceApi.deleteAllUserDevices(owner, ownerKey);
        return response;
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "删除所有设备失败";
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    loading,
    error,
    createDevice,
    updateDevice,
    updateDeviceContent,
    deleteDevice,
    deleteAllUserDevices,
  };
}

// 单个设备 Hook
export function useDevice(key?: string) {
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDevice = useCallback(async () => {
    if (!key) {
      setDevice(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await deviceApi.getDevice(key);
      setDevice(response.device);
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取设备详情失败");
      setDevice(null);
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    fetchDevice();
  }, [fetchDevice]);

  const refreshDevice = useCallback(() => {
    fetchDevice();
  }, [fetchDevice]);

  return {
    device,
    loading,
    error,
    refreshDevice,
  };
}
