# 作業一：待辦事項

題目的「系統參數」1–8 都要在報告中有明確數值並實際用到；只有 STA 數、Arrival Rate、RTS/CTS 是要掃的變數。~~目前 SIFS/DIFS、PLCP、CW<sub>min</sub> 只靠 ns-3 預設，報告也沒寫出來。~~ 已處理（2026-10-13）：`hw1.cc` 明確設定並可用 `--printParams=1` 印出，報告第 2 節補齊 8 項參數。

- [x] **確認實際參數值**：在 `hw1.cc` 明確設定或印出 SIFS、slot、AIFSN（DIFS）、CW<sub>min</sub>/CW<sub>max</sub>、PLCP preamble 長度，核對 `hw1-spec.md` 第 2 節的數值（SIFS 16 µs、DIFS 43 µs、PLCP 36 µs、CW<sub>min</sub> 15）。需要 WSL 的 ns-3 環境。
- [x] **報告參數表補齊題目 8 項**：在 Claude 文件「高速網路 作業一：802.11n Throughput 分析」第 2 節，補上 SIFS/DIFS、PLCP Length、CW<sub>min</sub> 的數值，並對應題目的編號。
- [x] ~~**理論值對照**~~（2026-10-13 依題目 PPT 範圍移出作業，改放 `supplement/`）：用題目參數算理論飽和 throughput（單一 STA 無碰撞上限 + Bianchi 模型的碰撞機率），和模擬的飽和值（5 STA 約 48、20 STA 約 36、開 RTS/CTS 約 58 Mbps）比對，寫進報告。
- [x] **修正 `hw1-spec.md` 第 6 節**：「題目參數 2、4、5 尚未當成變數掃過」改成「固定並寫清楚」，掃描改列為選做延伸。

## 範圍

報告與程式以題目 PPT 為準（2026-10-13）：只做 STA 5、20 × λ 200、800 × RTS/CTS 開關，不另加 arrival rate、A-MPDU 對照、理論值對照或 hidden terminal 實驗。這些延伸內容整理在 `supplement/supplement.md`，作業報告不呈現。
