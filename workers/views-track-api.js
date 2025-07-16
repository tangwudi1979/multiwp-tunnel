/**
 * Cloudflare Worker - 文章阅读量统计 API
 *
 * 📌 设计缘由：
 * 在多活架构下，用户可能被路由到不同地区节点访问网站。
 * 如果各节点各自统计阅读次数，容易导致数据分裂、统计失真。
 * 因此使用统一的 Worker 入口，通过绑定的 KV 存储集中记录，
 * 确保所有访问都写入同一后端，保持统计数据一致性。
 * 
 * ⚠️ 注意：此方案无法避免 APO 等全站缓存带来的命中，
 * 统计数字更偏向流量热度估计，而非绝对精准。
 *
 * 🚀 功能简介：
 * - 支持 GET 和 POST 两种接口：
 *   • GET /views-track?slug=xxx   -> 查询文章阅读次数
 *   • POST /views-track {slug}    -> 阅读次数 +1 并返回最新计数
 * - KV 使用 `views:{slug}` 作为键，存储阅读量。
 * - 轻量 JSON 输出，适合页面直接异步请求。
 *
 * 🛠 使用说明：
 * - 在 wrangler.toml 中需绑定 KV 命名空间：
 *     [vars]
 *     views_kv = "<YOUR_KV_NAMESPACE_BINDING>"
 * - slug 只允许小写字母、数字与连字符（最长100）。
 * - 可用于静态或多节点环境中统一统计文章阅读。
 *
 * 作者: tangwudi.com
 * 日期: 2025-07
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 处理 GET 请求 -> 查询阅读次数
    if (request.method === "GET" && url.pathname === "/views-track") {
      return await handleGetRequest(url, env);
    }

    // 处理 POST 请求 -> 记录并返回最新阅读次数
    if (request.method === "POST" && url.pathname === "/views-track") {
      return await handlePostRequest(request, env);
    }

    return new Response("Invalid request", { status: 405 });
  }
};

// 处理 GET 请求 -> 查询 KV 获取阅读量
async function handleGetRequest(url, env) {
  const slug = url.searchParams.get("slug");

  if (!isValidSlug(slug)) {
    return new Response("Invalid slug format", { status: 400 });
  }

  const kvKey = `views:${slug}`;
  const currentViews = parseInt(await env.views_kv.get(kvKey)) || 0;

  return new Response(JSON.stringify({ success: true, views: currentViews }), {
    headers: jsonHeaders(),
  });
}

// 处理 POST 请求 -> 记录阅读量
async function handlePostRequest(request, env) {
  try {
    const { slug } = await request.json();

    if (!isValidSlug(slug)) {
      return new Response("Invalid slug format", { status: 400 });
    }

    const kvKey = `views:${slug}`;
    const currentViews = parseInt(await env.views_kv.get(kvKey)) || 0;
    await env.views_kv.put(kvKey, (currentViews + 1).toString());

    return new Response(JSON.stringify({ success: true, views: currentViews + 1 }), {
      headers: jsonHeaders(),
    });
  } catch (error) {
    console.error("Worker Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

// 校验 slug 格式
function isValidSlug(slug) {
  return slug && /^[a-z0-9-]{1,100}$/.test(slug);
}

// 统一 JSON 响应头
function jsonHeaders() {
  return {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "CF-Cache-Status": "BYPASS",
  };
}