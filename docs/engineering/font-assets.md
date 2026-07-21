# 字体资产记录

## 资产信息

| 项目 | 记录 |
|---|---|
| 文件名 | `MiSansVF.woff2` |
| 项目路径 | `src/assets/fonts/MiSansVF.woff2` |
| 文件大小 | 11,870,264 bytes |
| SHA-256 | `09103434dc310743d51b5e66111848c75c76a00a5a5bc9e5d96200a7e63bf98b` |
| 文件格式 | WOFF2，TrueType outlines |
| 内部 Family Name | `MiSans VF` |
| CSS Family Name | `MiSans VF` |
| 是否为 Variable Font | 是 |
| 字重范围 | 150–700，默认值 330 |
| Variation Axis | `wght`（字重）：min 150、default 330、max 700；未读取到其他轴 |
| 提供方式 | 项目负责人提供 |
| 使用范围 | 当前项目 |
| 授权文档状态 | 仓库中未包含书面授权文件 |

字体检查使用系统 `file` 验证 WOFF2/TrueType 格式，并使用 macOS CoreText
直接读取字体描述符、Family Name、命名实例和 Variation Axis。字体包含 10 个命名实例；与本次实现直接相关的实例坐标包括 Normal 305、Regular 默认 330、Medium 380、Demibold 450，完整可用范围仍以 `wght` 150–700 为准。

## 接入与分发约束

- 字体只保留在上述项目路径，由 Vite 作为本地资产处理；不复制到 `public/`，不转换为 Base64，也不在 CSS 或 JavaScript 中嵌入二进制内容。
- `src/styles/fonts.css` 使用 `font-display: swap` 注册正常体和字体元数据给出的完整字重范围；没有虚构斜体或独立粗体文件。
- 未从互联网下载或引入其他 MiSans 文件、字体包。
- 未声明任何开源许可证或商业许可证类型。
- 未经项目负责人再次确认，不应独立对外分发该字体文件。

## 构建与浏览器验证

- Vite 生产构建生成 `dist/assets/MiSansVF-SF590T81.woff2`；文件名带哈希，构建资产与源文件 SHA-256 相同。`dist/` 由 `.gitignore` 排除，不进入版本控制。
- 开发服务器的字体请求返回 HTTP 200，MIME 为 `font/woff2`，没有字体 404；正常缓存导航中每个页面只观察到一条 WOFF2 资源记录。
- Computed Style 的字体栈以 `MiSans VF` 开头，Font Loading API 对 300、305、330、380、450 与 480 均返回可用。
- 浏览器调试协议对中文/英文/数字混排及 300、305、330、380、480、Demibold 样例均报告 `familyName: MiSans VF`、`isCustomFont: true`；Demibold 对应 PostScript 命名实例 `MiSansVF_Demibold`。
- 根路由、404 与 `/__dev/ui-spec` 在 1920×1080、1366×768 下均无横向溢出，控制台没有 warning/error。中文、英文、数字和标点未观察到乱码或缺字框；本地正常网络导航未观察到明显字体闪烁，未进行限速网络下的闪烁量化。
