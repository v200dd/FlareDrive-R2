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

## 图片预览与访客上传

- 电脑和手机右上角均有文字“登录”入口，登录后显示“退出”。左侧账号区仍可查看当前账号。
- 对有写入权限的文件夹，打开“…”菜单选择“重命名”。支持有文件、空目录及隐式子目录；同名目标拒绝覆盖，名称未变不执行写入。先完整复制再清理旧目录，复制失败不删除原目录。R2 不支持原子目录重命名，失败时可能留下目标副本，界面会提示检查；重命名过程中请避免同时修改此目录。

- 图片目录默认显示缩略图，可切换为列表。点击图片在当前页面预览原图，支持上一张/下一张、方向键切换、Esc 关闭和下载原图。
- 没有缩略图的旧图片使用原图作为缩略图；旧版误存的表单 Content-Type 会在读取时按已知媒体扩展名纠正，不改动现有 R2 对象。
- **现有权限模型中，`GUEST` 不是只读配置**：访客可以在允许的目录内上传、新建、重命名、移动和删除。请只向可信访问者开放需要写入的目录。
- 访客不能写入目录外（包括共享缩略图目录）；受限访客上传图片直接使用原图展示，不需要额外缩略图权限。界面会显示当前目录是否可上传。
- 上传结果单独显示：成功提示数量，失败保留文件名和服务端错误，不再被刷新列表覆盖。HEIC 等格式是否可预览取决于浏览器，失败时可以下载原图。

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
