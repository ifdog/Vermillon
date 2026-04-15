# Vermillon - 产品需求文档 (PRD)

## 1. 产品定位

**一句话描述**：一个单用户的公开播客流（Personal Broadcast Stream），类似于个人的 Twitter / 轻量博客。

**核心体验**：
- 按时间倒序呈现短内容（Memo）。
- 左侧日历作为时间索引，可快速跳转到特定日期。
- 支持 Markdown、标签、图片附件。
- 无社交功能（关注/点赞/评论），但内容公开可读。

## 2. 用户与权限

- **单用户系统**：只有一个内容发布者（即站长/作者）。
- **无需注册登录**：面向读者的前端完全公开；后台管理通过一个简单密钥（或本地直接操作）保护写权限。
- **MVP 阶段**：管理写权限通过一个环境变量 `ADMIN_KEY` 实现，写入/编辑/删除接口需要携带该 Key。

## 3. 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 后端 | Python + Flask | 轻量 REST API |
| 数据库 | SQLite | 单文件，易于备份 |
| 前端 | 原生 JavaScript + HTML5 + CSS3 | 前后端分离，JS 直接调用 REST API 渲染页面 |
| 文件存储 | 本地文件系统 (`./uploads/`) | 数据库存储相对路径 |

## 4. 信息架构

### 4.1 页面结构

- **`/` (首页)**：左侧日历 + 右侧 Timeline（Memo 列表）。顶部有「新建」按钮。
- **`/write`**：独立编辑页面，用于新建 Memo。
- **`/edit/<id>`**：独立编辑页面，用于修改已有 Memo。

### 4.2 API 设计

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/memos` | 获取 Memo 列表（支持 `?date=YYYY-MM-DD` 和 `?tag=xxx` 筛选） |
| POST | `/api/memos` | 新建 Memo（需 `X-Admin-Key`） |
| GET | `/api/memos/<id>` | 获取单条 Memo |
| PUT | `/api/memos/<id>` | 更新 Memo（需 `X-Admin-Key`） |
| DELETE | `/api/memos/<id>` | 删除 Memo（需 `X-Admin-Key`） |
| GET | `/api/tags` | 获取所有标签及数量 |
| GET | `/api/search?q=xxx` | 全文搜索 |
| GET | `/api/calendar/<year>/<month>` | 获取指定月份日历数据（包含每日最新 Memo 标题） |
| POST | `/api/upload` | 上传图片/附件（需 `X-Admin-Key`） |
| GET | `/uploads/<filename>` | 静态文件服务，读取附件 |

### 4.3 数据库模型

```sql
-- memos 表
CREATE TABLE memos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,          -- Markdown 原始内容
    title TEXT,                     -- 自动提取或为空（用于日历显示）
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- tags 表
CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL       -- 如 "work", "work/frontend"
);

-- memo_tags 关联表
CREATE TABLE memo_tags (
    memo_id INTEGER,
    tag_id INTEGER,
    FOREIGN KEY (memo_id) REFERENCES memos(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (memo_id, tag_id)
);

-- attachments 表
CREATE TABLE attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    memo_id INTEGER,
    filename TEXT NOT NULL,         -- 存储文件名（uuid.ext）
    original_name TEXT,             -- 原始文件名
    mime_type TEXT,
    size INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (memo_id) REFERENCES memos(id) ON DELETE CASCADE
);
```

**标题提取规则**：
1. 如果用户手动在内容第一行写 `# 标题` 或 `## 标题`，提取为 `title`。
2. 否则提取正文前 20 个字符作为标题，超出以 `...` 结尾。
3. 标题仅用于日历展示和 SEO，不在 Timeline 中作为独立大标题显示（保持 Memos 的卡片感）。

## 5. 功能详细说明

### 5.1 Timeline（首页主区域）

- **排序**：严格按 `created_at` 倒序。
- **分页**：使用基于 `cursor` 的无限滚动（或简单 Offset 分页，MVP 可用 Offset）。
- **卡片内容**：
  - 顶部：相对时间（如 "2 hours ago"）+ 操作菜单（编辑 / 删除，需 Admin Key）
  - 中间：Markdown 渲染后的 HTML（支持代码高亮、表格、图片）
  - 底部：标签云（可点击筛选）、附件缩略图

