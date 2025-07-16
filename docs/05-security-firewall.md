# 安全与防火墙设计

## 为什么安全面其实很窄？

在这套架构下：
- 家宽节点处于 NAT 后，且不需要做任何从外到内的端口映射(如果有公网IP)。
- 唯一的外部入口是由Cloudflare Tunnel中配置的"公共主机名"决定。
- 所以无需担心家宽公网IP(如果有的话)被直接扫描、攻击。

真正需要安全强化的，主要在云端 VPS 节点。

---

## 家宽节点

- 在主路由(我使用的是爱快)中：
  - 不做任何从外到内的端口映射。
  - 所以从公网无法直接访问，天然封闭。
- 本地节点就算不做任何防火墙配置也无所谓，唯一的进程监听在 `127.0.0.1`。

---

## VPS 节点

### SSH
- 只开放一个高位端口(如 `56789`)供 SSH使用(只是便于从国内跨境管理，如果都是国外环境，tailscale不受劣化的前提下，根本不需要开放端口，直接通过tailscale私有IP管理即可)。
- 强制使用公钥认证，禁用密码登录。
- 在这种配置下，fail2ban 并非必需。

### HTTP 服务
- 所有 HTTP（如 Nginx 或 WordPress Docker）只监听 127.0.0.1。
- 禁止直接在公网 80/443 上监听。

### VPS 防火墙示例
```
# 默认禁止所有进站
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# 允许已建立连接
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# 允许 SSH 高位端口
iptables -A INPUT -p tcp --dport 56789 -j ACCEPT

# 允许本地回环
iptables -A INPUT -i lo -j ACCEPT
```

---

## Tunnel 的天然安全
- 所有 Web 访问都通过 Cloudflare Tunnel 转发。
- 云端节点不需要任何对外暴露的 HTTP/HTTPS 端口。
- 即使 VPS IP 直接暴露在互联网上，扫描器也无法探测到(因为只监听127.0.0.1)，更别说iptables还配置了DROP规则。

---

## 小结
这种架构极大简化了安全需求：
- 家宽节点只需保证路由器不做端口映射。
- VPS 只需要开放一个 SSH 管理口(或者干脆不开放)，其他全部 DROP。
- 用户所有 HTTP 请求都由 Cloudflare Tunnel 出口托管，无需自行部署证书、抗 DDoS 或防扫描。

---

## 后续章节预览

- 📌 [下一章：未来计划与改进](./06-future-plans.md)

---
