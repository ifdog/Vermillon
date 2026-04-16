# Vermillon — 设计文档

> 本文档记录 Vermillon 项目的完整设计规范与开发约定，用于在多 session 间保持连续性。

---

## 1. 项目定位

**Vermillon** 是一个单用户的个人内容发布平台，基于时间流进行文章管理与展示，兼具前台浏览与后台管理功能。

- **核心体验**：时间流（Timeline）+ 日历索引 + Markdown 原生支持
- **风格定位**：淡黄色纸质风格 + Vermillon 暖橘强调色 + 悬浮土星品牌符号
- **权限模型**：读者无需登录即可浏览；写/删/上传/后台管理需通过 `/login` 页进行用户名/密码 Session 认证

---

## 2. 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 后端 | Python 3.13 + Flask 3.0.3 | REST API，Session 认证 |
| 数据库 | SQLite | 单文件 `vermillon.db` |
| 前端 | 原生 JS + HTML5 + CSS3 | 无构建工具 |
| CSS 主题 | Bootswatch Lumen + 自定义覆盖 | 纸质暖黄风格 |
| 代码高亮 | Prism.js (CDN) | Tomorrow 主题，带复制按钮 |
| 图表渲染 | Mermaid.js (CDN) | ` ```mermaid ` 自动渲染 SVG |
| 密码加密 | Flask-Bcrypt | 默认管理员密码 bcrypt 哈希存储 |

---

## 3. 目录结构

```
Vermillon/
├── api/                    # Flask Blueprints
│   ├── __init__.py
│   ├── auth.py             # Session 登录、登出、修改密码/用户名
│   ├── memos.py            # Memo CRUD + 标签解析
│   ├── tags.py             # 标签列表
│   ├── search.py           # 全文搜索
│   ├── calendar.py         # 日历数据（含每日 Memo 数量及列表）
│   ├── upload.py           # 文件上传
│   ├── stats.py            # 访问统计与日志
│   └── settings.py         # 站点设置（如站点标题）
├── static/                 # 前端静态资源
│   ├── css/style.css       # 核心主题样式（必须阅读）
│   ├── js/
│   │   ├── common.js       # apiFetch、时间格式化
│   │   ├── app.js          # 首页逻辑（Timeline、日历、标签、搜索）
│   │   ├── write.js        # 编辑/新建页逻辑
│   │   └── admin.js        # 管理后台逻辑
│   ├── uploads/            # 附件存储（.gitkeep 保留目录）
│   ├── saturn.png          # 品牌悬浮图标
│   ├── index.html          # 首页
│   ├── write.html          # 编辑/新建页
│   ├── admin.html          # 管理后台
│   └── login.html          # 登录页
├── app.py                  # Flask 入口
├── config.py               # UPLOAD_FOLDER、SECRET_KEY、PAGE_SIZE 等
├── db.py                   # SQLite 初始化
├── utils.py                # extract_title、parse_tags、require_admin
├── requirements.txt
├── PRD.md                  # 产品需求文档
├── DESIGN.md               # 本文件
└── README.md               # 项目说明（含首页截图）
```

---

## 4. 视觉设计系统

### 4.1 配色（核心变量）

所有颜色通过 CSS 变量集中管理，见 `static/css/style.css` 的 `:root`：

| 变量名 | 色值 | 用途 |
|--------|------|------|
| `--bs-body-bg` | `#f3ecd0` | 页面主背景（淡黄色纸张） |
| `--bs-body-color` | `#3d3b36` | 主文字（暖炭灰） |
| `--bs-primary` | `#E5A07A` | 强调色（暖橘/陶土色）：按钮、链接、徽章 |
| `--bs-border-color` | `#e5e1d8` | 边框、分割线 |
| `--paper-surface` | `#fff9e6` | 卡片、输入框、日历格子的半透明暖白 |
| `--paper-primary-hover` | `#C98A65` | 按钮 hover 状态 |

**关键原则**：
- 不使用 Bootstrap 默认的蓝色/绿色，全部覆盖为暖色调
- 卡片/日历/表格使用半透明的暖黄色，避免与背景形成刺眼反差
- 代码块保留 Prism `Tomorrow` 暗色主题，形成舒适的阅读对比

### 4.2 导航栏（Navbar）

- **类名**：`.vermillon-navbar`
- **背景**：`var(--paper-primary)` 暖橘色
- **行为**：不固定（已去掉 `sticky-top`），随页面正常滚动
- **布局**：
  - 左侧：`Vermillon` 品牌标题
  - 正中：`.saturn-wrap` 包裹的 `saturn.png`，通过 `absolute + translate` 实现视觉居中，并悬浮在 banner 与正文交界处
  - 右侧：功能按钮（搜索框 + 管理/发布按钮）
