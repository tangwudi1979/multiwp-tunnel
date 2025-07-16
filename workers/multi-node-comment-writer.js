/**
 * multiwrite-comments-worker.js
 *
 * Cloudflare Worker script
 *
 * 用于在多活架构下将 WordPress 评论（admin-ajax.php 请求）
 * 同步写入多个节点。主节点同步返回响应，从节点异步写入。
 *
 * - 主节点：macmini（主写，持久化数据库）
 * - 从节点：芝加哥 VPS（仅用于多活读，为减少写丢失也写入一次）
 *
 * 说明：
 * - 如果路径不是 /admin-ajax.php，直接返回 404。
 * - 返回结果总是使用主节点的响应，保证用户体验。
 * - 在响应中额外添加 `X-Worker-Hit: yes` 头标识命中。
 */
/**
 * 注意：
 * 每个节点需要配置单独的域名（如 comment1.example.com、comment2.example.com），
 * 在 Cloudflare Zero Trust 的 Tunnel 配置中，分别指向各自本地的 Web 服务端口。
 * 这样 Worker 才能明确区分不同节点并实现多写。
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
 
    // 如果路径不是 /admin-ajax.php，返回 404（防止滥用）
    if (!url.pathname.endsWith("/admin-ajax.php")) {
      return new Response("Not found", {
        status: 404,
        headers: {
          "content-type": "text/plain",
          "X-Worker-Hit": "no" // 自定义响应头，用于标记未命中
        }
      });
    }
 
    // 缓冲请求体（避免多次读取失败）
    const reqBody = request.method === "GET" || request.method === "HEAD"
      ? null
      : await request.arrayBuffer();
 
    // 拷贝请求头，去除 Referer（有些服务会校验）
    const commonHeaders = new Headers(request.headers);
    commonHeaders.delete("referer");
 
    // 构建主节点请求（comment1：macmini 上的主写节点）
    const primaryRequest = new Request("https://comment1.example.com/wp-admin/admin-ajax.php", {
      method: request.method,
      headers: commonHeaders,
      body: reqBody,
      redirect: "manual" // 防止重定向被自动跟随
    });
 
    // 构建从节点请求（comment2：芝加哥从读节点）
    const secondaryRequest = new Request("https://comment2.example.com/wp-admin/admin-ajax.php", {
      method: request.method,
      headers: commonHeaders,
      body: reqBody,
      redirect: "manual"
    });
 
    // 主节点请求：同步执行，并作为最终响应返回
    const primaryResponse = await fetch(primaryRequest);
 
    // 从节点请求：异步执行，失败也不会影响主流程
    ctx.waitUntil(
      fetch(secondaryRequest).catch((err) => {
        console.log("Secondary write failed:", err);
      })
    );
 
    // 添加自定义响应头，标记命中 Worker
    const respHeaders = new Headers(primaryResponse.headers);
    respHeaders.set("X-Worker-Hit", "yes");
 
    // 返回主节点的响应结果
    return new Response(primaryResponse.body, {
      status: primaryResponse.status,
      statusText: primaryResponse.statusText,
      headers: respHeaders
    });
  }
};