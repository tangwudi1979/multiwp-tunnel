# multiwp-tunnel

A multi-region active-active architecture for WordPress, powered by Cloudflare Tunnel & edge caching.
Designed to minimize single points of failure, offload reads to the edge, and keep multi-node WordPress instances nearly consistent — with very low operational burden.

⸻

## 🚀 Why this project?

This project started as an experiment to make my personal blog — originally hosted on a single Mac mini at home — much more fault-tolerant.
	•	Home networks are fragile: ISP outages, power cuts, hardware failures all happen.
	•	Moving to a multi-region active-active WordPress setup means:
	•	Even if one server fails, visitors can still reach your site.
	•	Combined with Cloudflare APO, most traffic never even hits PHP or your DB.
	•	Edge caching makes your blog as fast from Tokyo as it is from Chicago.

It’s a personal playground to explore distributed WordPress, using:
	•	Cloudflare Tunnel for multi-node edge routing
	•	rsync-based file & DB sync to keep nodes close
	•	Workers for decoupled services (like comments, random images, page views)
	•	All designed around tiny writes + heavy read caching

⸻

## 🌐 Architecture at a glance

        +-----------------------------+
        |     Cloudflare Edge CDN     |
        | (APO, global edge caching)  |
        +-------------+---------------+
                      |
         +------------+------------+
         |            |            |
     Home Node   VPS Node   Future Nodes
   (Mac mini)      (VPS)           (more)
         \            |            /
          +------[ rsync sync ]----+

	•	🚀 Edge-first: Almost all visitors get pages from Cloudflare’s edge (via APO).
	•	🖥 Multi-region Tunnels: Each node establishes its own Cloudflare Tunnel; Cloudflare picks the nearest healthy node (best effort).
	•	🔄 Weak consistency:
	•	Most writes (posts, edits) happen only on the home node, then rsync pushes updates to others.
	•	Occasional writes (comments) handled by a multi-node-aware Worker to keep DB writes under control.
	•	🛠 Decoupled services:
	•	Random image API, page view tracking, comment writes — all handled by Workers + KV for global availability.

⸻

## ⚙️ Highlights of the design
	•	✅ Cloudflare Tunnel multi-region: No direct public IP needed, no complicated failover DNS. Each node connects out, Cloudflare handles traffic steering.
	•	✅ Automatic file/DB sync:
	•	Posts written only to primary (home) node.
	•	rsync pushes DB+files to secondary nodes.
	•	✅ Global caching with APO:
	•	Complete pages cached at Cloudflare edge — not just static assets.
	•	Even if PHP or MySQL crashes, edge cache still serves pages, hiding most failures.
	•	✅ Workers as unified write targets:
	•	Comments & page views are not tied to a single node.
	•	Worker decides where to write, using KV or direct API to maintain consistency.

⸻

## 📂 Repository layout
	•	docs/ — (Chinese) detailed documentation, covering:
	•	Architecture, tunnel setup, rsync consistency, advanced optimization, security, future plans, FAQ.
	•	scripts/ — Node automation scripts:
	•	master-export-db-sync-to-vps.sh — Exports DB from the home node, pushes to VPS.
	•	vps-import_wordpress_database.sh — Imports DB on VPS node.
	•	vps-watch-db-sync.sh — Monitors sync, retries or alerts on failure.
	•	workers/ — Cloudflare Worker scripts:
	•	multi-node-comment-writer.js — Ensures comments are written consistently in a multi-node setup.
	•	random-image-api.js — Random image / wallpaper API from edge.
	•	views-track-api.js — Page view tracker; keeps counts centralized even across multi-node edges.

⸻

## 💡 Why not just scale WordPress horizontally with Redis / Memcached?

Because this is a read-heavy personal blog, not an e-commerce or SaaS app.
	•	Redis object caching, advanced invalidation, or multi-master MySQL is overkill.
	•	With APO, nearly 90-95% of traffic is served from the edge — no PHP, no DB hit.
	•	The multi-node Tunnels + rsync keep things simple and cheap.

⸻

## 🔗 Related blog posts

Will link here once published.
Meanwhile, more articles at https://blog.tangwudi.com.

⸻

✅ Done — this is now a tech-heavy README, highlighting your architecture, design choices, and trade-offs, perfect for GitHub visitors.
