# 数据表格与文件管理器基准研究

| 场景 | 优秀产品做法 | 当前问题 | 采用方案 | 明确不采用 |
| --- | --- | --- | --- | --- |
| 表格任务入口 | [Ant Design Table](https://ant.design/components/table/) 与 [Carbon Data Table](https://carbondesignsystem.com/components/data-table/usage/) 将搜索、筛选、表格操作和结果数量组织成一个任务区域 | 页面标题、筛选卡片和结果卡片重复分层 | 页面标题只保留一次；筛选、批量操作、密度与列设置进入 DataTable 工具栏 | 白色卡片多层嵌套；标题在正文重复 |
| 表头与排序 | [MUI X Data Grid](https://mui.com/x/react-data-grid/sorting/) 只在可排序列暴露排序状态，并提供键盘与 ARIA 反馈 | 表头层级弱，排序能力分散 | 可排序列使用明确按钮、方向图标和 `aria-sort`，不可排序列保持静态 | 所有列常驻排序图标；只靠颜色表示方向 |
| 行密度 | Carbon 提供多级行高，Google Drive 提供密度选择 | 少量数据仍占据大块空白，不同页面密度不一致 | 默认中等密度，支持紧凑/宽松；高度随内容自然结束 | 固定大高度；用空白填满视口 |
| 行操作 | Carbon 建议常用操作直接展示，低频操作进入 overflow；Ant Design 将主操作与更多菜单分层 | 一行平铺大量蓝色文字 | 每行一个主要操作、一个次要操作和一个“更多”菜单 | 全部操作平铺；危险操作与普通操作同权重 |
| 选择与批量操作 | Carbon 的批量操作条替换工具栏并显示选择数；MUI 支持复选、多选和键盘选择 | 已选状态与可执行动作脱节 | 选择后切换 Selection Bar，显示数量、适用操作和取消选择 | 选择后仍保留无关全局操作 |
| 列设置与横向滚动 | MUI 支持列显示、固定列与虚拟化；Ant Design 支持 responsive/hidden columns | 1366 下操作列被裁切，页面整体可能横向滚动 | 核心列响应式组合；扩展列由用户开启并只在表格内部滚动；操作列保持可达 | 压缩到不可读；让整页横向滚动 |
| 加载与异常 | Ant Design、MUI、Carbon 都把 Skeleton、Empty、Error 作为表格主体状态 | 空状态缺下一步，错误与加载反馈不统一 | DataTable 内置 Skeleton、Error/Retry、Empty、No Result 与 CTA | 空白表格；点击后无反馈 |
| 容量使用率 | 云控制台普遍同时展示已用/总量、百分比和剩余量，并以阈值提示风险 | 仅有细蓝线，数字关系不清晰 | 统一 UsageMeter：6–10px 轨道、数值/百分比/剩余量、文字状态 | 原生 `progress` 外观；只靠颜色；霓虹发光 |
| 地址与导航 | macOS Finder、Windows 文件资源管理器把前进/后退/上级、路径和搜索放在稳定的顶栏 | 导航和路径拆成多行，纵向占用高 | Command Bar 第一行集中导航、面包屑地址和搜索 | 独立路径卡片；重复页面标题 |
| 文件全局操作与选择操作 | OneDrive、Dropbox 和云对象存储工具在未选择时展示上传/新建，选择后展示对象操作 | 上传、新建、排序、任务与对象操作混在一起 | 第二行在全局 Command Bar 与 Selection Command Bar 之间切换 | 排序单独占满一行；所有动作同时常驻 |
| 文件列表与右键 | [腾讯云 COSBrowser](https://intl.cloud.tencent.com/document/product/436/32565) 与 [华为 OBS Browser+](https://support.huaweicloud.com/intl/en-us/qs-obs/obs_qs_0002.html) 支持按钮、右键和拖拽入口 | 文件行只保留三个点，发现性低 | 行 Hover 快捷操作 + 更多菜单；文件、文件夹、树节点和空白区使用语境化菜单 | 把全部能力隐藏在三个点里；使用浏览器默认菜单 |
| Inspector 与预览 | Finder 预览窗格可折叠；Dropbox Quick View 在右侧按需打开，保留浏览上下文 | Inspector 长期空置仍占宽度 | 默认折叠；单选自动展示详情，多选展示汇总；1366 自动收起，可由用户固定 | 永久空白 Inspector；预览后丢失当前目录 |
| 文件任务与恢复 | COSBrowser/OBS Browser+ 用任务中心管理传输与失败重试；[Google Drive 快捷键](https://support.google.com/drive/answer/2563044)覆盖预览、详情、撤销和面板导航 | 任务中心形成孤立横条，缺少 Undo 和键盘闭环 | 右下任务抽屉展示进度/状态/失败原因；支持 Enter、Delete、F2、全选、复制粘贴、Escape 与 Undo | 用大 Modal 阻断浏览；非危险操作反复确认 |
