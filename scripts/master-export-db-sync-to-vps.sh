#!/bin/bash
# master-export-db-sync-to-vps.sh
# 在主节点执行：
# 使用 rsync 将 wordpress.sql 同步到各个 VPS。
#
# 由 multiwp-tunnel 多活方案使用。

# 加载环境变量（供 ssh 调用时生效）
source ~/.bash_profile

# 设置导出路径
EXPORT_PATH="/docker/wordpress/db/wordpress.sql"

# 目标服务器信息
REMOTE_USER="root"
REMOTE_HOST="xx.xx.xx.xx"
REMOTE_PORT="xx"
REMOTE_PATH="/docker/wordpress/db/wordpress.sql.tmp"
FINAL_PATH="/docker/wordpress/db/wordpress.sql"

# rsync 重试配置
MAX_RETRY=10
RETRY_DELAY=10  # 秒

echo "🚀 开始导出 WordPress 数据库..."
if docker exec -u root mariadb mysqldump -uroot -pyourpassword --databases wordpress > "$EXPORT_PATH"; then
  echo "✅ 导出成功：$EXPORT_PATH"

  # rsync 重试循环
  COUNT=0
  SUCCESS=0
  while [[ $COUNT -lt $MAX_RETRY ]]; do
    echo "📡 第 $((COUNT+1)) 次尝试 rsync 传输..."
    /opt/homebrew/bin/rsync -az --progress --partial --append-verify -e "ssh -p $REMOTE_PORT" "$EXPORT_PATH" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH"
    if [[ $? -eq 0 ]]; then
      echo "✅ rsync 传输成功！"
      SUCCESS=1
      break
    else
      echo "❌ rsync 传输失败，等待 $RETRY_DELAY 秒后重试..."
      sleep $RETRY_DELAY
      ((COUNT++))
    fi
  done

  if [[ $SUCCESS -ne 1 ]]; then
    echo "🚨 rsync 多次尝试均失败，退出脚本！"
    exit 1
  fi

  # 远程和本地 md5 校验
  echo "🔍 获取远程文件 MD5..."
  REMOTE_MD5=$(ssh -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST" "md5sum $REMOTE_PATH | awk '{print \$1}'")
  LOCAL_MD5=$(/sbin/md5 -q "$EXPORT_PATH")

  echo "本地 MD5 : $LOCAL_MD5"
  echo "远程 MD5: $REMOTE_MD5"

  if [[ "$LOCAL_MD5" == "$REMOTE_MD5" ]]; then
    echo "✅ MD5 校验一致，执行远程改名..."
    ssh -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST" "mv $REMOTE_PATH $FINAL_PATH"

    # Bark 通知
    echo "🚀 发送 Bark 通知..."
    curl -s --max-time 5 -A "useragent" \
      "https://xxx.example.com/your-toekn/xx节点通知/wordpress数据库导出成功" >/dev/null

    echo "✅ 任务完成，所有流程执行成功！"
  else
    echo "❌ MD5 校验不一致，请检查传输过程！"
    exit 1
  fi
else
  echo "❌ 数据库导出失败"
  exit 1
fi

echo "🎉 脚本结束"