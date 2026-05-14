# Alchemist's Lab — Agent 开发指南

> 本文档面向 AI Agent，描述项目的完整架构、设计规范与开发约束。
> 阅读本文档后，Agent 应能完全理解项目并保持一致风格进行后续开发。

---

## 1. 项目概览

| 属性 | 值 |
|------|-----|
| **项目名称** | Alchemist's Lab（炼金术士实验室） |
| **定位** | 个人博客 + 游戏集合的纯前端静态站点 |
| **部署** | Vercel |
| **域名/仓库** | 见 Vercel 配置 / GitHub |
| **版本号** | 见 `version.js` 顶部 `BUILD_TIME` 常量，格式 `YYYY.MM.DD.HHmm` |

---

## 2. 技术栈

| 技术 | 用途 |
|------|------|
| **HTML5** | 页面结构 |
| **CSS3** | 样式、动画、响应式布局 |
| **Vanilla JavaScript (ES6+)** | 全部交互逻辑 |
| **Canvas 2D API** | 粒子背景、游戏渲染 |
| **localStorage** | 游戏最高分持久化 |
| **IntersectionObserver** | 滚动渐入动画、数字递增动画 |
| **Vercel** | 部署平台（零配置静态托管） |

**关键原则：零外部依赖、零框架、零图片资源。**

---

## 3. 项目文件结构

```
alchemist-lab/
├── index.html          # 博客主页
├── games.html          # 游戏厅页面
├── styles.css          # 全局样式表
├── script.js           # 主页交互脚本
├── games.js            # 游戏厅交互脚本
├── games/
│   ├── snake.js        # 贪吃蛇游戏模块
│   └── tetris.js       # 俄罗斯方块游戏模块
├── play-snake.html     # 贪吃蛇独立游戏页
├── play-tetris.html    # 俄罗斯方块独立游戏页
├── version.js          # 版本号标识
├── vercel.json         # Vercel 部署配置
├── .gitignore
└── AGENT_GUIDE.md      # 本文档
```

### 3.1 文件职责边界

| 文件 | 应包含 | 不应包含 |
|------|--------|----------|
| `*.html` | 页面结构、内联 style（页面专用样式）、内联 script（页面初始化逻辑） | 全局样式、可复用的业务逻辑 |
| `styles.css` | CSS 变量、全局样式、所有页面的共享样式 | 页面级内联样式（应放在各自 HTML 中） |
| `script.js` | 粒子背景、导航滚动、移动端菜单、数字动画、博客渲染、滚动渐入、锚点高亮 | 页面特有的初始化逻辑（放在各自 HTML 内联 script） |
| `games/*.js` | 单个游戏的 Game 类，通过构造函数 + 回调与页面交互 | DOM 操作、UI 渲染外的页面控制逻辑 |
| `play-xxx.html` 内联 script | 游戏初始化、事件绑定 | 具体的游戏逻辑（应放在 `games/*.js`） |
| `version.js` | 版本号常量 + 自动注入徽章的 IIFE | 任何其他业务逻辑 |

---

## 4. 设计系统

### 4.1 色彩系统

所有颜色通过 CSS 变量定义：

| 变量 | 值 | 用途 |
|------|-----|------|
| `--bg-primary` | `#0a0a0f` | 主背景 - 极深黑紫 |
| `--bg-secondary` | `#12121a` | 次级背景 |
| `--bg-card` | `#181825` | 卡片背景 |
| `--text-primary` | `#e8e8f0` | 主文字 - 亮白灰 |
| `--text-secondary` | `#9090a8` | 次级文字 - 中灰紫 |
| `--text-muted` | `#606078` | 弱化文字 - 暗灰紫 |
| `--accent` | `#6c5ce7` | 主强调色 - 紫色 |
| `--accent-glow` | `rgba(108, 92, 231, 0.3)` | 紫色发光 |
| `--accent-secondary` | `#00cec9` | 次强调色 - 青色 |
| `--accent-warm` | `#fd79a8` | 暖色强调 - 粉色 |
| `--border` | `#1e1e30` | 边框色 |

