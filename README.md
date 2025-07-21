# multiwp-tunnel

[English README here](README-en.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> 基于 Cloudflare Tunnel 的 WordPress 多节点多活架构  
> 通过多地域节点、边缘流量分散、文件定时同步，降低单点故障风险，并极大提升可用性与延迟体验。  
> 🌏 主要用于个人博客的边缘加速、高可用探索。

---

## 🚀 项目背景

因为对「家庭数据中心」可用性要求提高，我逐步探索了基于 Cloudflare Tunnel 的多节点多活方案。
实现：
- 多地域（家庭节点 + VPS 节点）同时可用
- 用户流量由 Cloudflare 自动调度至可用节点（best effort）
- 节点之间通过定时文件同步保持一致
- 大部分写入可控，不可控写入极少(评论)，允许弱一致性

---

## 🌐 总体架构图

```

                    用户请求
                      |
                      v
         Cloudflare Edge (best effort)
             /        |         \
            /         |          \
           v          v           v
        家庭节点     VPS节点     未来节点
            \         |         /
             \        |        /
              +-------------------+
              |  库文件手动/定时同步  |
              |      （rsync）      |
              +-------------------+

特性：
- 多节点 Cloudflare Tunnel 接入
- 文件近似一致，写冲突概率低
- 可读性强，适合分布式静态服务

※ 推荐搭配 Cloudflare APO，提升边缘缓存命中率，减轻源站负担

```

## 📂 仓库结构

- `docs/` — 主要架构文档（建议按序阅读）：
  - `01-architecture-overview.md` — 多活总体架构详解
  - `02-cloudflare-tunnel.md` — Cloudflare Tunnel 配置思路
  - `03-filesync-consistency.md` — 库文件同步与一致性
  - `04-advanced-optimizations.md` — 更多进阶优化方案
  - `05-security-firewall.md` — 安全策略与防火墙配置
  - `06-future-plans.md` — 未来规划与可能方向
  - `07-faq.md` — 常见问题答疑

- `scripts/` — 各类自动化运维脚本：
  - `master-export-db-sync-to-vps.sh` — 家庭节点导出并同步数据库到 VPS
  - `vps-import_wordpress_database.sh` — VPS 节点导入数据库脚本
  - `vps-watch-db-sync.sh` — VPS 监控同步异常，自动重试或触发告警

- `workers/` — Cloudflare Worker 边缘脚本：
  - `multi-node-comment-writer.js` — 评论多节点写入调度 Worker，确保评论统一写入所有节点
  - `random-image-api.js` — 随机壁纸/图床 API，通过边缘分发生成，避免依赖本地文件存储，更适合多活架构
  - `views-track-api.js` — 阅读量统计 Worker，在边缘轻量记录访问(更适合多活架构)，用于大致热度参考（因 APO/缓存特性，数字并不精确）
---

## ✍️ 更多细节与教程

更完整的原理解析、部署细节以及运维心路历程，都已整理在博客文章中：[https://blog.tangwudi.com/technology/homedatacenter13504/]

---

## 📝 License

MIT License — 允许自由使用、修改、分享，敬请随意探索。