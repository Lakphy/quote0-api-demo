"use client";

import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Search, RefreshCw, Filter, Grid, List } from "lucide-react";
import { useDevices, useDeviceOperations } from "@/hooks/use-devices";
import { DeviceFormDialog } from "./device-form-dialog";
import { DeviceCard } from "./device-card";
import { Device } from "@/lib/schemas";
import { toast } from "sonner";

interface DeviceListProps {
  initialDevices?: Device[];
  initialError?: string;
}

export function DeviceList({
  initialDevices = [],
  initialError,
}: DeviceListProps) {
  // 使用优化后的 useDevices hook，传入初始数据
  const { devices, loading, error, refreshDevices } = useDevices(
    initialDevices,
    initialError
  );
  const { deleteDevice, loading: operationLoading } = useDeviceOperations();

  // 状态管理
  const [searchQuery, setSearchQuery] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);

  // 筛选和搜索逻辑
  const filteredDevices = useMemo(() => {
    return devices.filter((device) => {
      const matchesSearch =
        !searchQuery ||
        device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.deviceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.content.title
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        device.content.message
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      const matchesOwner =
        !ownerFilter ||
        device.owner.toLowerCase().includes(ownerFilter.toLowerCase());

      return matchesSearch && matchesOwner;
    });
  }, [devices, searchQuery, ownerFilter]);

  // 获取所有拥有者列表用于筛选
  const owners = useMemo(() => {
    const ownerSet = new Set(devices.map((device) => device.owner));
    return Array.from(ownerSet).sort();
  }, [devices]);

  // 处理删除设备
  const handleDeleteDevice = async () => {
    if (!deviceToDelete) return;

    try {
      await deleteDevice(deviceToDelete.deviceId);
      toast.success("设备删除成功！");
      refreshDevices(500);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除设备失败");
    } finally {
      setDeleteDialogOpen(false);
      setDeviceToDelete(null);
    }
  };

  // 处理设备更新后刷新
  const handleDeviceUpdate = () => {
    refreshDevices(500);
  };

  // 处理删除确认
  const handleDeleteConfirm = (device: Device) => {
    setDeviceToDelete(device);
    setDeleteDialogOpen(true);
  };

  // 渲染加载状态
  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>设备列表</CardTitle>
            <CardDescription>管理所有设备</CardDescription>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // 渲染错误状态
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>设备列表</CardTitle>
          <CardDescription>管理所有设备</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              {error}
              <Button
                variant="outline"
                size="sm"
                className="ml-4"
                onClick={() => refreshDevices()}
              >
                重试
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部卡片 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Grid className="h-5 w-5" />
                设备列表
              </CardTitle>
              <CardDescription>
                管理所有设备 - 总计 {devices.length} 个设备
                {filteredDevices.length !== devices.length &&
                  `, 筛选后 ${filteredDevices.length} 个`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => refreshDevices()}
                disabled={loading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                刷新
              </Button>
              <Button onClick={() => setShowFormDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                添加设备
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* 搜索和筛选栏 */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索设备名称、key、标题或内容..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 设备卡片网格 */}
      {filteredDevices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                <Grid className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-medium">
                  {devices.length === 0 ? "暂无设备" : "没有符合条件的设备"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {devices.length === 0
                    ? "开始创建您的第一个设备来管理消息推送"
                    : "尝试调整搜索条件或筛选器"}
                </p>
              </div>
              {devices.length === 0 && (
                <Button onClick={() => setShowFormDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  创建第一个设备
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredDevices.map((device) => (
            <DeviceCard
              key={device.deviceId}
              device={device}
              onUpdate={handleDeviceUpdate}
              onDelete={() => handleDeleteConfirm(device)}
            />
          ))}
        </div>
      )}

      {/* 设备表单对话框 */}
      <DeviceFormDialog
        open={showFormDialog}
        onOpenChange={setShowFormDialog}
        onSuccess={() => {
          refreshDevices(500);
        }}
      />

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除设备</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除设备 "{deviceToDelete?.name}" 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDevice}
              disabled={operationLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {operationLoading ? "删除中..." : "删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
