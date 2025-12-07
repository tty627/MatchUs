# M@CHUS - 校园社交网络

一个面向上海科技大学学生的校园社交网络应用。平台支持学生发布活动、寻找搭子 / 小圈子，并通过独特的「实名延迟揭示机制」，在保证安全的前提下建立真实可信的连接。

## 产品使命与愿景

- **使命：**让每一个需求可以被即时满足
- **愿景：**通过构建即时交流平台，在任何时间、任何地点，快速组建「小圈子」「搭子」等临时团队，解决个人或单个群体难以独立解决的问题
- **应用场景示例：**
  - 技能 / 技术类指导（如：求助学习、课程、科研相关问题）
  - 陪伴 / 社交类需求（如：一起自习、运动、拼饭、看展等）

## 核心功能
### 1. 用户注册与登录

- 仅支持 `@shanghaitech.edu.cn` 学校邮箱注册
- 使用 **bcrypt** 对密码进行安全哈希存储
- 使用 **JWT** 进行身份认证和会话管理

### 2. 个人资料与新手引导

- 必填字段：真实姓名（私密）、昵称（公开）、年级、性别、个人简介（Bio）、标签（Tags）等
- 未完成个人资料前无法进入主信息流（Feed）
- 真实姓名默认对其他用户保密，仅在对方参与了你的帖子后才会显示给对方

### 3. 帖子信息流（Feed）

- 发布帖子：
  - 活动 / 需求内容
  - 活动时间
  - 地点
  - 目标人数
  - 标签（如：课程、运动、游戏、兴趣等）
- 浏览所有同学发布的帖子
- 帖子初始仅展示发起者的 **昵称**，不展示真实姓名

### 4. 参与与实名揭示机制

- 对感兴趣的帖子点击「参与」即可加入
- 当你成功参与某个帖子后：
  - 你可以看到该帖发起者的真实姓名
  - 前端会展示已参与状态的可视化标记

## 技术栈

### 后端（Backend）

- **Node.js** + **Express.js**：RESTful API 服务器
- **PostgreSQL**：关系型数据库
- **bcrypt**：密码哈希
- **jsonwebtoken**：JWT 身份认证
- **express-validator**：请求参数校验

### 前端（Frontend）

- **React**：前端 UI 框架
- **React Router**：前端路由
- **Vite**：构建工具与开发服务器
- **Axios**：HTTP 请求客户端

## 项目结构

```
machus-campus-social/
├── backend/
│   ├── config/
│   │   └── database.js          # 数据库连接配置
│   ├── middleware/
│   │   └── auth.js              # 鉴权中间件
│   ├── routes/
│   │   ├── auth.js              # 认证相关路由
│   │   ├── profile.js           # 个人资料相关路由
│   │   └── posts.js             # 帖子相关路由
│   ├── scripts/
│   │   └── migrate.js           # 数据库迁移脚本
│   ├── .env.example             # 环境变量示例
│   ├── package.json
│   └── server.js                # 后端入口文件
│
├── frontend/
│   ├── src/
│   │   ├── context/
│   │   │   └── AuthContext.jsx  # 登录状态上下文
│   │   ├── pages/
│   │   │   ├── Register.jsx     # 注册页
│   │   │   ├── Login.jsx        # 登录页
│   │   │   ├── ProfileSetup.jsx # 完善资料页
│   │   │   └── Feed.jsx         # 主信息流页
│   │   ├── utils/
│   │   │   └── api.js           # API 工具封装
│   │   ├── App.jsx              # React 根组件
│   │   ├── main.jsx             # React 入口
│   │   └── index.css            # 全局样式
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

## 数据库设计

### users 表

- `id`：主键
- `email`：唯一邮箱，必须以 `@shanghaitech.edu.cn` 结尾
- `password_hash`：加密后的密码
- `real_name`：真实姓名（仅在参与关系成立后对特定用户可见）
- `nickname`：昵称（公开显示）
- `grade`：年级
- `gender`：性别
- `bio`：个人简介
- `tags`：兴趣标签数组
- `profile_completed`：是否完成资料的布尔标记
- `created_at`：注册时间

### posts 表

- `id`：主键
- `user_id`：发帖用户 ID（外键，对应 users.id）
- `content`：帖子内容
- `event_time`：可选，活动时间
- `location`：可选，活动地点
- `target_people`：期望参与人数
- `tags`：帖子标签数组
- `created_at`：发帖时间

### participations 表

- `id`：主键
- `post_id`：帖子 ID（外键，对应 posts.id）
- `user_id`：参与用户 ID（外键，对应 users.id）
- `participated_at`：参与时间
- 在 `(post_id, user_id)` 上设置唯一约束，避免同一用户重复参与同一帖子

## 本地运行与环境配置

### 环境依赖

- Node.js（建议 v16 及以上）
- PostgreSQL（建议 v12 及以上）
- npm 或 yarn

### 1. 数据库初始化

安装 PostgreSQL 后，创建项目数据库：

```bash
# 使用 postgres 超级用户登录
psql -U postgres

