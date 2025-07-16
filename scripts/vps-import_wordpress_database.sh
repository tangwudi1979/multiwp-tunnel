#!/bin/bash
# vps-import_wordpress_database.sh
# ---------------------------------------------------------
# 在 VPS 节点运行：
# 用于将同步过来的 wordpress.sql 文件导入到本地 MySQL 数据库。
#
# 一般由 vps-watch-db-sync.sh 监控触发自动执行，
# 也可以手动运行以进行单次导入。
#
# ⚠ 依赖：本地已配置好 mysql / mariadb 并允许本地导入。
# ⚠ 注意：务必确认数据库用户权限与数据库名正确。
#
# 属于 multiwp-tunnel 多活架构方案脚本。

# 引入环境变量（如你使用 .bashrc 中定义的别名等）
source ~/.bashrc

# SQL 文件路径
sql_file="/docker/wordpress/db/wordpress.sql"

# 日志文件
logfile="/var/log/db_import_monitor.log"

# Bark 通知地址
bark_success_iphone="https://xx.example.com/your-token/xx-node/wordpress-db-import-success"
bark_fail_iphone="https://xx.example.com/your-token/your-token/xx-node/wordpress-db-import-failure"

# 记录开始时间
echo "[$(date)] Starting import..." >> "$logfile"

# === 1. 停止 Cloudflare Tunnel connector，断开入口流量 ===
#echo "[$(date)] Stopping Cloudflare Tunnel connector..." >> "$logfile"
#systemctl stop cloudflared.service >> "$logfile" 2>&1

# === 2. 重建数据库 ===
echo "[$(date)] Dropping and recreating database..." >> "$logfile"
docker exec -i mariadb mysql -uroot -pyourpassword -e \
  "DROP DATABASE IF EXISTS wordpress; CREATE DATABASE wordpress DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" \
  >> "$logfile" 2>&1

# === 3. 导入 SQL 数据 ===
echo "[$(date)] Importing SQL dump..." >> "$logfile"
docker exec -i mariadb mysql -uroot -pyourpassword --max_allowed_packet=64M wordpress < "$sql_file" \
  >> "$logfile" 2>&1

# 检查导入是否成功（通过上一条命令退出码）
if [ $? -eq 0 ]; then
  echo "[$(date)] ✅ SQL import completed successfully." >> "$logfile"
  
  # === 4. 恢复 Cloudflare Tunnel connector ===
  #echo "[$(date)] Starting Cloudflare Tunnel connector..." >> "$logfile"
  #systemctl start cloudflared.service >> "$logfile" 2>&1

  # Bark 成功通知
  curl --max-time 5 -s -A "useragent" "$bark_success_iphone" > /dev/null
else
  echo "[$(date)] ❌ SQL import failed." >> "$logfile"

  # Bark 失败通知
  curl --max-time 5 -s -A "useragent" "$bark_fail_iphone" > /dev/null
fi

# === 5. 删除 SQL 文件 ===
rm -f "$sql_file"