# 🐱 猫步可爱 (Maobu Cute) - 极简高能个人全能助理

[![Version](https://img.shields.io/badge/version-v0.10.0-emerald.svg)](https://github.com/maobukeai/maobu-cute-app/releases)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Electron-44-teal.svg)](https://www.electronjs.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> **猫步可爱** 是一款兼具**微信极简轻快交互**与 **Apple iOS/macOS 细腻原生质感**的现代化高能个人全能助理。  
> 采用本地优先（Local-First）与端到端离线加密架构，为你的日常计划、思考沉淀、账号安全、AI 对话与海外账号护航赋能。

---

## ✨ 核心特性一览

### 1. 📅 任务与计划清单 (Plans & Todos)
- **多层级子任务拆解**：支持为计划添加细分待办项，可视化进度条实时跟踪。
- **四维优先级与色彩管理**：紧急（Red）、重要（Orange）、普通（Blue）、日常（Zinc）。
- **AI 智能规划助手**：输入简略愿望，AI 秒级为你智能拆解为结构化执行步骤。

### 2. 📝 灵感与 Markdown 笔记 + AI 实时干活动态看板
- **全功能 Markdown 编辑器**：支持粗体、标题、无序列表、待办勾选框、代码块与引用。
- **全新 AI 实时干活动态看板 (Live Action Dock)**：
  - **思考链透明呈现**：实时渲染大模型（GLM-5.2 / DeepSeek R1 / V4 / Kimi）深度推导思考过程，附带计时器与折叠抽屉；
  - **打字机流式输出**：实时字数统计与光标动效；
  - **非破坏性采纳**：独立窗口预览，支持一键追加文末、采纳替换或复制，绝不擅自篡改原稿；
  - **随时终止**：支持中途随时熔断叫停。

### 3. 🛡️ 安全密码箱 (Secure Vault)
- **本地优先加密**：所有密码与凭据仅保存在本地持久层，杜绝云端泄露隐患。
- **内置密码生成器**：支持自定义长度、特殊符号与高强度随机密码算法。

### 4. ⏱️ 2FA 动态令牌生成器 (Authenticator)
- **RFC 6238 标准 TOTP**：支持 Google Authenticator 密钥导入，生成标准 6 位动态验证码。
- **30 秒环形平滑倒计时**：清晰掌握口令刷新节奏，支持单键快捷复制。

### 5. ✉️ 微软邮箱伴侣 (Microsoft Mail)
- **收件箱 + 垃圾箱并发收取**：专为海外服务（如注册验证码流落垃圾箱）设计，双管齐下绝不遗漏。
- **验证码智能正则抽取**：自动从邮件正文中提取 4~8 位验证码，提供高亮卡片与一键复制。

### 6. 🌐 谷歌 14 天科学防封养号系统 (Google Warming)
- **严格 14 天权重晋升阶梯**：从第 1 天安全初登、设备巡检、YouTube 互动，直到第 14 天出师晋升全球成熟老号。
- **今日打卡实操工作台**：交互式打卡 Checklist、2FA 口令速查、备用码管理与成就礼花。
- **无缝数据互导**：完美兼容 `3D-Personal-Learning-Platform` 导出的 `google-warming-backup-*.json` 备份文件，支持智能判重与增量合并。

### 7. 🤖 AI 智能伴侣与深度思考大模型
- **完全兼容 OpenAI 自定义端点**：自由配置 Base URL 与 API Key（支持 SenseNova、DeepSeek、SiliconFlow、Google AI Studio 等）。
- **「🔄 获取模型 (/models)」实时探查**：单键查询远端可用模型列表，无需手动查找填报。
- **深度思考链原生支持**：对 `<think>` 标签、`reasoning_content` 及 Gemini thought 分段流式解码。

### 8. 🧩 GitHub 开源高星技能市场
- 聚合 GitHub 权威开源的高星专家 Prompt 与 Skill 库（如 `awesome-chatgpt-prompts`、`fabric` 等），支持一键安装与自由创建自定义技能。

### 9. ☁️ 坚果云 WebDAV 云端备份与多端同步
- 支持一键将本地全量加密数据备份至坚果云或自建 WebDAV 服务器，支持随时备份与一键跨设备还原。

### 10. 🖥️ 原生桌面模式与双模适配
- 完美支持 Windows / macOS 宽屏桌面模式（窗口自适应与红黄绿三色灯质感），亦可一键切换为移动端精致仿真形态。

---

## 🛠️ 本地开发与构建指南

### 环境要求
- Node.js >= 18.0.0 (推荐 20+)
- npm >= 9.0.0

### 安装依赖
```bash
npm install
```

### 启动 Web 开发服务器
```bash
npm run dev
```

### 编译打包生产静态资源
```bash
npm run build
```

### 启动 Electron 桌面版
```bash
npm run electron:dev
```

### 打包 Windows 桌面独立可执行程序
```bash
npm run electron:build
```
打包产物将输出至 `release/` 目录下。

---

## 📦 版本记录
- **v0.10.0 (2026-09-03)**:
  - 首次公开发布版本；
  - 集成 8 大核心功能模块；
  - 引入 WebDAV 云端同步与备份；
  - 引入 Markdown 编辑器 AI 实时干活动态看板；
  - 引入 3D 平台数据互通与谷歌 14 天科学养号系统；
  - 引入真实 GitHub 开源高星技能市场；
  - 完成 Android 虚拟设备与 Windows 原生桌面端全流程实测验证。

---

## 📄 开源许可证
MIT License. Copyright (c) 2026 猫步团队.