# 创建数据库
CREATE DATABASE machus_db;

# 退出 psql
\q
```

### 2. 后端（backend）启动步骤

```bash
# 进入后端目录
cd backend

# 安装依赖
npm install

# 从示例文件创建 .env
cp .env.example .env

# 打开 .env，配置数据库账号、密码等
# 重点修改：DB_PASSWORD、JWT_SECRET

# 运行数据库迁移脚本
npm run migrate

# 启动后端开发服务器
npm run dev
```

后端默认运行在 `http://localhost:5000`。

### 3. 前端（frontend）启动步骤

```bash
# 新开一个终端，进入前端目录
cd frontend

# 安装依赖
npm install

# 启动前端开发服务器
npm run dev
```

前端默认运行在 `http://localhost:3000`。

## API 接口概览

### 认证（Auth）

- `POST /api/auth/register`：用户注册
- `POST /api/auth/login`：用户登录

### 个人资料（Profile）

- `GET /api/profile/me`：获取当前登录用户的个人资料
- `PUT /api/profile/complete`：完善 / 更新个人资料

### 帖子（Posts）

- `GET /api/posts`：获取所有帖子（需要先完成个人资料）
- `GET /api/posts/:id`：获取单个帖子详情
- `POST /api/posts`：发布新帖子（需要先完成个人资料）
- `POST /api/posts/:id/participate`：参与某个帖子

## 关键实现说明

### 邮箱后缀校验

系统通过正则表达式强制限制只允许使用上海科技大学邮箱注册：

```javascript
const SHANGHAITECH_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@shanghaitech\.edu\.cn$/;
```

### 真实姓名揭示逻辑

后端通过 SQL 中的 `EXISTS` 语句判断当前用户是否已参与该帖子：

```sql
SELECT 
  u.nickname,
  u.real_name,
  EXISTS(
    SELECT 1 FROM participations 
    WHERE post_id = p.id AND user_id = $1
  ) as has_participated
FROM posts p
JOIN users u ON p.user_id = u.id
```

前端根据 `hasParticipated` 字段决定是否展示真实姓名：

```javascript
{post.hasParticipated && post.author.realName && (
  <span>(Real name: {post.author.realName})</span>
)}
```

## 开发注意事项

- 后端使用 JWT，并将 Token 存储在浏览器 `localStorage` 中
- 所有需要登录的接口都需在 `Authorization` Header 中携带 Bearer Token
- 访问受保护路由前，会通过中间件强制检查用户是否已完成个人资料
- 用户密码最短长度为 6 位
- 所有时间字段均使用 PostgreSQL 的 `TIMESTAMP` 类型存储

## 后续可扩展方向

- 参与者之间的私信 / 聊天功能
- 帖子搜索与多维度筛选
- 用户公开主页 / 个人空间
- 通知中心（参与成功、有人加入我的帖子等）
- 帖子评论功能
- 支持图片上传
- 邮箱验证流程
- 忘记密码与重置密码功能

## License

MIT

## 作者与背景

本项目为上海科技大学校园社交网络 MVP（最小可行产品）而创建，用于验证校园即时社交与搭子匹配场景的可行性。
