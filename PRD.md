# Vermillon - 产品需求文档 (PRD)

## 1. 产品定位

**一句话描述**：一个单用户的公开播客流（Personal Broadcast Stream），类似于个人的 Twitter / 轻量博客，但更具文学与时间的沉淀感。

**核心体验**：
- 按时间倒序呈现短内容（Memo）。
- 左侧日历作为时间索引，可快速跳转到特定日期，查看当日文档列表。
- 支持 Markdown、标签、图片附件、代码高亮、Mermaid 图表。
- 无社交功能（关注/点赞/评论），内容公开可读。

## 2. 用户与权限

- **单用户系统**：只有一个内容发布者。
- **读者无需注册登录**：前端完全公开。
- **写权限保护**：通过独立的 `/login` 页面校验 Admin Key，登录态保存在浏览器 `localStorage` 中。管理后台 `/admin` 和写操作 API 均需校验。

## 3. 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 后端 | Python + Flask | 轻量 REST API |
| 数据库 | SQLite | 单文件，易于备份 |
| 前端 | 原生 JavaScript + HTML5 + CSS3 | 前后端分离，无构建工具 |
| CSS 主题 | Bootswatch Lumen + 自定义纸质覆盖 | 淡黄色纸质风格 + Vermillon 朱砂红 |
| 代码高亮 | Prism.js (CDN) | 支持一键复制 |
| 图表渲染 | Mermaid.js (CDN) | Markdown 中 ` ```mermaid ` 自动渲染 |

## 4. 信息架构

### 4.1 页面结构

- **`/` (首页)**：左侧日历 + 当日文档列表 + 标签；右侧 Timeline（Memo 列表）。
- **`/write`**：新建 Memo，左编辑右预览，支持心情选择和拖拽上传。
- **`/edit/<id>`**：编辑已有 Memo。
- **`/admin`**：管理后台，表格形式增删改查所有文章。
- **`/login`**：独立登录页，校验 Admin Key。

### 4.2 API 设计

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/memos` | 获取 Memo 列表（支持 `?date=`、`?tag=`、`?pageSize=` 筛选） |
| POST | `/api/memos` | 新建 Memo（需 `X-Admin-Key`） |
| GET | `/api/memos/<id>` | 获取单条 Memo |
| PUT | `/api/memos/<id>` | 更新 Memo（需 `X-Admin-Key`） |
| DELETE | `/api/memos/<id>` | 删除 Memo（需 `X-Admin-Key`） |
| GET | `/api/tags` | 获取所有标签及数量 |
| GET | `/api/search?q=xxx` | 全文搜索 |
| GET | `/api/calendar/<year>/<month>` | 获取指定月份日历数据（含每日 Memo 数量及列表） |
| POST | `/api/upload` | 上传图片/附件（需 `X-Admin-Key`） |
| POST | `/api/auth` | 校验 Admin Key |
| GET | `/uploads/<filename>` | 静态文件服务，读取附件 |

### 4.3 数据库模型

```sql
CREATE TABLE memos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    title TEXT,
    mood TEXT,                    -- emoji 心情标记
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
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
    filename TEXT NOT NULL,
    original_name TEXT,
    mime_type TEXT,
    size INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (memo_id) REFERENCES memos(id) ON DELETE CASCADE
);
```

## 5. 功能详细说明

### 5.1 Timeline
- 严格按时间倒序排列。
- 卡片显示：心情 emoji、相对时间、Markdown 内容、标签 badge、附件缩略图。
- 支持分页加载。
- 正文中的纯标签段落会在渲染后自动隐藏，避免与底部 badge 重复。

### 5.2 日历侧边栏
- 日历格子上显示当日 Memo 数量（badge）。
- 点击日期：右侧 Timeline 过滤到该日期。
- 下方「当日文档」列表同步更新，显示当天所有文章标题，点击标题可进入单篇查看模式。

### 5.3 标签系统
- 自动识别 `#标签名`（支持字母、数字、中文、下划线、斜杠 `/`）。
- 支持嵌套标签如 `#work/frontend`。
- 标签云在左侧展示，点击可筛选 Timeline。

### 5.4 编辑页
- 左右分栏：左侧 Markdown 原文，右侧实时预览。
- 心情选择器：可选 emoji（😊 😐 😔 🤔 🎉 ☕️ 🌧️ ☀️ 🌙）。
- 拖拽/点击上传附件，上传后自动插入 Markdown 图片语法。
- 预览区支持 Prism 代码高亮和 Mermaid 图表渲染。

### 5.5 代码高亮与 Mermaid
- Prism.js 自动识别代码语言并高亮，右上角带一键复制按钮。
- Mermaid.js 渲染 ` ```mermaid ` 代码块为 SVG 流程图/时序图。

### 5.6 搜索
- 顶部搜索框，回车触发全文模糊匹配。

## 6. UI/UX 规范

- **整体风格**：淡黄色纸质背景（`#f3ecd0`）+ Vermillon 朱砂红强调色（`#D9381E`）。
- **导航栏**：朱砂红背景，不固定（随页面滚动），品牌名居中。
- **卡片**：半透明暖黄底色，轻微边框，Lumen 组件质感。
- **响应式**：桌面端左右分栏，移动端左侧栏折叠。

## 7. 运行方式

```bash
pip install -r requirements.txt
python app.py
```

访问 `http://localhost:5000`。

默认 Admin Key：`dev-key-change-in-production`（生产环境务必修改）。

---

**文档版本**：v1.1  
**最后更新**：2026-04-15
