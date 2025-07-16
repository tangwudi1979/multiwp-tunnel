/**
 * Cloudflare Worker - 随机壁纸 API
 * 设计缘由：
 * 在多活架构中，用户可能被路由到不同的边缘节点，
 * 为了确保在不同节点间也能获得一致的页面视觉体验，
 * 使用此 Worker 从同一 R2 存储随机选择壁纸，
 * 保证所有 Region 都从同一源统一随机。
 * 
 * 功能简介：
 * - 根据请求路径或 User-Agent 判断 PC / Mobile，随机从对应 R2 文件夹选取一张图片。
 * - 返回 302 重定向至图片 URL，带有浏览器与 CDN 缓存头。
 * 
 * 使用说明：
 * - 绑定环境变量 `WALLPAPER_BUCKET` 到 R2。
 * - 默认路径随机判断设备；可显式访问 `/fallback_pc.jpg` 或 `/fallback_mobile.jpg`。
 * 
 */
export default {
  async fetch(request, env, ctx) {
    const bucket = env.WALLPAPER_BUCKET; // 绑定 Cloudflare R2 存储桶
    const url = new URL(request.url);
    const pathname = url.pathname.toLowerCase(); // 获取请求路径（忽略大小写）

    // **确定文件夹（PC / Mobile）**
    let folder = "pc_img/"; // 默认 PC

    if (pathname.endsWith("fallback_mobile.jpg")) {
      folder = "mobile_img/";  // 强制移动端壁纸
    } else if (pathname.endsWith("fallback_pc.jpg")) {
      folder = "pc_img/";  // 强制 PC 端壁纸
    } else {
      // **`fallback.jpg` 需要根据 User-Agent 识别**
      const userAgent = (request.headers.get("User-Agent") || "").toLowerCase();
      const isMobile = /iphone|ipod|android|blackberry|iemobile|opera mini/.test(userAgent);
      folder = isMobile ? "mobile_img/" : "pc_img/";
    }

    console.log("Requested Path:", pathname);
    console.log("Selected Folder:", folder);

    try {
      // **获取 R2 存储桶中的文件列表**
      const objects = await bucket.list({ prefix: folder });
      const items = objects.objects;

      if (items.length === 0) {
        return new Response("No images found", { status: 404 });
      }

      // **随机选择一张图片**
      const randomItem = items[Math.floor(Math.random() * items.length)];
      if (!randomItem) {
        return new Response("No valid images", { status: 404 });
      }

      const imageUrl = `https://xx.example.com/${randomItem.key}`;

      // **设置缓存策略**
      const headers = new Headers();
      headers.set("Cache-Control", "public, max-age=600"); // 浏览器缓存 10 分钟
      headers.set("CDN-Cache-Control", "public, max-age=604800"); // Cloudflare CDN 缓存 7 天
      headers.set("ETag", randomItem.etag);

      // **302 重定向到图片 URL**
      return Response.redirect(imageUrl, 302);
    } catch (error) {
      console.error("Error in Worker:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }
};