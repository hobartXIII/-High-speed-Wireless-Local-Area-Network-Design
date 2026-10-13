# 作業一：待辦事項

題目的「系統參數」1–8 都要在報告中有明確數值並實際用到；只有 STA 數、Arrival Rate、RTS/CTS 是要掃的變數。~~目前 SIFS/DIFS、PLCP、CW<sub>min</sub> 只靠 ns-3 預設，報告也沒寫出來。~~ 已處理（2026-10-13）：`hw1.cc` 明確設定並可用 `--printParams=1` 印出，報告第 2 節補齊 8 項參數。

- [x] **確認實際參數值**：在 `hw1.cc` 明確設定或印出 SIFS、slot、AIFSN（DIFS）、CW<sub>min</sub>/CW<sub>max</sub>、PLCP preamble 長度，核對 `hw1-spec.md` 第 2 節的數值（SIFS 16 µs、DIFS 43 µs、PLCP 36 µs、CW<sub>min</sub> 15）。需要 WSL 的 ns-3 環境。
- [x] **報告參數表補齊題目 8 項**：在 Claude 文件「高速網路 作業一：802.11n Throughput 分析」第 2 節，補上 SIFS/DIFS、PLCP Length、CW<sub>min</sub> 的數值，並對應題目的編號。
- [x] ~~**理論值對照**~~（2026-10-13 依題目 PPT 範圍移出作業，改放 `supplement/`）：用題目參數算理論飽和 throughput（單一 STA 無碰撞上限 + Bianchi 模型的碰撞機率），和模擬的飽和值（5 STA 約 48、20 STA 約 36、開 RTS/CTS 約 58 Mbps）比對，寫進報告。
- [x] **修正 `hw1-spec.md` 第 6 節**：「題目參數 2、4、5 尚未當成變數掃過」改成「固定並寫清楚」，掃描改列為選做延伸。

- [ ] **DIFS 改依講義重跑**（2026-10-13）：題目 PPT 沒給 SIFS/DIFS 數值，依講義 p.22 用 DIFS 34 µs（AIFSN = 2，原本 3 → 43 µs）。`hw1.cc` 預設已改，需在有 ns-3 的環境：
  1. `--printParams=1` 確認印出 `AIFSN=2 DIFS(AIFS_BE)=34us`，更新 `hw1-spec.md` 第 2 節的輸出。
  2. `bash run_all.sh results.csv` 重跑 24 次、`plot.py` 重畫 `throughput_vs_rate.png`。
  3. 更新 `hw1-spec.md` 第 5 節「驗證重現結果」表、Claude 文件報告的參數表（DIFS、PLCP 註明與講義的差別）與結果數字、`HW1_report.pdf`。
- [ ] **報告排版改成「結論摘要 → 參數 → 設計 → 結果與分析」**（2026-10-13 討論）：Claude 文件報告最前面放 3–5 行結論（三個變數的影響與關鍵數字）；參數表與實驗設計精簡；結果依題目要回答的現象分小節，每節「現象 → 數據 → 用參數或機制解釋」，解釋要回頭用到第 2 節的參數（例如 DIFS、CW<sub>min</sub>、RTS/CTS 的 T<sub>c</sub>）。重跑完數據再一起改。
- [ ] **報告名詞說明**：報告用到的英文縮寫首次出現時寫全名或中文，意思可參考 `glossary.md`。
- [ ] **重跑後更新補充的理論值**：`supplement/theory.py` 的 `AIFSN` 改成 2，用 `supplement/results_all_rates.csv`、`results_noampdu.csv` 的新數據（也要用 `--aifsn=2` 重跑）更新 `supplement.md` 3.3 節的表，3.4 節改成實測值。補充不在繳交範圍，有空再做。
- [ ] **檢查 `hw1-ns3.html` 第 7 節**：在瀏覽器確認名詞表能展開、右側目錄有出現第 7 節、手機寬度表格不會溢出。
- [ ] **決定 `ch2-4-80211-dcf.html` 第 451 行要不要還原**：那句講義筆記的補充原本寫「作業一的 DIFS 43 µs 其實是 11e 的 AIFS」，2026-10-13 改成「作業一依講義用 DIFS 34 µs」。

## 範圍

報告與程式以題目 PPT 為準（2026-10-13）：只做 STA 5、20 × λ 200、800 × RTS/CTS 開關，不另加 arrival rate、A-MPDU 對照、理論值對照或 hidden terminal 實驗。這些延伸內容整理在 `supplement/supplement.md`，作業報告不呈現。
