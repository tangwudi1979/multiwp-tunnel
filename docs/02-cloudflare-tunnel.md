# 基于 Cloudflare Tunnel 的多活流量调度

## 为什么选择 Cloudflare Tunnel

相比传统的 Nginx + DNS 轮询或负载均衡，Cloudflare Tunnel（Argo Tunnel）提供了一种更轻量、运维成本更低的多活方式：

- 🚀 不需要在本地节点暴露公网 IP 或配置繁琐的防火墙端口，只需出向 443。
- 🌍 自动探测所有 Tunnel Connector 节点，按网络延迟、丢包状况做 best effort 调度。
- 🔐 流量由 Cloudflare Edge 终结 TLS，天然具备 DDOS 防护和全球 Anycast 优势。

在个人博客这种写入极少、读多的场景下，这种方案可以最大化可用性和全球访问体验。

---

## 多节点 Tunnel 实现原理

- 每个节点（如家宽节点、VPS节点）都运行 `cloudflared`。
- 通过相同的 `Tunnel ID` 注册到 Cloudflare。
- Cloudflare 会对所有 活动的Connector 进行定期探测，动态选取最优可用节点回源。

如果其中一个节点不可达：
- Cloudflare 会短暂切换到其他节点。
- 对用户基本无感知。

这种方式在个人场景下被称为 **"best effort(尽力而为) 高可用"**，对写少读多的博客场景尤为适合。

---

## 各节点部署简要示意

用户请求
|
v
Cloudflare Edge
|
+–> Tunnel (家宽节点)
|
+–> Tunnel (VPS节点)
|
+–> Tunnel (未来节点)

- 家宽节点：若访客地理位置接近（比如同城或同省），访问延迟会非常低，但整体可用性受限于家宽的稳定性和国际出口带宽。
- VPS节点：通常在骨干网络或国际数据中心，对全球访客提供更一致、更稳定的访问体验。
- Cloudflare 自动调度请求，按探测情况进行动态切换。

---

## 配置与部署流程（基于 Zero Trust token）

### 1️⃣ 在 Cloudflare Zero Trust 仪表盘中创建 Tunnel

1. 登录到 [Cloudflare Zero Trust]。
2. 进入 **网络 -> Tunnels**。
3. 点击 **Create Tunnel**，为你的博客关联的Tunnel起个名字，例如 `multiwp-tunnel`。

### 2️⃣ 在节点安装 cloudflared

1. 在Tunnel的**概述**中根据节点的类型选择适合的connector(连接器)安装方式。
2. 在各个节点按照官方建议的步骤使用token方式安装connector。

这样 Cloudflare 会在后台为这个 Tunnel 创建多条 Connector 记录，每个节点都是使用相同的token注册。

---

## 关于多节点的调度

当多个节点（家宽节点、VPS节点、未来可扩展节点）都使用同一个 Tunnel token 注册到 Cloudflare 后：
- Cloudflare Edge 会定期探测所有注册的 Connector，监控它们的延迟、可用性、丢包率。
- 对于用户请求，会采用 **best effort** 的方式选择最优节点回源。
- 如果某个节点短暂不可用，Edge 会自动切换到其他健康节点。
- 这种机制并非传统意义上的负载均衡按比例分配，而是偏向于健康探测优先的 failover + RTT 最优回源。

因此，在这种架构中：
- 不需要配置额外的负载均衡器。
- 也不需要在节点层面写复杂的 fallback。
- 只需保证所有节点文件近似一致（通过后续会讲到的 rsync 同步），就可以实现对读多写少场景下的多活。

---

## 小结

通过基于 Zero Trust token 的多节点 Tunnel：
- 极大简化了多活架构的运维复杂度。
- 无需公网 IP、无需额外防火墙放行，只需节点出向能访问 Cloudflare。
- Cloudflare Edge 会自动健康探测与最优流量调度，为个人博客带来接近企业级的可用性。

---

## 后续章节预览

- 📌 [下一章：文件同步与一致性探讨](./03-filesync-consistency.md)

---