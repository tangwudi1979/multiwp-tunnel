# multiwp-tunnel
> 基于 Cloudflare Tunnel 的 WordPress 多节点多活架构  
> 通过多地域节点、边缘流量分散、文件定时同步，降低单点故障风险，并极大提升可用性与延迟体验。  
> 🌏 主要用于个人博客的边缘加速、高可用探索。

---

## 🚀 项目背景

随着个人博客访问量增长，以及对「家庭数据中心」可用性要求提高，
我逐步探索了基于 Cloudflare Tunnel 的多节点多活方案。
实现：
- 多地域（家庭节点 + VPS 节点）同时可用
- 用户流量由 Cloudflare 自动调度至可用节点（best effort）
- 节点之间通过定时文件同步保持一致
- 写入极少，允许弱一致性

---

## 🌐 总体架构图
用户 -> Cloudflare Edge (best effort)
       /       |       \
      v        v        v
 家庭节点   芝加哥节点   未来节点
       \       |       /
        +-- 文件定时同步 --+
              (rsync)
特性: Tunnel 多节点接入 • 文件近似一致 • 写少冲突可忽略

※ 推荐搭配 Cloudflare APO，Edge 缓存率更高，源站压力更小。
