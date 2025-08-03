import { DeviceList } from "@/components/device-list";
import { getDevicesServerSide } from "@/lib/device-api";
import { Device } from "@/lib/schemas";

export default async function DotPage() {
  // 在服务端直接从Cloudflare KV获取设备数据
  const { devices, error } = await getDevicesServerSide();

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Quote/0 Manager</h1>
        <p className="text-muted-foreground mt-2">
          管理您的所有设备，支持创建、编辑、删除和查看设备信息
        </p>
      </div>
      <DeviceList initialDevices={devices} initialError={error} />
    </div>
  );
}