- **土星动画**：仅垂直上下浮动（`translateY(±20px)`），周期 15s，`ease-in-out`，无旋转，图标高度 64px

### 4.3 卡片（Cards）

- **类名**：`.paper-card`
- 背景：`rgba(255, 249, 230, 0.55)`（半透明暖白）
- 头部：`.paper-card-header`，背景 `rgba(237, 230, 200, 0.7)`

### 4.4 按钮

- **主按钮**：`.btn-paper` → 暖橘背景 + 白色文字
- **线框按钮**：`.btn-paper-outline` → 暖橘边框 + 暖橘文字，hover 后反白

### 4.5 日历

- 使用 Bootstrap `table` 渲染
- 普通日期格子：`rgba(255, 249, 230, 0.35)`
- 有 Memo 的格子：`.has-memo` → `rgba(237, 230, 200, 0.9)`，显示数量 badge
- 选中态：`.selected` → `inset box-shadow` 用主色勾勒

### 4.6 Tag Badge

- **类名**：`.paper-tag`
- 背景：`rgba(237, 230, 200, 0.85)`
- 边框：`var(--paper-border)`
- 不再使用 Bootstrap 默认的 `bg-secondary`（蓝灰色已完全替换）

---

## 5. 页面结构与交互

### 5.1 首页 `/`

**布局**：左侧 `col-lg-3`（日历 + 当日文档 + 标签），右侧 `col-lg-9`（Timeline）

**Timeline 卡片渲染逻辑**（`app.js`）：
1. Markdown 解析（`marked.parse`）
2. **移除纯 tag 段落**（避免正文 tag 与底部 badge 重复）
3. Mermaid 图表渲染
4. Prism 代码高亮
5. 代码块右上角添加「复制」按钮

**日历交互**：
- 点击日期 → 右侧过滤到该日期 + 下方「当日文档」列表更新
- 点击当日文档列表中的标题 → 进入单篇文章查看模式（`selectedMemoId`）

**标签交互**：
- 点击标签 badge → Timeline 过滤显示该标签

**搜索**：
- 顶部搜索框回车触发 `/api/search?q=xxx`

**访问统计**：
- 每次访问 `/` 时，后端自动记录 `visits` 日志（IP、User-Agent、时间），并累加 `total_visits`、`index_visits`、`today_visits` 计数器

### 5.2 编辑页 `/write` 与 `/edit/<id>`

**布局**：`col-md-6` 左右分栏，左编辑右预览

**流程**：
1. 输入 Markdown 内容
2. 拖拽/点击上传附件，上传后自动在光标处插入 `![name](url)` 或 `[name](url)`
3. 实时预览同步执行与首页卡片相同的后处理（去 tag 段落、Mermaid、Prism）
4. 点击「发布」→ `POST/PUT /api/memos`，成功后跳转首页

### 5.3 管理后台 `/admin`

**权限**：所有管理 API 受 `@require_admin` 保护，校验 Flask Session 中的 `user_id`。未登录时前端会重定向到 `/login?redirect=/admin`

**布局**：两栏布局
- **左侧边栏**：导航菜单（文章管理、网站管理、用户管理、数值管理）
- **右侧面板**：根据左侧选中项动态渲染对应功能卡片

**功能模块**：

| 菜单 | 功能 |
|------|------|
| 文章管理 | Memo 列表表格、分页（每页 15 条）、编辑、删除 |
| 网站管理 | 修改站点标题（`site_title`），保存后即时生效 |
| 用户管理 | 修改用户名、修改密码（均需校验当前密码） |
| 数值管理 | 展示总访问量、首页访问量、今日访问量、Memo/Tag 总数；分页浏览日志（每页 20 条） |

### 5.4 登录页 `/login`

- 居中卡片，输入用户名与密码
- 调用 `POST /api/auth/login`，通过后后端写入 Flask Session，前端跳转目标页面
- `common.js` 的 `apiFetch` 携带 `credentials: 'same-origin'` 以保持 Session Cookie

---

## 6. 数据模型

```sql
CREATE TABLE memos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,      -- Markdown 原文
    title TEXT,                 -- 自动提取（# 标题 或 前20字）
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL   -- 支持嵌套如 work/frontend
);

CREATE TABLE memo_tags (
    memo_id INTEGER,
    tag_id INTEGER,
    FOREIGN KEY (memo_id) REFERENCES memos(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (memo_id, tag_id)
);

CREATE TABLE attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    memo_id INTEGER,
    filename TEXT NOT NULL,     -- uuid.ext
    original_name TEXT,
    mime_type TEXT,
    size INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (memo_id) REFERENCES memos(id) ON DELETE CASCADE
);

-- 站点设置 key-value
CREATE TABLE site_settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- 统计数据（如 total_visits, index_visits, today_visits）
CREATE TABLE stats (
    key TEXT PRIMARY KEY,
    value INTEGER DEFAULT 0,
    date TEXT
);

-- 访问日志
CREATE TABLE visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT,
    ip TEXT,
    user_agent TEXT,
    visited_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 单用户表（初始化时自动插入默认管理员 admin/admin）
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**标题提取规则**（`utils.py`）：
1. 检测 `# 标题` 或 `## 标题` → 提取为 title
2. 否则取正文前 20 字符，超出补 `...`
3. 空内容则显示 `(无标题)`

