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

    // 只处理 /wp-admin/admin-ajax.php
    if (url.pathname !== "/wp-admin/admin-ajax.php") {
      return new Response("Not found", {
        status: 404,
        headers: {
          "content-type": "text/plain",
          "X-Worker-Hit": "no"
        }
      });
    }

    // 仅处理 POST 且为提交评论请求
    if (request.method !== "POST") {
      return fetch(request); // 放行非 POST（如 GET, OPTIONS）
    }

    // 读取请求体（可复用）
    const reqBody = await request.arrayBuffer();
    const contentType = request.headers.get("content-type") || "";

    let isCommentRequest = false;

    // 判断是否为评论提交请求
    if (contentType.includes("application/x-www-form-urlencoded")) {
      try {
        const bodyText = new TextDecoder().decode(reqBody);
        const params = new URLSearchParams(bodyText);
        isCommentRequest = params.has("comment_post_ID") && params.has("comment");
      } catch (err) {
        console.log("Body parse failed:", err);
      }
    }

    // 如果不是评论请求，直接原样转发（可能是后台 AJAX 请求）
    if (!isCommentRequest) {
      return fetch(request);
    }

    // ========= 评论请求正式处理 =========

    const commonHeaders = new Headers(request.headers);
    commonHeaders.delete("referer");

    const primaryRequest = new Request("https://comment1.example.com/wp-admin/admin-ajax.php", {
      method: "POST",
      headers: commonHeaders,
      body: reqBody,
      redirect: "manual"
    });

    const secondaryRequest = new Request("https://comment2.example.com/wp-admin/admin-ajax.php", {
      method: "POST",
      headers: commonHeaders,
      body: reqBody,
      redirect: "manual"
    });

    const primaryResponse = await fetch(primaryRequest);

    ctx.waitUntil(
      fetch(secondaryRequest).catch((err) => {
        console.log("Secondary write failed:", err);
      })
    );

    const respHeaders = new Headers(primaryResponse.headers);
    respHeaders.set("X-Worker-Hit", "yes");

    return new Response(primaryResponse.body, {
      status: primaryResponse.status,
      statusText: primaryResponse.statusText,
      headers: respHeaders
    });
  }
};