**色彩使用规则：**
- 主按钮 / 链接：`--accent` 紫色
- 悬停 / 技术标签：`--accent-secondary` 青色
- 游戏相关 / 暖色点缀：`--accent-warm` 粉色
- 背景层叠：`--bg-primary` → `--bg-secondary` → `--bg-card`（由深到浅）
- 按钮不可用时：`disabled` + `opacity: 0.3`，不要改变色相
- **禁止使用纯黑色 (#000) 或纯白色 (#fff) 作为背景或文字**（极少数情况如 snake 眼睛除外）

### 4.2 字体系统

| 变量 | 值 |
|------|-----|
| `--font-sans` | `'Inter', -apple-system, BlinkMacSystemFont, sans-serif` |
| `--font-mono` | `'JetBrains Mono', 'Fira Code', monospace` |

- 正文字体：`--font-sans`
- 代码/统计/技术标签：`--font-mono`
- **禁止使用系统默认字体**

### 4.3 间距与圆角

| 变量 | 值 |
|------|-----|
| `--radius` | `12px` |
| `--radius-sm` | `8px` |
| `--transition` | `0.3s cubic-bezier(0.4, 0, 0.2, 1)` |

- 卡片内边距：24-28px
- 元素间距：遵循 4 的倍数（8 / 12 / 16 / 24 / 32 / 48）

### 4.4 阴影

| 变量 | 值 |
|------|-----|
| `--shadow` | `0 0 40px rgba(0, 0, 0, 0.5)` |

- 卡片 hover 时使用 `box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3)`
- 发光按钮：`box-shadow: 0 0 20px var(--accent-glow)`

---

## 5. 组件规范

### 5.1 按钮

使用 class `btn` 作为基础，附加 `primary` / `secondary` 变体：

```html
<button class="btn primary">主要按钮</button>
<button class="btn secondary">次要按钮</button>
```

- 圆角：`border-radius: 100px`（药丸形状）
- 内联 flex，支持图标 + 文字
- hover 时 `translateY(-2px)` + 增强阴影

### 5.2 卡片

- 背景：`--bg-card`
- 边框：`1px solid var(--border)`
- 圆角：`var(--radius)`
- hover：`translateY(-4px)` + 增强阴影
- 顶部装饰线（伪元素 `::before`）：hover 时从 0 展开到 100%（游戏卡片用粉色渐变，博客卡片用紫青渐变）

### 5.3 导航

- 固定顶部，滚动 50px 后添加 `scrolled` class
- `scrolled` 状态：`backdrop-filter: blur(20px)` + 半透明背景 + 底部边框
- 链接底部下划线：`::after` 伪元素，hover 时 `width: 100%`

### 5.4 游戏卡片

游戏卡片多了 `game-ready` 状态（已实现可玩的游戏）：
- 青色边框 + 青色渐变顶部线
- 标题右侧显示 `game-ready-badge`（脉冲动画徽章：「▶ 开玩」）

---

## 6. 游戏开发规范

### 6.1 游戏模块接口

所有游戏类必须实现以下方法：

| 方法 | 说明 |
|------|------|
| `constructor(canvasId, options)` | canvasId: Canvas 元素 id; options: `{ onScoreChange, onGameOver }` |
| `bindControls()` | 绑定键盘事件 |
| `unbindControls()` | 解绑键盘事件 |
| `start()` | 开始游戏 |
| `stop()` | 停止游戏循环 |
| `pause()` | 暂停 |
| `resume()` | 继续 |
| `togglePause()` | 切换暂停 |
| `destroy()` | 销毁（清理定时器、事件监听） |
| `reset()` | 重置状态 |

### 6.2 新增游戏步骤

1. 创建 `games/xxx.js`，实现 `XXXGame` 类（遵循 6.1 接口），底部注册到 `window.__GAMES`
2. 创建 `play-xxx.html` 独立游戏页面
3. 将 `games.js` 中的游戏数据 `status` 从 `coming-soon` 改为 `ready`
4. 更新 `version.js` 的 `BUILD_TIME`

### 6.3 游戏生命周期

```
start()
  → 初始化状态
  → 启动游戏循环
  → 循环中：更新状态 → 碰撞检测 → Canvas 渲染
  → 游戏结束 → 调用 onGameOver 回调
  → 用户点击"再来一局" → 调用 start() 重新开始

destroy()
  → 停止循环
  → 解绑键盘事件
  → 清理所有引用
```

### 6.4 Canvas 渲染风格

- 背景色：`#0d0d14`（比主背景略深）
- 网格线：极淡线条 `rgba(30, 30, 48, 0.3)`
- 方块：圆角矩形，带渐变色 + 高光/阴影（3D 立体感）
- 食物/道具：发光效果（`createRadialGradient`）
- 暂停遮罩：半透明黑色 + 居中文字
- Game Over 不在 Canvas 内渲染，通过 `onGameOver` 回调由页面展示 overlay

### 6.5 最高分持久化

使用 `localStorage`，key 命名规范：`{gameId}_high`
```js
localStorage.getItem('tetris_high')
localStorage.setItem('tetris_high', String(score))
```

---

## 7. 页面交互与动画

### 7.1 粒子背景

- 位于所有页面，`canvas#particles` 固定定位在最底层（z-index: 0）
- 粒子数量：根据屏幕大小动态计算，上限 80
- 颜色随机：紫色系或青色系
- 鼠标交互：200px 范围内的粒子受鼠标引力影响
- 粒子连线：间距 <150px 时画半透明连线

### 7.2 滚动动画

使用 `IntersectionObserver`：
- 元素进入视口时：`opacity: 0 → 1` + `translateY(30px → 0)`
- 过渡：`0.6s ease-out`
- 卡片类元素按索引叠加延迟：`index * 0.1s`

### 7.3 数字递增动画

- 目标元素：`data-target` 属性存储最终值
- 时长：2000ms，缓动：`easeOutCubic`
- 阈值：`threshold: 0.5`

### 7.4 版本号徽章

- 固定定位右下角，`z-index: 9999`
- 半透明背景 + blur，圆角药丸
- 格式：`⚡ v2026.05.14.2355`
- 由 `version.js` 自动注入，所有页面共享

---

## 8. 响应式设计

| 断点 | 变化 |
|------|------|
| **<= 768px** | 导航变汉堡菜单、about 变单列、统计间距缩小 |
| **<= 480px** | 游戏网格变单列、标题字号缩小 |

- 汉堡菜单：`menu-toggle` 按钮，点击切换 `nav-links` 的 `open` class
- 网格布局：`repeat(auto-fill, minmax(280px, 1fr))`
- 标题字号：`clamp(2.5rem, 6vw, 4.5rem)`
- 触屏方向键：`@media (pointer: coarse)` 检测后 `display: flex`

---

## 9. 命名规范

### 9.1 CSS Class

| 类型 | 命名 | 示例 |
|------|------|------|
| 组件 | 全小写中划线 | `.navbar` `.blog-card` |
| 状态 modifier | 后缀 | `.navbar.scrolled` `.game-card.game-ready` |
| JS 钩子 | `id` 或 `data-*` | `#gameCanvas` `data-game-id` |

### 9.2 JavaScript

| 类型 | 命名 | 示例 |
|------|------|------|
| 类 | PascalCase | `SnakeGame` / `TetrisGame` |
| 函数/变量 | camelCase | `startGame` `highScore` |
| 常量 | UPPER_SNAKE_CASE | `BUILD_TIME` |
| 私有（内部） | 下划线前缀 | `this._keyHandler` |

### 9.3 HTML id

- `camelCase`：`gameCanvas` `scoreDisplay` `startBtn` `gameOverOverlay`
- 唯一标识，不要重复

---

## 10. 开发约束

### 10.1 必须遵守的规则

1. **零外部依赖** — 禁止引入 npm 包、CDN 库（Google Fonts 除外）
2. **零图片资源** — 禁止使用 JPG/PNG/SVG/WebP，全部用 Canvas / CSS / Emoji
3. **纯 ES6+ Vanilla JS** — 禁止 TypeScript、JSX、Vue、React 等
4. **所有颜色必须使用 CSS 变量** — 禁止硬编码颜色值
5. **所有间距使用 4 的倍数**
6. **新游戏必须遵循 6.1 节的 Game Class 接口规范**
7. **游戏数据更新后同步更新 `games.js` 中的 `status` 字段**
8. **Game Over UI 不在 Canvas 内渲染** — 通过 `onGameOver` 回调由页面渲染 overlay
9. **新增游戏需创建独立 `play-xxx.html` 页面**，不要修改通用 `play.html`

### 10.2 版本管理规范

1. **每次对项目进行任何修改，都必须同步更新 `version.js` 中的 `BUILD_TIME` 常量**
2. 版本号格式：`YYYY.MM.DD.HHmm`（24 小时制，例如 `2026.05.14.2355`）
3. `BUILD_TIME` 使用修改时的实际时间，禁止使用占位符
4. 更新 `BUILD_TIME` 是每次提交的最后一步

### 10.3 新增文件的规范

- 新增游戏文件 → 放入 `games/` 目录
- 新增页面 → 直接放在根目录 `*.html`
- 新增样式 → 优先使用 `styles.css`，页面专用样式放在 HTML 的 `<style>` 中

---

## 11. 页面路由

| 路径 | 页面 | 说明 |
|------|------|------|
| `index.html` | 博客主页 | Hero / 关于 / 文章 / 项目 / 联系 |
| `games.html` | 游戏厅 | 游戏列表 + 分类筛选 |
| `play-snake.html` | 贪吃蛇 | 正方形 Canvas，无侧边栏 |
| `play-tetris.html` | 俄罗斯方块 | 竖屏 Canvas + NEXT预览 + INFO侧边栏 |

**导航关系：**
```
index.html → games.html → play-xxx.html
    ↑            │
    └────────────┘ (返回首页)
```

---

## 12. 部署

- 平台：Vercel
- 配置：`vercel.json`（`cleanUrls: true`）
- 每次 push 到 GitHub main 分支自动部署
- 纯静态文件，无需构建步骤

---

## 13. 当前状态（构建时）

| 功能 | 状态 |
|------|------|
| 博客主页 | ✅ 完整可用 |
| 游戏厅 UI | ✅ 完整可用 |
| 贪吃蛇 | ✅ 已实现 |
| 俄罗斯方块 | ✅ 已实现 |
| 井字棋 | 📅 规划中 |
| 2048 | 📅 规划中 |
| 扫雷 | 📅 规划中 |
| Flappy Bird | 📅 规划中 |
| 乒乓球 | 📅 规划中 |
| 太空入侵者 | 📅 规划中 |
| 数独 | 📅 规划中 |

---

> **给 Agent 的最后提示：**
> 在开始任何新任务前，先阅读本文档，理解项目的设计哲学和约束。
> 保持风格一致比实现功能更重要 — 如果新功能看起来不像现有代码的一部分，请重新思考实现方式。
> 每次修改结束时，记得更新 `version.js` 中的 `BUILD_TIME`。