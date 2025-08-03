"use client";

import React, { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDeviceOperations } from "@/hooks/use-devices";
import { Device } from "@/lib/schemas";
import { toast } from "sonner";

// 表单验证 Schema
const deviceFormSchema = z.object({
  // 基础信息
  owner: z.string().min(1, "拥有者不能为空").max(30, "拥有者不能超过30个字符"),
  ownerKey: z.string().regex(/^dot_app_[A-Za-z0-9]{64}$/, "API密钥格式不正确"),
  deviceId: z.string().max(12, "设备ID不能超过12个字符"),
  name: z
    .string()
    .min(1, "设备名称不能为空")
    .max(50, "设备名称不能超过50个字符"),
});

type DeviceFormData = z.infer<typeof deviceFormSchema>;

interface DeviceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device?: Device | null;
  onSuccess?: () => void;
}

export function DeviceFormDialog({
  open,
  onOpenChange,
  device,
  onSuccess,
}: DeviceFormDialogProps) {
  const { createDevice, updateDevice, loading } = useDeviceOperations();
  const [isEditing] = useState(!!device);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<DeviceFormData>({
    resolver: zodResolver(deviceFormSchema),
    defaultValues: {
      owner: "",
      ownerKey: "",
      deviceId: "",
      name: "",
    },
  });

  // 文件转换为base64
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // 当对话框打开时重置表单
  useEffect(() => {
    if (open) {
      if (device) {
        // 编辑模式 - 填充现有数据
        form.reset({
          owner: device.owner,
          ownerKey: device.ownerKey,
          deviceId: device.deviceId,
          name: device.name,
        });
      } else {
        // 新建模式 - 设备ID默认为空
        form.reset({
          owner: "",
          ownerKey: "",
          deviceId: "",
          name: "",
        });
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    }
  }, [open, device, form]);

  const onSubmit = async (data: DeviceFormData) => {
    try {
      // 处理设备数据，设备内容为空字符串
      const deviceData = {
        owner: data.owner,
        ownerKey: data.ownerKey,
        deviceId: data.deviceId,
        name: data.name,
      };

      if (isEditing && device) {
        // 更新设备 - 保留原有内容
        await updateDevice({
          key: device.deviceId,
          value: {
            ...deviceData,
            deviceId: device.deviceId ?? "",
            content: device.content ?? {},
          },
        });
        toast.success("设备更新成功！");
      } else {
        // 创建新设备
        await createDevice({
          key: data.deviceId,
          value: {
            ...deviceData,
            deviceId: data.deviceId ?? "",
            content: {
              title: "",
              message: "",
              signature: "",
              link: "",
            },
          },
        });
        toast.success("设备创建成功！");
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作失败");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "编辑设备" : "添加新设备"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "修改设备基础信息" : "创建一个新的设备"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* 基础信息卡片 */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="owner"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>拥有者</FormLabel>
                    <FormControl>
                      <Input placeholder="输入拥有者名称" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>设备名称</FormLabel>
                    <FormControl>
                      <Input placeholder="输入设备名称" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="deviceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>设备ID</FormLabel>
                  <FormControl>
                    <Input placeholder="" {...field} readOnly={isEditing} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ownerKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API密钥</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="dot_app_..."
                      {...field}
                      readOnly={isEditing}
                      className="font-mono text-xs"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 设备内容卡片 */}
            {/* <Card>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>标题</FormLabel>
                      <FormControl>
                        <Input placeholder="输入通知标题" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>内容</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="输入通知内容"
                          rows={3}
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="signature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>签名（可选）</FormLabel>
                        <FormControl>
                          <Input placeholder="输入签名" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="link"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>链接（可选）</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card> */}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                取消
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "保存中..." : isEditing ? "更新设备" : "创建设备"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
