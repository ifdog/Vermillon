# Vermillon

> 一个单用户的个人内容发布平台，基于时间流的文章管理与展示系统。<br>
> 淡黄色纸质风格 × Markdown 原生支持 × 内置管理后台。

---

![Vermillon Screenshot](./docs/screenshot.png)

---

## ✨ 特性

- **📜 时间流首页** — 按时间倒序呈现文章，卡片式布局，轻量优雅。
- **📅 日历导航** — 左侧日历显示每日发文数量，点击日期可查看当日文档列表。
- **🏷️ 标签系统** — 自动识别 `#标签`，支持嵌套层级（如 `#work/frontend`）。
- **🖊️ Markdown 编辑** — 独立编辑页，左栏写作，右栏实时预览。
- **🖼️ 附件上传** — 支持拖拽上传图片和文件，自动插入 Markdown 语法。
- **💡 代码高亮** — 基于 Prism.js，支持一键复制代码块。
- **📊 Mermaid 图表** — 在 Markdown 中写 ` ```mermaid `，自动渲染为 SVG 图表。
- **🔍 全文搜索** — 顶部搜索框，快速定位历史内容。
- **📈 访问统计** — 自动记录首页访问日志，后台查看总访问量与每日趋势。
- **⚙️ 站点设置** — 后台可修改站点标题，即时生效。
- **🔒 Session 登录** — 用户名/密码认证，管理后台支持文章 CRUD 与账号管理。
- **🎨 纸质美学** — 淡黄色暖调背景 + Vermillon 朱砂红，像写在手账上的文字。

---

## 🚀 快速开始

### 环境要求
- Python 3.10+
- 或 Docker

### 方式一：本地运行

```bash
# 克隆仓库
git clone https://github.com/ifdog/Vermillon.git
cd Vermillon

# 安装依赖
pip install -r requirements.txt

# 启动服务
python app.py
```

打开浏览器访问 `http://localhost:5000`。

### 方式二：Docker Compose 部署（推荐）

```bash
cd Vermillon

# 启动容器
docker-compose up -d

# 查看日志
docker-compose logs -f
```

数据持久化说明：
- SQLite 数据库 `vermillon.db` 会保存在 `./data/`
- 上传的附件会保存在 `./data/uploads/`
- 可通过环境变量 `DATABASE_URL` 和 `UPLOAD_FOLDER` 自定义路径

### 默认登录信息
- **管理后台**：`http://localhost:5000/admin`
- **登录页**：`http://localhost:5000/login`
- **默认账号**：`admin` / `admin`

> ⚠️ 生产环境部署前，请务必修改默认密码，并设置强 `SECRET_KEY` 环境变量。

---

## 📁 项目结构

```
Vermillon/
├── api/                    # Flask API 路由
│   ├── memos.py            # Memo CRUD
│   ├── tags.py             # 标签列表
│   ├── search.py           # 全文搜索
│   ├── calendar.py         # 日历数据
│   ├── upload.py           # 文件上传
│   ├── auth.py             # Session 登录与账号管理
│   ├── stats.py            # 访问统计
│   └── settings.py         # 站点设置
├── static/                 # 前端静态资源
│   ├── css/style.css       # 纸质风格主题
│   ├── js/                 # 前端逻辑
│   ├── uploads/            # 附件存储
│   ├── index.html          # 首页
│   ├── write.html          # 编辑页
│   ├── admin.html          # 管理后台
│   └── login.html          # 登录页
├── app.py                  # Flask 入口
├── config.py               # 配置项
├── db.py                   # SQLite 初始化
├── utils.py                # 公共工具
├── requirements.txt        # Python 依赖
├── PRD.md                  # 产品需求文档
└── README.md               # 本文件
```

---

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Python 3.13 + Flask 3.0.3 |
| 数据库 | SQLite |
| 前端 | 原生 JavaScript + HTML5 + CSS3 |
| UI 框架 | Bootswatch Lumen |
| 代码高亮 | Prism.js |
| 图表渲染 | Mermaid.js |
| 密码加密 | Flask-Bcrypt |

---

## ⚙️ 配置说明

### 环境变量

在 `config.py` 中读取以下变量：

```python
SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
DATABASE_URL = os.environ.get('DATABASE_URL', 'vermillon.db')
UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', 'static/uploads')
```

推荐通过环境变量设置：

```bash
# Linux / macOS
export SECRET_KEY=your-secure-secret
export DATABASE_URL=/data/vermillon.db
export UPLOAD_FOLDER=/data/uploads

# Windows PowerShell
$env:SECRET_KEY="your-secure-secret"
$env:DATABASE_URL="/data/vermillon.db"
$env:UPLOAD_FOLDER="/data/uploads"
```

### 数据库

项目使用 SQLite，默认数据库文件为 `vermillon.db`。首次启动时会自动建表，并创建默认管理员账号 `admin` / `admin`。

---

## 📸 截图占位说明

README 顶部的截图引用路径为 `./docs/screenshot.png`。

你可以按以下步骤替换为自己的首页截图：

1. 启动项目并访问 `http://localhost:5000`。
2. 截取首页效果图。
3. 将图片保存为 `docs/screenshot.png` 并提交到仓库。

---

## 📜 License

MIT License © 2026 Vermillon