**标签提取规则**：正则 `#[\w\u4e00-\u9fa5_/]+`

---

## 7. API 列表

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/memos?page=&date=&tag=&pageSize=` | Memo 列表 |
| POST | `/api/memos` | 新建（需登录 Session） |
| GET | `/api/memos/<id>` | 单条读取 |
| PUT | `/api/memos/<id>` | 更新（需登录 Session） |
| DELETE | `/api/memos/<id>` | 删除（需登录 Session） |
| GET | `/api/tags` | 所有标签及数量 |
| GET | `/api/search?q=` | 全文搜索 |
| GET | `/api/calendar/<year>/<month>` | 日历数据 |
| POST | `/api/upload` | 上传附件（需登录 Session） |
| POST | `/api/auth/login` | 用户名密码登录，写入 Session |
| POST | `/api/auth/logout` | 登出，清除 Session |
| POST | `/api/auth/change-password` | 修改密码（需登录） |
| POST | `/api/auth/change-username` | 修改用户名（需登录） |
| GET | `/api/stats` | 统计数据（需登录） |
| GET | `/api/stats/visits?page=` | 访问日志分页（需登录） |
| GET | `/api/settings` | 读取站点设置 |
| POST | `/api/settings` | 更新站点设置（需登录） |
| GET | `/uploads/<filename>` | 附件直链 |

---

## 8. 关键约定与注意事项

### 8.1 Session 认证机制
- 登录成功后后端写入 Flask Session Cookie
- `common.js` 的 `apiFetch` 使用 `credentials: 'same-origin'` 自动携带 Cookie
- 后台 API 通过 `@require_admin` 装饰器检查 `session['user_id']`
- 默认管理员账号：`admin` / `admin`（首次启动自动创建，密码经 bcrypt 哈希存储）

### 8.2 纯 Tag 段落隐藏
- 首页和编辑预览都会执行相同逻辑：
  ```js
  node.querySelectorAll('p').forEach(p => {
      const text = p.textContent.trim();
      if (text && text.split(/\s+/).every(t => t.startsWith('#'))) p.remove();
  });
  ```
- 这只是视觉隐藏，不影响数据库中的 `content` 原文

### 8.3 文件上传
- 文件存 `static/uploads/`（本地）或环境变量 `UPLOAD_FOLDER` 指定路径（Docker）
- 数据库只存相对路径 `/uploads/<filename>`
- `.gitignore` 已排除实际上传文件，但保留 `static/uploads/.gitkeep`

### 8.4 土星图标
- 文件路径：`static/saturn.png`
- CSS 类：`.saturn-wrap`（绝对定位居中）+ `.saturn-float`（上下浮动动画）
- 动画仅垂直浮动（`translateY`），无旋转、无水平位移，高度 `64px`
- 若需替换图标，直接覆盖同名文件即可

### 8.5 数据库文件
- 名称：默认 `vermillon.db`，可通过环境变量 `DATABASE_URL` 自定义
- 已被 `.gitignore` 排除，不会进入版本控制
- 生产部署时首次运行会自动建表

---

## 9. 启动方式

### 本地开发

```bash
cd Vermillon
pip install -r requirements.txt
python app.py
```

访问 `http://localhost:5000`

### Docker Compose 部署

```bash
cd Vermillon
docker-compose up -d
```

- SQLite 数据库和上传文件通过 `./data` 卷持久化
- 可通过环境变量 `DATABASE_URL` 和 `UPLOAD_FOLDER` 自定义数据路径（已在 `config.py` 中读取）
- 建议同时通过环境变量设置强密钥 `SECRET_KEY`

---

## 10. 后续开发建议

- **保留无构建工具特性**：继续用原生 JS + CDN，不引入 Webpack/Vite
- **颜色修改必看 `style.css` 的 `:root`**：集中管理，不要零散覆盖
- **新增页面需同步 4 处导航栏**：`index.html`、`write.html`、`admin.html`、`login.html`
- **数据库变更**：若新增字段，需在 `db.py` 和对应 API 中同步，必要时写 `ALTER TABLE` 迁移脚本

---

**文档版本**：v1.1  
**最后更新**：2026-04-14
