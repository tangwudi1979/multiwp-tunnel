# 进阶优化

在基础的多活架构（Tunnel + rsync 同步）之上，还可以进一步提升可用性、性能和运维便利度。

这里介绍几个在实际中非常值得采用的增强方案。

---

## 使用 APO 在 Edge 大幅缓存

对于 WordPress，Cloudflare 的 APO（Automatic Platform Optimization）可以极大提高边缘缓存命中率：
- 让用户请求更多地直接在 Cloudflare Edge 返回，而无需回源。
- Edge 会自动缓存完整的 HTML，不止静态资源。
- 避免所有节点都需要处理大量 GET 请求，后端压力降到极低。

优点：
✅ 几乎绕开源站性能瓶颈，访问量再大也不怕。
✅ 任一节点离线也不影响访客访问，就算所有节点都离线，短时间内大部分文章内容还是可以访问的(开启了Always Online)，就是多了一个"源站不可用"的提示。  
✅ 页面 TTFB 显著下降。

缺点：
⚠ Cloudflare Free计划用户需要单独订阅（$5/mo），或者升级到Pro用户。  

如果对极致性能和抗风险有追求，APO 可以看作是让多活架构真正脱胎换骨的可选利器。

---

## 评论多节点写入

在多活场景下，最典型的一致性问题就是：
- 访客提交的评论，必须保证无论命中哪一个节点，都能被记录。

目前我的方案是让家宽节点作为主写节点。可以通过：
- 使用 Cloudflare Worker 将 `/admin-ajax.php` 代理为多写（同时 POST 给家宽节点和VPS节点）。
- 或者在 PHP 层同步写（适合有自研后端）。

这样即使某个节点临时失联，也能保证另一节点能接手新评论。

---

## 去除传统缓存插件，全面云端化(起用了APO之后)

很多 WordPress 用户会装：
- WP Super Cache
- W3 Total Cache
- Redis Object Cache

但在 APO规则已经做了全页面缓存的场景下，这些插件：
- 意义不大（缓存主要发生在 Edge）。
- 甚至会引发页面更新后不刷新的问题。

可以直接关闭本地的这些插件，把缓存完全交给 Cloudflare 来做，减少本地资源消耗，也避免多节点间因为缓存碎片化而不一致。

---

## Simply Static 静态兜底

作为多活的最后一道保险，可以用：
- Simply Static 按周生成完整的静态站。
- 再部署到 Cloudflare Pages。

这样即使所有 Tunnel 同时失效（例如 Cloudflare Tunnel 被大面积网络劫持或家庭路由器彻底掉线），仍可切换到纯静态版本。

简单配置一个 `staticblog.example.com` 的备用入口，即可最大化可用性。

---

## 自动化监控与 Bark 通知

在多节点多 Tunnel 下，需要及时获知：
- 哪个节点是否掉线。
- 是否需要登录服务器重启 Docker 或 Tunnel。

可以通过：
- 使用 Cloudflare Health Check（Pro 计划自带），监控主站 HTTP 可达性。
- 或用简单的 shell cron job + curl 检查本地 `127.0.0.1`。
- 出现超时就调用 Bark 推送到手机。

这样就能在节点出现故障时第一时间收到通知。

---

## 小结
通过这些功能增强多活架构的可用性、性能和运维便利度：
- Cloudflare APO 最大化 Edge 缓存。
- Worker 多点写入解决评论一致性。
- 去除传统缓存插件、减轻本地负担。
- Simply Static 保底，让你的博客在极端情况下依然可访问。
- Bark 通知辅助第一时间排查。

---

## 后续章节预览

- 📌 [下一章：安全与防火墙设计](./05-security-firewall.md)

---

