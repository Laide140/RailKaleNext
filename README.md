# 铁路万花筒 · RailKale: Next

一款综合铁路信息查询 App，界面采用 iOS 风格设计。基于 **uni-app（Vue 2）** 开发，一套代码可编译到 **Android App、iOS App、H5 与微信小程序**。

> 目前主要发布安卓版，尚未上架应用商店，需通过官网下载 APK 安装。

- 官网：<https://next.laide.net.cn>（APK 下载与项目介绍）
- 仓库：<https://github.com/Laide140/RailKaleNext>

<a href="https://www.star-history.com/?repos=laide140%2Frailkalenext&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=laide140/railkalenext&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=laide140/railkalenext&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=laide140/railkalenext&type=date&legend=top-left" />
 </picture>
</a>

---

## 目录

- [功能一览](#功能一览)
- [编译运行](#编译运行)
- [可以改什么](#可以改什么)
  - [API 源切换](#1-api-源切换)
  - [接口密钥](#2-接口密钥)
  - [首页布局与自定义卡片](#3-首页布局与自定义卡片)
  - [主题色](#4-主题色)
  - [功能与分区配置](#5-功能与分区配置)
  - [品牌名 / 图标](#6-品牌名--图标)
- [目录结构](#目录结构)
- [API 端点说明](#api-端点说明)
- [已知问题](#已知问题)
- [数据来源](#数据来源)
- [免责声明](#免责声明)

---

## 功能一览

功能按三个分区组织，可在首页以「分区卡片 / 宫格 / 自定义」三种布局展示。

### 出行服务

| 功能 | 说明 |
| --- | --- |
| **车次查询** | 输入出发/到达站中文名查询车次列表，下方展示各席别余票（仅显示有票的席别） |
| **时刻表** | 查看车次全部停靠站与到发时刻 |
| **实时位置** | 展示列车当前位置，2 秒自动刷新，附车组担当号 |
| **定位测速** | 基于高德地图的实时速度与移动轨迹，路径与小圆点由 canvas 自绘 |

### 车站服务

| 功能 | 说明 |
| --- | --- |
| **车站大屏** | 车站电子大屏样式的到发信息（车次、状态、检票口） |
| **检票口** | 查询检票口与站台信息（自有接口 + 12306 官方接口） |
| **交通查询** | 车站周边地铁、公交、出租车、停车场接驳信息 |
| **车站代码** | 全国车站电报代码 / 拼音 / 缩写查询 |
| **站台规模** | 查询车站的站台数与到发线路数 |

### 实用工具

| 功能 | 说明 |
| --- | --- |
| **运用担当** | 按车次查车组、按车组查担当记录 |
| **路网地图** | 全国铁路线路图（红色铁路、蓝色地铁、虚线隧道），首次需下载约 169MB 缓存 |
| **纪念车票** | 生成纪念车票图片并保存到相册 |
| **列车广播** | 文本转语音，模拟车站/列车广播（支持讯飞、百度双音源，含预设广播语） |

---

## 编译运行

本项目使用 **HBuilderX**（uni-app 官方 IDE）编译，项目已包含 `manifest.json` / `pages.json`，无需 `npm install`。

### 方式一：HBuilderX 图形界面（推荐）

1. 下载 [HBuilderX](https://www.dcloud.io/hbuilderx.html)「App 开发版」。
2. 菜单「文件 → 导入 → 从本地目录导入」，选择本项目根目录。
3. 运行：
   - **H5**：菜单「运行 → 运行到浏览器 → Chrome」
   - **App**：菜单「运行 → 运行到手机或模拟器」（需手机开启 USB 调试）
   - **微信小程序**：菜单「运行 → 运行到小程序模拟器 → 微信开发者工具」
4. 发行：
   - **App**：菜单「发行 → 原生 App-云打包」，生成 APK / IPA
   - **H5**：菜单「发行 → 网站-H5 手机版」

### 方式二：CLI（可选）

若已配置 uni-app CLI 环境：

```bash
# H5 开发
npm run dev:h5

# 微信小程序
npm run dev:mp-weixin
```

> 注意：本项目是 **HBuilderX 工程**（没有 `src/` 目录，`pages.json` 在根目录），CLI 运行需要自行转换工程结构，一般直接用 HBuilderX 更省事。

### 平台注意事项

| 平台 | 说明 |
| --- | --- |
| **H5** | 功能最完整。定位测速、路网地图依赖浏览器 `document` / 高德 JS API，仅此端可用 |
| **App** | 主发布端。`manifest.json` 已配置 `appid: __UNI__EEC2081`，云打包前请改用**你自己的 appid** |
| **微信小程序** | 需在 `manifest.json` 的 `mp-weixin.appid` 填入自己的小程序 AppID |

---

## 可以改什么

### 1. API 源切换

App 支持三套数据源，在 **「我的 → 设置 → API 源」** 切换（默认「新」）：

| 源 | BaseURL | 说明 |
| --- | --- | --- |
| **新**（推荐，默认） | `https://next.laide.net.cn/api` | 速度最快，覆盖全部端点 |
| **旧** | `https://rail.laide.asia/api` | 兼容旧接口，速度较慢 |
| **RailGo**（友商） | `https://rg-api.zenglingkun.cn/api/v2` | 仅支持部分端点 |

选择 RailGo 时会提示：

> 部分功能不支持 RailGo API，将使用新 API 作为备选数据源

RailGo 仅支持 `getStationBigScreen`（车站大屏）、`getExit`（检票口）、`mapLine`（线路图）；其余端点会自动回退到「新」源。回退逻辑集中在 `service/api.js`：

```js
// service/api.js
const NEXT_BASE   = 'https://next.laide.net.cn/api'
const OLD_BASE    = 'https://rail.laide.asia/api'
const RAILGO_BASE = 'https://rg-api.zenglingkun.cn/api/v2'

// 想新增 RailGo 支持的端点，把端点名加进这个数组
const RAILGO_SUPPORTED = ['getStationBigScreen', 'getExit', 'mapLine']
```

> **补充**：新/旧源的 v2 风格端点需要**尾部斜杠**（如 `/getStationArea/`），RailGo 则**不能带**斜杠。该差异已在 `endpointUrl()` 中处理，新增端点时注意归类。

### 2. 接口密钥

密钥分三层，**优先级：设置页覆盖值 > `common/config.js` > `common/keys.js` 内建默认值**。

**方式 A：改本地配置文件（推荐，编译期生效）**

编辑 `common/config.js`：

```js
export default {
  keys: {
    amap:     '你的高德 Web服务 Key',   // 静态地图、定位
    amap_js:  '你的高德 JS API Key',   // 路网地图（网页端）
    amap_sec: '你的高德 JS 安全密钥'
  }
}
```

**方式 B：运行时覆盖（无需重新编译）**

在 **「我的 → 设置 → 接口密钥」** 中，把某一项切换为「自定义填写密钥」并粘贴。覆盖值存于本地存储，清除 App 数据即失效。

涉及密钥共 3 项，定义在 `common/keys.js` 的 `KEY_DEFS`。若要新增密钥项，改 `KEY_DEFS` 和 `BUILTIN_DEFAULTS` 即可。

### 3. 首页布局与自定义卡片

**「我的 → 设置 → 首页布局」** 可切换三种模式：

| 模式 | 说明 |
| --- | --- |
| `分区卡片` | 大图卡片形式，展示三个分区 |
| `宫格` | 按分区分组的图标网格 |
| `自定义` | 完全由你搭建的卡片（见下） |

**自定义卡片编辑器**（「设置 → 我的卡片 → 管理」）：

- 新建 / 删除 / 重命名卡片
- **拖拽**功能图标到卡片，或用**点选**方式添加
- 从**相册**选择卡片背景图（App 端会持久化保存）
- 每张卡片可设置独立主题色

卡片数据结构（存于本地存储 `app_settings.customCards`）：

```js
{
  id: 'card_xxx',
  title: '我的卡片',
  color: '#007aff',
  bgImage: '',                             // 可为空
  features: ['train-query', 'timetable']   // 功能 id 列表
}
```

### 4. 主题色

**「我的 → 设置 → 主题色」** 提供 10 个预设色 + 自定义调色器（色相 / 饱和 / 亮度滑块 + hex 输入），全 App 实时生效。

主题色通过 CSS 变量 `--blue` 应用到全局，由 `common/settings.js` 的 `applyTheme()` 写入。

### 5. 功能与分区配置

**所有首页功能与分区都集中在 `common/features.js`**，首页宫格、分区详情页、自定义卡片托盘都从这里取数据：

```js
// 新增一个功能入口
export const FEATURES = [
  { id: 'speed-test', icon: 'fa-gauge-high', label: '定位测速',
    path: 'speed-test', color: '#ff9500', group: 'travel' },
  // ...
]

// 把功能挂到某个分区
export const SECTIONS = [
  {
    id: 'travel', title: '出行服务', subtitle: '...',
    icon: 'fa-train', badgeColor: '#007aff',
    bgImage: '../../static/section-travel.jpg',
    features: ['train-query', 'timetable', 'train-locate', 'speed-test'],
  },
  // ...
]
```

新增功能页面时需同步做三件事：

1. 新建 `pages/xxx/xxx.vue`
2. 在 `pages.json` 的 `pages` 数组注册路由
3. 在 `common/features.js` 增加 `FEATURES` 条目，并加入某分区的 `features`

> 图标使用 **Font Awesome 5**（类名如 `fa-train`），已内置在 `static/fontawesome/`。

### 6. 品牌名 / 图标

| 内容 | 位置 |
| --- | --- |
| 中文名 | `package.json` 的 `name`、`pages.json` 的 `navigationBarTitleText` |
| 英文名 | `package.json` 的 `displayName` / `englishName`、`manifest.json` 的 `name` |
| 版本号 | `package.json` 的 `version`、`manifest.json` 的 `versionName` / `versionCode` |
| App 打包图标 | `unpackage/res/icons/*.png`（在 HBuilderX「manifest 可视化配置 → App 图标」中替换） |
| 页面内 logo | `pages/mine/mine.vue`（头像）、`pages/home/home.vue` 与 `pages/section-detail/section-detail.vue`（页脚） |

---

## 目录结构

```
├── pages/                        # 页面
│   ├── home/                     # 首页（三种布局模式）
│   ├── train-query/              # 车次查询（含余票）
│   ├── timetable/                # 时刻表
│   ├── train-locate/             # 实时位置
│   ├── speed-test/               # 定位测速（高德地图 + canvas 轨迹）
│   ├── station-screen/           # 车站大屏
│   ├── ticket-gate/              # 检票口
│   ├── traffic-query/            # 交通查询
│   ├── station-code/             # 车站代码
│   ├── station-area/             # 站台规模
│   ├── emu-query/                # 运用担当
│   ├── rail-network-map/         # 路网地图（web-view + 高德）
│   ├── souvenir-ticket/          # 纪念车票
│   ├── train-broadcast/          # 列车广播
│   ├── section-detail/           # 分区详情
│   ├── settings/                 # 设置
│   ├── custom-editor/            # 自定义卡片编辑器
│   └── mine/                     # 我的
├── common/                       # 公共模块
│   ├── config.js                 # ★ 本地配置（密钥）
│   ├── keys.js                   # 密钥解析与优先级
│   ├── settings.js               # 设置读写 / 主题色 / API 源
│   ├── features.js               # ★ 功能与分区数据源
│   ├── station.js                # 车站电报码 ↔ 中文名互转（带缓存）
│   └── color.js                  # 颜色工具（HSL ↔ HEX）
├── service/
│   └── api.js                    # ★ API 服务层（多数据源 + 回退）
├── store/
│   └── index.js                  # Vuex 状态（settings）
├── components/
│   └── custom-tabbar/            # 自定义底栏组件（当前未启用，原生 TabBar 生效）
├── static/                       # 静态资源
│   ├── fontawesome/              # Font Awesome 5
│   ├── railway-map.html          # 路网地图页面（web-view 加载）
│   └── section-*.jpg             # 首页分区背景图（需自行放置，见「已知问题」）
├── App.vue                       # 应用入口（全局样式与主题）
├── main.js                       # 入口文件（Vuex、全局 mixin）
├── pages.json                    # ★ 路由与 TabBar 配置
└── manifest.json                 # ★ App 配置（appid、版本、平台参数）
```

★ = 常用修改点

---

## API 端点说明

全部封装在 `service/api.js`，按功能列出：

| 函数 | 端点 | 用途 | RailGo 支持 |
| --- | --- | --- | :---: |
| `getStationCode()` | `/getStationCode/index.php` | 车站代码表 | ✗ |
| `getTrains(from, to, date)` | `/getTrains` | 车次查询 | ✗ |
| `getLeftTickets(from, to, date)` | `/getLeftTicket` | 余票查询 | ✗ |
| `getTrainTimeTable(train, date)` | `/getTrainTimeTable/index.php` | 时刻表 | ✗ |
| `getTrainLocate(train)` | `/getTrainLocate/index.php` | 列车实时位置 | ✗ |
| `getStationArea(station)` | `/getStationArea/` | 站台规模 | ✗ |
| `getStationBigScreen(telecode)` | `/getStationBigScreen` | 车站大屏 | ✓ |
| `getExit(trainNum, telecode)` | `/getExit` | 检票口 / 站台 | ✓ |
| `getMapLine(train)` | `/mapLine` | 线路图坐标 | ✓ |
| `getLineTrains(stations)` | `/getLineTrains/` | 按车站查上线车次 | ✗ |
| `getStationInfo(code)` | `/getStationInfo/` | 车站交通接驳 | ✗ |
| `getTicket(params)` | `/getTicket` | 生成纪念车票图 | ✗ |
| `getRailwayIndex()` | `/getTrainTimeTable/railway/index.php` | 路网 GeoJSON 索引 | ✗ |
| `getRailwayGeoJSON(file)` | `/getTrainTimeTable/railway/{file}` | 路网 GeoJSON 数据 | ✗ |
| `getTrainBroadcastUrl(text)` | `/getXiaoYanTTS/` | 讯飞语音合成 | ✗ |
| `queryTicketCheck(...)` | `www.12306.cn/...` | 12306 官方检票口 | — |

其他外部数据源：

- `https://api.rail.re` — 动车组配属、交路查询（运用担当页）
- `https://restapi.amap.com/v3/staticmap` — 高德静态地图
- `https://fanyi.baidu.com/gettts` — 百度语音合成

**新增一个 API 端点**的标准写法：

```js
// service/api.js
export function getSomething(param) {
  return requestEndpoint('getSomething', { param })   // 自动解析 base + 回退
}
```

---

## 已知问题

以下为当前已知但尚未处理的问题：

1. **首页分区背景图缺失**
   `common/features.js` 引用了 `static/section-travel.jpg`、`section-station.jpg`、`section-tracking.jpg`，但 `static/` 下**没有这三张图**，因此分区卡片只显示主题色兜底。
   修复方式：把图片放入 `static/` 并保持同名即可（推荐 16:9、≥1200×675）。

2. **底栏组件未启用**
   `pages.json` 中 `tabBar.custom = true`，但实际由**原生 TabBar** 正常工作；`components/custom-tabbar/` 为历史遗留组件（在 `main.js` 中全局注册但未被任何页面使用）。
   若要启用自定义底栏，需在三个 tab 页手动引入 `<custom-tabbar />` 并自行处理底部留白 —— **否则会出现双底栏**。

3. **搜索历史 / 收藏未持久化**
   `store/index.js` 中的 `searchHistory`、`favoriteTrains` 没有写入本地存储，且当前无页面使用。

4. **定位测速仅 H5 可用**
   该页依赖浏览器 `navigator.geolocation` 与高德 JS API（`document`），App / 小程序端无法使用。

5. **路网地图首次加载较慢**
   需下载约 169MB GeoJSON 数据并缓存（缓存 key 为 `cache_<省份代码>`）。建议在 WiFi 下首次加载。

---

## 数据来源

- **API 源（可切换）**：见 [API 源切换](#1-api-源切换)
- **动车组配属 / 交路**：<https://api.rail.re>
- **地图服务**：高德地图
- **检票口官方数据**：中国铁路 12306

> 数据可能存在延迟或误差，请以 **铁路12306 官方**为准。

---

## 免责声明

仅供个人学习参考使用，完全免费。
