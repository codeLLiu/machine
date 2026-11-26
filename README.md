# 机巢中枢控制台

面向无人机机巢（Drone Nest）的 Web 控制台前端，基于《机巢系统》Apifox 接口文档设计。
FlowHub 风格界面（浅蓝渐变底 + 玻璃侧栏 + 白色大圆角卡片，支持深浅双主题），覆盖**态势监控 → 远程操作 → 视频回传 → 设备配置 → 调试诊断**的完整闭环。

技术栈：**Vue 3.5 + Vite 8 + TypeScript + Pinia + Vue Router**，样式为原生 CSS 设计令牌，无 UI 框架依赖。

## 快速开始

> **Node 要求：`^20.19.0 || >=22.12.0`**（Vite 8 / rolldown 依赖 `node:util.styleText`）。
> 版本不符时 `npm run dev` 会打印修复指引，而不是抛 `SyntaxError`。

```bash
node -v            # 先确认 ≥ v22.12 / v20.19
npm install
npm run dev        # http://localhost:5173
```

演示账号：`admin` / `123456`

其它命令：

```bash
npm run build      # 类型检查 + 生产构建，输出到 dist/
npm run typecheck  # 仅类型检查
npm run preview    # 本地预览构建产物
```

<details>
<summary>常见问题：终端提示「无法将"node"项识别为 cmdlet」</summary>

nvm-windows 的 `nvm use` 需要**管理员权限**创建软链，失败时会把 `C:\nvm4w\nodejs` 清空，
而 PATH 指向的正是这个目录，于是 `node` 命令整体消失。

本机已用 junction 把它指向 `D:\nvm\v22.23.4`，无需再执行 `nvm use` 即可使用 Node 22。
若之后切换版本导致再次丢失，用管理员 PowerShell 执行 `nvm use 22.23.4`；
或以当前用户身份重建 junction（免提权）：

```powershell
Remove-Item C:\nvm4w\nodejs -Recurse -Force
New-Item -ItemType Junction -Path C:\nvm4w\nodejs -Target D:\nvm\v22.23.4
```

</details>

## 页面设计

| 路由 | 页面 | 核心内容 |
| --- | --- | --- |
| `/overview` | 机巢态势 | 4 张实时指标卡（数值滚动补间）+ **SVG 机巢剖面图** + 环境监测 + 6 项子系统状态 + 6 轴伺服状态 |
| `/monitor` | 视频监控 | 三路摄像头画面卡（推流时为 LIVE HUD + 扫描线动效）、单路/全部推流与停流、RTSP 地址复制、通道清单表 |
| `/config/plc` | PLC 配置 | 通讯参数与连接自检 |
| `/config/mqtt` | MQTT 接入 | Broker 连接、协议/QoS、身份认证、SSL 双向证书与发布前校验 |
| `/config/camera` | 摄像头 | 视频通道、推流控制与 RTSP 地址 |
| `/debug` | 调试诊断 | 三个工作区：**模块调试**（13 个模块 / 组合模块、位置预设、速度与模式、执行与停止、24 路信号矩阵、日志过滤）、**寄存器读写**、**系统与诊断** |

设计语言（v4 · FlowHub）：浅蓝渐变背景 + 悬浮玻璃侧栏 + 18px 圆角白卡，页面统一大标题、面包屑、
日期 / 设备胶囊与全局急停；蓝色数据可视化（KPI、进度条、流程条），语义化状态色；顶栏内置 ⌘K 页面搜索。
动效只服务反馈——首屏骨架、数值滚动、面板逐个抬升、信号变化高亮、执行中进度、日志逐条推入；
`prefers-reduced-motion` 下全部关闭。

设计原则：**一屏内完成一件事**。监控页只看不点；操作页每个按钮都能看到"执行前状态 → 执行后变化"；
危险操作（紧急刹车、重启、伺服上电）统一走二次确认弹窗。

## 目录结构

```
src/
├─ api/
│  ├─ types.ts        # 16 个接口的请求/响应类型
│  ├─ client.ts       # fetch 封装：baseURL、2.5s 超时、错误归一、自动降级
│  ├─ endpoints.ts    # 类型化接口方法（唯一的数据出口）
│  └─ mock.ts         # 无后端时的演示数据
├─ components/        # AppIcon / AppSidebar / AppHeader / PageHeader / AppToast / AppConfirm / NestSchematic
├─ composables/       # toast、confirm 等轻量交互
├─ layouts/           # AdminLayout 整体骨架
├─ router/            # 路由表 + 菜单配置（appMenu）+ 登录守卫
├─ stores/            # Pinia：user / app / nest / control
├─ styles/main.css    # 设计令牌与原子类（末段为 FlowHub 风格层）
└─ views/             # 5 个业务页 + 登录 + 404
```

## 接口对接

工程已按 Apifox 文档实现全部 16 个接口的调用，**默认指向真实设备**，无后端时自动退回演示数据。

| 模块 | 接口 |
| --- | --- |
| 运行状态 | `GET /api/getRunStatus`、`GET /api/getPlcErr` |
| 设备控制 | `POST /api/functionDebug` |
| PLC | `POST /api/getPlc`、`POST /api/savePlc` |
| MQTT | `GET /api/getMqtt`、`POST /api/setMqtt`、`POST /api/uploadCert` |
| 摄像头 | `POST /api/getCamera`、`POST /api/saveCamera`、`POST /api/startStream`、`POST /api/stopStream` |
| 调试 | `POST /api/testRead`、`POST /api/testWrite`、`POST /api/setSystem`、`POST /api/reboot` |

配置方式（`vite.config.ts` 已内置代理，避免跨域）：

```bash
# .env.local
VITE_API_TARGET=http://192.168.12.1:7810   # 机巢设备地址，默认值同左
VITE_API_BASE=                              # 同源代理时留空
VITE_USE_MOCK=1                             # 强制使用演示数据（无设备时）
```

降级逻辑：请求超时 2.5s 或网络不可达 → 自动切 mock 并在顶栏显示「演示数据」标记；
业务错误（HTTP 非 2xx / `code !== 1`）不降级，直接 toast 提示，避免掩盖真实故障。

## 约定

- 路径别名 `@` → `src`（见 `vite.config.ts` 与 `tsconfig.app.json`）。
- 组件样式使用 `scoped`，全局令牌集中在 `src/styles/main.css`。
- 菜单统一维护在 `src/router/index.ts` 的 `appMenu`，侧边栏自动渲染，新增页面只改这一处。
- 所有请求必须经过 `src/api/endpoints.ts`，页面不直接调用 `fetch`。
