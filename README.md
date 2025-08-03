# Quote/0 发信 demo

使用方法：

1. 配置环境变量

```bash
cp .env.example .env
```

在 cloudflare 上创建一个 KV 存储，并配置环境变量

```bash
CLOUDFLARE_API_TOKEN=< cloudflare api token >
CLOUDFLARE_ACCOUNT_ID=< cloudflare 账号 id >
CLOUDFLARE_KV_NAMESPACE_ID=< cloudflare kv 存储 namespace id >
```

2. 安装依赖

```bash
pnpm install
```

3. 运行项目

```bash
pnpm dev
```

4. 访问 http://localhost:3000/dot 查看页面

![image.png](images/img1.png)
