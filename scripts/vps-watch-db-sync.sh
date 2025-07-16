#!/bin/bash
# vps-watch-db-sync.sh
# ---------------------------------------------------------
# 在 VPS 节点运行：
# 使用 inotifywait 监控指定目录，一旦发现 wordpress.sql 文件被更新，
# 自动调用 vps-import-db.sh 将数据库导入。
#
# 需要安装 inotify-tools。
#
# 由 multiwp-tunnel 多活方案使用。

# 配置项
watchdir="/docker/wordpress/db"
target_file="$watchdir/wordpress.sql"
script="/root/script/vps-import-db.sh"
logfile="/var/log/db_import_monitor.log"

log() {
    echo "[$(date '+%F %T')] $1" >> "$logfile"
}

log "Monitor script started."

# 启动时如果目标文件已存在，也触发导入一次（防止 inotifywait 启动前文件就已存在）
if [ -f "$target_file" ]; then
    log "Found existing $target_file on startup. Starting import..."
    timeout 300 bash "$script" >> "$logfile" 2>&1
    if [ $? -eq 124 ]; then
        log "Import script timed out after 300s."
    else
        log "Import finished."
    fi
fi

# 持续监听
while true; do
    inotifywait -e moved_to "$watchdir" --format '%f' | while read filename; do
        # 只处理精准命名为 wordpress.sql 的新文件（即 mv 操作完成）
        if [ "$filename" = "wordpress.sql" ]; then
            full_path="$watchdir/$filename"
            log "Detected $filename moved into place. Verifying and importing..."

            # 稍等 1 秒确保文件系统写完缓存
            sleep 1

            # 进一步确认文件大小不为 0 且非占用中
            if [ -s "$full_path" ]; then
                timeout 300 bash "$script" >> "$logfile" 2>&1
                if [ $? -eq 124 ]; then
                    log "Import script timed out after 300s."
                else
                    log "Import finished."
                fi
            else
                log "❌ Detected $filename but file is empty or unreadable. Skipping."
            fi
        fi
    done

    # 稳妥起见稍作休眠
    sleep 2
done