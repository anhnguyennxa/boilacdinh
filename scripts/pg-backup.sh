#!/bin/sh
# Sao lưu Postgres + ảnh tải lên — chạy trong service "backup" của docker-compose (cron 03:00 giờ VN).
# Biến: PGHOST/PGUSER/PGPASSWORD/PGDATABASE (pg_dump tự đọc), BACKUP_KEEP (mặc định 14 bản).
set -eu

KEEP="${BACKUP_KEEP:-14}"
STAMP=$(date -u +%Y-%m-%d_%H-%M-%S)
OUT=/backups

# Ghi ra file tạm rồi đổi tên: không bao giờ để lại bản sao lưu dở dang trông như bản tốt
pg_dump -Fc --no-owner -f "$OUT/db_$STAMP.dump.tmp"
mv "$OUT/db_$STAMP.dump.tmp" "$OUT/db_$STAMP.dump"
if [ -d /uploads ]; then
  tar -czf "$OUT/uploads_$STAMP.tar.gz.tmp" -C /uploads . && mv "$OUT/uploads_$STAMP.tar.gz.tmp" "$OUT/uploads_$STAMP.tar.gz"
fi
echo "[backup] $STAMP UTC: $(du -h "$OUT/db_$STAMP.dump" | cut -f1)"

# Xoay vòng: giữ KEEP bản mới nhất của mỗi loại
for prefix in db uploads; do
  total=$(ls -1 "$OUT"/${prefix}_*.* 2>/dev/null | grep -v '\.tmp$' | wc -l)
  if [ "$total" -gt "$KEEP" ]; then
    ls -1 "$OUT"/${prefix}_*.* | grep -v '\.tmp$' | sort | head -n $((total - KEEP)) | xargs rm -f
  fi
done
