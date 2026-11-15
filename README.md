# FlareDrive-R2

FlareDrive-R2 是一个以 Cloudflare R2 为存储的文件管理器，支持目录权限、上传下载、文件分享，以及按需开放访客访问。

## 部署到 Cloudflare Pages

1. 在 Cloudflare R2 中创建存储桶。保持公开访问关闭，Pages Functions 会通过 R2 绑定访问文件。
2. Fork 本仓库，并连接到一个新的 Cloudflare Pages 项目。
3. 设置 Pages 构建命令为 `npm run build`，构建输出目录为 `dist`。
4. 在 Pages **Settings → Bindings** 添加名为 `BUCKET` 的 R2 绑定。
5. 在 **Settings → Variables and Secrets** 中为 Production 和 Preview 添加下方访问配置，然后重新部署。

将 `FLAREDRIVE_USERS` 保存为 Secret。JSON 中以用户名映射密码和目录权限：

```json
{
  "admin": {
    "password": "set-this-in-cloudflare-secret",
    "allowList": "*"
  },
  "user1": {
    "password": "replace-with-another-strong-password",
    "allowList": ["user1/", "shared/"]
  }
}
```

`allowList` 可填写 `*`、逗号分隔的字符串或目录前缀数组，目录名以 `/` 结尾。若要开放匿名访问，将 `GUEST` 设置为允许访问的目录，例如 `public/`。不设置 `GUEST` 时，所有用户都需登录。

旧版文档曾建议将 `admin:123456` 设为 Pages 环境变量名。Pages 环境变量名属于 binding，必须是有效标识符，因此不能使用包含冒号的名称。应用在支持的运行环境中仍兼容旧格式；Cloudflare Pages 请使用 `FLAREDRIVE_USERS` Secret。

应用通过 R2 绑定直接读取文件，不需要公开存储桶 URL 或 `PUBURL`。请勿开放存储桶的匿名写入权限。

## 本地开发

运行 `npm install` 安装依赖。在项目根目录新建本地 `.dev.vars` 文件（已加入 Git 忽略）：

```ini
FLAREDRIVE_USERS={"admin":{"password":"replace-with-a-local-password","allowList":"*"}}
```

先在一个终端启动 Pages Functions 和本地 R2 模拟：

```sh
npm run dev:api
```

再在另一个终端启动 Vite 前端：

```sh
npm run dev
```

打开 Vite 显示的本地地址。`npm run preview` 会先构建前端，再通过 Pages Functions 运行环境提供预览。

## 故障排查

- **尚未绑定 R2 存储桶：** 添加名为 `BUCKET` 的 R2 绑定并重新部署。
- **尚未配置访问权限：** 添加 `FLAREDRIVE_USERS` Secret 或设置 `GUEST`，然后重新部署。
- **上传操作被拒绝：** 确认账号的目录权限包含目标目录。
- **样式没有更新：** 检查 Pages 构建命令和输出目录是否分别为 `npm run build`、`dist`，并确认最新部署已完成。
