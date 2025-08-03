"use client";

import React, { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Edit,
  Save,
  X,
  Trash2,
  Copy,
  ExternalLink,
  Calendar,
  Key,
  User,
} from "lucide-react";
import { useDeviceOperations } from "@/hooks/use-devices";
import { Device } from "@/lib/schemas";
import { toast } from "sonner";

// 编辑表单验证 Schema
const editDeviceSchema = z.object({
  name: z
    .string()
    .min(1, "设备名称不能为空")
    .max(50, "设备名称不能超过50个字符"),
  content: z.object({
    title: z.string().min(1, "标题不能为空").max(100, "标题不能超过100个字符"),
    message: z
      .string()
      .min(1, "内容不能为空")
      .max(500, "内容不能超过500个字符"),
    signature: z.string().max(50, "签名不能超过50个字符").optional(),
    link: z.string().url("链接格式不正确").optional().or(z.literal("")),
  }),
});

type EditDeviceFormData = z.infer<typeof editDeviceSchema>;

interface DeviceCardProps {
  device: Device;
  onUpdate?: () => void;
  onDelete?: () => void;
}

export function DeviceCard({ device, onUpdate, onDelete }: DeviceCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { updateDevice, loading } = useDeviceOperations();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<EditDeviceFormData>({
    resolver: zodResolver(editDeviceSchema),
    defaultValues: {
      name: device.name,
      content: {
        title: device.content.title,
        message: device.content.message,
        signature: device.content.signature || "",
        link: device.content.link || "",
      },
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

  // 重置表单数据
  useEffect(() => {
    if (isEditing) {
      form.reset({
        name: device.name,
        content: {
          title: device.content.title,
          message: device.content.message,
          signature: device.content.signature || "",
          link: device.content.link || "",
        },
      });
    } else {
      // 退出编辑模式时清除预览状态
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [isEditing, device, form]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    form.reset();
  };

  const handleSave = async (data: EditDeviceFormData) => {
    try {
      await updateDevice({
        key: device.deviceId,
        value: {
          ...device,
          name: data.name,
          content: {
            ...data.content,
            signature: data.content.signature || undefined,
            link: data.content.link || undefined,
          },
        },
      });

      toast.success("设备更新成功！");
      setIsEditing(false);
      onUpdate?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "更新失败");
    }
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${type}已复制到剪贴板`);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "未知";
    return new Date(dateString).toLocaleString("zh-CN");
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {isEditing ? (
              <Form {...form}>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          {...field}
                          className="text-lg font-semibold"
                          placeholder="设备名称"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Form>
            ) : (
              <CardTitle className="text-lg">{device.name}</CardTitle>
            )}
            <CardDescription className="mt-1">
              <div className="flex items-center gap-4 text-xs">
                <Badge variant="secondary" className="text-xs">
                  <User className="h-3 w-3 mr-1" />
                  {device.owner}
                </Badge>
                <span className="flex items-center gap-1">
                  <Key className="h-3 w-3" />
                  ID: {device.deviceId}
                </span>
              </div>
            </CardDescription>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-1 ml-2">
            {isEditing ? (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={form.handleSubmit(handleSave)}
                  disabled={loading}
                >
                  <Save className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="ghost" onClick={handleEdit}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={onDelete}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isEditing ? (
          <Form {...form}>
            <div className="space-y-4">
              {/* 标题编辑 */}
              <FormField
                control={form.control}
                name="content.title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>标题</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="输入消息标题" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 消息内容编辑 */}
              <FormField
                control={form.control}
                name="content.message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>消息内容</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="输入消息内容"
                        className="resize-none"
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 签名、图标和链接编辑 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="content.signature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>签名（可选）</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="输入签名" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="content.link"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>链接（可选）</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </Form>
        ) : (
          <>
            {/* 设备内容显示 */}
            <div className="space-y-3">
              {/* 标题 */}
              {device.content.title && (
                <div className="flex items-start gap-3">
                  {device.content.title && (
                    <div className="flex-1">
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">
                        消息标题
                      </h4>
                      <p className="font-medium">{device.content.title}</p>
                    </div>
                  )}
                </div>
              )}

              {device.content.message && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">
                    消息内容
                  </h4>
                  <p className="text-sm leading-relaxed">
                    {device.content.message}
                  </p>
                </div>
              )}

              {!device.content.title &&
                !device.content.message &&
                !device.content.signature &&
                !device.content.link && (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">
                      暂无设备内容
                    </p>
                  </div>
                )}

              {(device.content.signature || device.content.link) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {device.content.signature && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">
                        签名
                      </h4>
                      <p className="text-sm">{device.content.signature}</p>
                    </div>
                  )}

                  {device.content.link && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">
                        链接
                      </h4>
                      <div className="space-y-1">
                        <a
                          href={device.content.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {device.content.link}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* 设备信息和操作 */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div>
                  <span className="font-medium">API密钥:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="bg-muted px-2 py-1 rounded text-xs font-mono truncate max-w-32">
                      {device.ownerKey}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => handleCopy(device.ownerKey, "API密钥")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  创建: {formatDate(device.createdAt)}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  更新: {formatDate(device.updatedAt)}
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