### 5.2 日历侧边栏

- 位置：左侧固定栏。
- 功能：
  - 展示当前月份日历，可前后翻页。
  - **每个日期格子上，若当天有 Memo，显示当日最新一条 Memo 的标题**（最多一行，溢出隐藏）。
  - 点击日期：主区域仅展示该日期的 Memo。
  - 高亮当前选中的日期。
- 标题显示为空时：显示 "(无标题)" 占位。

### 5.3 标签系统

- **自动识别**：发布/编辑时，正则提取内容中的 `#标签名`（允许字母、数字、中文、下划线、斜杠 `/`）。
- **嵌套标签**：支持 `#work/frontend`、`#work/backend` 这样的层级写法。
- **标签页**：左侧日历下方展示所有标签列表，显示每个标签下的 Memo 数量。
- **点击标签**：Timeline 过滤显示该标签下的 Memo。

### 5.4 编辑页 (`/write` & `/edit/<id>`)

- **布局**：左侧编辑区（Markdown 原文），右侧实时预览区。
- **附件上传**：
  - 支持拖拽上传或点击上传。
  - 上传后自动在光标处插入 Markdown 图片语法 `![alt](url)` 或附件链接 `[file](url)`。
  - 支持多文件同时上传。
- **保存**：点击「发布」后，后端解析标签、提取标题、入库，成功后跳转回首页。

### 5.5 搜索

- 位置：顶部导航栏的搜索框。
- 功能：对 `memos.content` 做 LIKE 模糊匹配，返回相关 Memo 列表。

### 5.6 深色模式（P1）

- 使用 CSS 变量定义颜色，通过 `data-theme="dark"` 切换。
- 默认跟随系统偏好，可手动切换并存储到 `localStorage`。

## 6. UI/UX 规范

- **整体布局**：左侧窄栏（日历+标签，固定宽度 `280px`），右侧宽主区域（Timeline，自适应）。
- **字体**：正文 `16px`，标题 `18px`，使用系统默认无衬线字体栈。
- **卡片样式**：白色背景、轻微圆角 `8px`、细微阴影、上下间距 `16px`。
- **响应式**：
  - 桌面端：左右分栏。
  - 平板/移动端：左侧栏变为顶部可折叠抽屉，Timeline 全宽。

## 7. MVP 范围（第一期必做）

- [x] Flask 项目骨架 + SQLite 初始化
- [x] REST API（Memos CRUD、Tags、Search、Calendar、Upload）
- [x] 首页 Timeline（列表 + 分页）
- [x] 左侧日历（含标题显示、日期筛选）
- [x] 标签列表与筛选
- [x] 独立编辑页（新建 / 编辑 + 实时预览）
- [x] Markdown 渲染
- [x] 图片/附件上传与展示
- [x] 全文搜索
- [ ] 深色模式（可延后）
- [ ] 代码高亮（可延后，MVP 先保留 pre/code 样式）

## 8. 项目目录结构（建议）

```
memo2/
├── PRD.md
├── app.py                  # Flask 主入口
├── config.py               # 配置（ADMIN_KEY、UPLOAD_FOLDER 等）
├── requirements.txt
├── db.py                   # SQLite 连接与初始化
├── models/                 # 数据模型操作（可选，简单项目可直接放 db.py）
├── api/
│   ├── memos.py
│   ├── tags.py
│   ├── search.py
│   ├── calendar.py
│   └── upload.py
├── static/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── app.js          # 首页逻辑
│   │   ├── write.js        # 编辑页逻辑
│   │   └── common.js       # 公共工具（时间格式化、Markdown 解析等）
│   └── uploads/            # 附件存储目录
└── templates/
    ├── index.html
    └── write.html
```

## 9. 运行方式

```bash
# 安装依赖
pip install -r requirements.txt

# 启动（默认端口 5000）
python app.py
```

访问 `http://localhost:5000` 即可。

---

**文档版本**：v1.0  
**最后更新**：2026-04-14
