#!/bin/bash
# 在 ~/ns-3-dev/ 下執行：bash run_all.sh [輸出檔] [額外參數]
# 例：bash run_all.sh results.csv
# 每組參數寫到各自的暫存 CSV，用 xargs 平行跑，最後合併成一個檔
OUT=${1:-results.csv}
EXTRA=${2:-}
TMP=$(mktemp -d)
./ns3 build || exit 1
for n in 5 20; do
  for r in 200 800; do
    for rts in 0 1; do
      for run in 1 2 3; do
        echo "--nSta=$n --rate=$r --rts=$rts --run=$run $EXTRA --out=$TMP/$n-$r-$rts-$run.csv"
      done
    done
  done
done | xargs -P "$(nproc)" -I{} sh -c './ns3 run --no-build "hw1 {}" | tail -1'
head -1 "$(ls $TMP/*.csv | head -1)" > "$OUT"
for f in $TMP/*.csv; do tail -n +2 "$f"; done >> "$OUT"
rm -rf "$TMP"
echo "done -> $OUT ($(($(wc -l < "$OUT") - 1)) rows)"
