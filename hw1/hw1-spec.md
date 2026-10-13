# 作業一：題目與實驗設計（重現用）

這份文件整理作業一的完整題目、實驗設計，以及重現步驟，方便後續討論和重跑。

- 程式碼、安裝步驟與畫圖程式的詳細說明見 [`ns3-hw1.md`](ns3-hw1.md)
- 英文與縮寫名詞的意思見 [`glossary.md`](glossary.md)
- 結果分析報告：Claude 文件「高速網路 作業一：802.11n Throughput 分析」

---

## 1. 題目（原文，出自 `高速網路_作業一.pptx`）

**問題描述**：在 IEEE 802.11n Wi-Fi 網路中，觀察不同負載與競爭程度下的 Throughput。

**系統參數包含：**

1. Channel Bandwidth (20 MHz)
2. SIFS / DIFS、PLCP Length
3. Modulation Coding Scheme (MCS)
4. Minimal Contention Window Size (CW<sub>min</sub>)
5. Data Length (L bytes)
6. Number of STAs
7. Arrival Rate (λ)
8. RTS/CTS

**主要調整參數：**

- STA = 5、20
- Arrival Rate = 200、800 packets/s（每個 STA）
- RTS/CTS（enable / disable）

**分析目標**：繪製 Throughput vs. Arrival Rate，依 STA 數量分組比較，並說明觀察到的變化與現象。

---

## 2. 題目系統參數 → 本實驗的設定

題目列出 8 個系統參數，其中 6–8 是要調整的變數，1–5 固定不變。

| # | 題目參數 | 本實驗設定 | 來源 |
|---|---|---|---|
| 1 | Channel Bandwidth | 20 MHz（5 GHz，通道 36） | `hw1.cc`：`ChannelSettings = {36, 20, BAND_5GHZ, 0}` |
| 2 | SIFS / DIFS | SIFS = 16 µs，slot = 9 µs，DIFS = SIFS + 2 × slot = 16 + 2 × 9 = 34 µs | 題目 PPT 未給數值，依講義 p.22（SIFS 16、Slot 9、DIFS 34 µs）與 p.14（DIFS = SIFS + 2 slots）；`hw1.cc`：`--aifsn=2`（AP 與 STA 都設定） |
| 2 | PLCP Length | HT-mixed preamble，1 條空間串流：L-STF 8 + L-LTF 8 + L-SIG 4 + HT-SIG 8 + HT-STF 4 + HT-LTF 4 = 36 µs | 由 HtMcs7、1 條空間串流決定。講義 p.22 的 PLCP Preamble 16 µs 只含 L-STF + L-LTF（802.11a）；題目指定 802.11n，須再加 L-SIG 與 HT 欄位，所以是 36 µs |
| 3 | MCS | 資料：HtMcs7（64-QAM 5/6，1 條空間串流，長 GI，65 Mbps）；RTS：HtMcs0；ACK、CTS：OFDM 6 Mbps；Block Ack：OFDM 24 Mbps | `hw1.cc`：`ConstantRateWifiManager`，可用 `--mcs` 改 |
| 4 | CW<sub>min</sub> | 15（CW<sub>max</sub> = 1023，EDCA Best Effort） | `hw1.cc`：`--cwMin=15 --cwMax=1023`（AP 與 STA 都設定） |
| 5 | Data Length L | UDP payload 1472 B（IP 封包 1500 B） | `hw1.cc`：`--pktSize`，預設 1472 |
| 6 | Number of STAs | **5、20**（變數） | `--nSta` |
| 7 | Arrival Rate λ | **200、800 packets/s**（變數） | `--rate` |
| 8 | RTS/CTS | **關：threshold = 999999；開：threshold = 0**（變數） | `--rts=0/1` |

`hw1 --printParams=1` 在 association 完成後印出 AP 與 STA 實際生效的值（2026-10-13，AIFSN = 2；`--nSta=5 --rate=200 --rts=0`，所以沒有 RTS/CTS 訊框）：

```text
AP  : SIFS=16us slot=9us PIFS=25us AIFSN=2 DIFS(AIFS_BE)=34us CWmin=15 CWmax=1023 width=20MHz
STA0: SIFS=16us slot=9us PIFS=25us AIFSN=2 DIFS(AIFS_BE)=34us CWmin=15 CWmax=1023 width=20MHz
PLCP preamble+header (HT-MF, 1 SS) = 36us
  A-MPDU(QOSDATA): 6174 B (4 MPDU), HtMcs7, 800us
  CTL_ACK: 14 B (1 MPDU), OfdmRate6Mbps, 44us
  CTL_BACKREQ: 24 B (1 MPDU), OfdmRate24Mbps, 32us
  CTL_BACKRESP: 32 B (1 MPDU), OfdmRate24Mbps, 32us
  QOSDATA: 1538 B (1 MPDU), HtMcs7, 228us
```

開 RTS/CTS 時另有 `CTL_RTS: 20 B, HtMcs0, 64us` 與 `CTL_CTS: 14 B, OfdmRate6Mbps, 44us`（AIFSN = 3 時印出，與 DIFS 無關）。AIFSN = 2 和 ns-3 預設（BE 為 3）不同，所以 `hw1.cc` 明確設定。

### 題目沒規定、由我們自行決定的設定

| 項目 | 設定 | 理由 |
|---|---|---|
| 頻段 | 5 GHz | 講義 p.22 的時序（SIFS 16 µs、slot 9 µs）是 OFDM 5 GHz 的數值；模擬中沒有其他干擾源，頻道號碼不影響結果 |
| 速率控制 | 固定 MCS（`ConstantRateWifiManager`） | 排除速率調整演算法的影響 |
| 聚合 | A-MPDU 開（ns-3 HT 預設） | 802.11n 的預設行為 |
| 拓樸 | AP 在原點，STA 平均分布在半徑 5 m 的圓上 | 所有節點彼此聽得到，沒有 hidden terminal |
| 流量方向 | 只有上行（STA → AP），UDP | 讓所有 STA 一起競爭通道 |
| 到達模型 | Poisson：封包間隔為指數分布，平均 1/λ；每個 STA 的起始時間加 0–10 ms 的隨機偏移 | 對應題目的 arrival rate |
| 通道模型 | `YansWifiChannelHelper::Default()`（Log-distance 傳播損耗） | 5 m 距離下訊號很強，不會因訊號弱而掉包 |
| 時間 | 1 s 開始送、2 s 開始量測、20 s 結束（量測 18 s） | 扣掉 association 和暖機 |
| 重複次數 | 每組 3 個 RNG run（`--run=1,2,3`，seed 固定為 1） | 取平均與標準差 |

---

## 3. 實驗組合

### 必做（題目要求）：2 × 2 × 2 = 8 組

| STA | λ（pkt/s） | 總負載（Mbps） | RTS/CTS |
|---|---|---|---|
| 5 | 200 | 11.8 | 關 / 開 |
| 5 | 800 | 47.1 | 關 / 開 |
| 20 | 200 | 47.1 | 關 / 開 |
| 20 | 800 | 188.4 | 關 / 開 |

總負載公式：

```
Offered load = N_STA × λ × 1472 × 8  (bits/s)
```

5 STA × 800 和 20 STA × 200 的總負載相同（47.1 Mbps），可以用來比較「同負載、不同競爭程度」。

每組跑 3 個 RNG run（`--run=1,2,3`），共 8 × 3 = 24 次，輸出到 `results.csv`。作業範圍完全依題目 PPT；做作業時額外跑的實驗放在 `supplement/`，不放進報告。

---

## 4. 量測定義

全部在 `hw1.cc` 結尾計算，只統計量測期間 [2 s, 20 s]。

| 指標 | 定義 |
|---|---|
| `offered_Mbps` | N<sub>STA</sub> × λ × pktSize × 8 / 10⁶（理論值，不是實際送出量） |
| `throughput_Mbps` | AP 端 `PacketSink` 在量測期間收到的 UDP payload 位元數 ÷ 18 s，也就是應用層 goodput |
| `loss` | 1 − 量測期間收到的封包數 ÷ 量測期間應用層送出的封包數 |

> 注意：`loss` 偶爾會是很小的負值（約 −5 × 10⁻⁵）。原因是 2 s 前送出、2 s 後才到的封包被算進「收到」，但沒算進「送出」。報告中以 0% 呈現即可。

CSV 欄位：`nSta,rate,rts,ampdu,run,offered_Mbps,throughput_Mbps,loss`

---

## 5. 重現步驟

### 環境

| 項目 | 版本 |
|---|---|
| 系統 | Windows + WSL2 Ubuntu 24.04 |
| 模擬器 | ns-3.49 |
| 編譯器 | g++ 13.3 |
| 畫圖 | Python 3 + pandas + matplotlib |

安裝細節見 [`ns3-hw1.md` 第 1 節](ns3-hw1.md#1-環境安裝windows-用-wsl2)。精簡版：

```bash
cd ~
git clone https://gitlab.com/nsnam/ns-3-dev.git
cd ns-3-dev
git checkout ns-3.49
./ns3 configure --build-profile=optimized --enable-modules='wifi;applications;internet;mobility;stats'
./ns3 build
```

### 執行

```bash
# 1. 把本資料夾的檔案放到 ns-3 目錄
cp hw1.cc ~/ns-3-dev/scratch/
cp run_all.sh plot.py ~/ns-3-dev/
cd ~/ns-3-dev

# 2. 先跑一組確認能用
./ns3 run "hw1 --nSta=5 --rate=200 --rts=0"

# 3. 跑全部 8 組 × 3 個 seed（24 次，平行執行）
bash run_all.sh results.csv

# 4. 畫圖
python3 plot.py results.csv throughput_vs_rate.png

# 5. 確認題目參數 2–5 的實際值
./ns3 run "hw1 --nSta=5 --rate=800 --simTime=4 --printParams=1 --out=/tmp/x.csv"
```

`hw1.cc` 的命令列參數：

| 參數 | 預設 | 說明 |
|---|---|---|
| `--nSta` | 5 | STA 數 |
| `--rate` | 200 | 每個 STA 的 arrival rate（packets/s） |
| `--rts` | 0 | 1 = 啟用 RTS/CTS |
| `--ampdu` | 1 | A-MPDU 開關（本實驗維持 ns-3 預設的開） |
| `--pktSize` | 1472 | UDP payload（bytes） |
| `--mcs` | HtMcs7 | 資料速率 |
| `--cwMin`、`--cwMax` | 15、1023 | BE 的競爭視窗（題目參數 4） |
| `--aifsn` | 2 | BE 的 AIFSN，DIFS = SIFS + aifsn × slot（題目參數 2） |
| `--printParams` | 0 | 1 = 印出實際生效的 SIFS、slot、DIFS、CW、PLCP 與各訊框空中時間 |
| `--simTime` | 20 | 模擬結束時間（s） |
| `--run` | 1 | RNG run 編號 |
| `--out` | results.csv | 輸出 CSV（附加寫入） |

> `--out` 是附加寫入，重跑前要先刪掉舊檔，否則資料會重複。`run_all.sh` 每次都會重寫整個輸出檔，不受影響。

### 驗證重現結果

重跑後，3 個 seed 的平均應與下表一致（差距在 1 Mbps 內）。

AIFSN = 2（DIFS 34 µs），2026-10-13 重跑：

| STA | λ | RTS/CTS | 負載（Mbps） | Throughput（Mbps） | 遺失率 |
|---|---|---|---|---|---|
| 5 | 200 | 關 | 11.8 | 11.8 | 0% |
| 5 | 200 | 開 | 11.8 | 11.8 | 0% |
| 5 | 800 | 關 | 47.1 | 46.5 | 1.5% |
| 5 | 800 | 開 | 47.1 | 47.2 | 0% |
| 20 | 200 | 關 | 47.1 | 33.6 | 28.7% |
| 20 | 200 | 開 | 47.1 | 45.6 | 3.0% |
| 20 | 800 | 關 | 188.4 | 35.6 | 81.1% |
| 20 | 800 | 開 | 188.4 | 58.3 | 69.0% |

---

## 6. 檔案對照

| 檔案 | 用途 |
|---|---|
| `hw1.cc` | ns-3 模擬程式（放在 `scratch/`） |
| `run_all.sh` | 平行跑完 8 組 × 3 個 seed 並合併成一個 CSV |
| `plot.py` | Throughput vs. Arrival Rate，依 STA 數分兩張子圖 |
| `results.csv` | 原始模擬數據 |
| `throughput_vs_rate.png` | 結果圖（Throughput vs. Arrival Rate，依 STA 數分組） |
| `ns3-guide.md` | ns-3 功能介紹與基本安裝使用說明 |
| `ns3-hw1.md` | 完整操作教學（安裝、程式碼、畫圖） |
| `TODO.md` | 待辦事項（已全部完成） |
| `supplement/` | 作業範圍外的補充（補點 arrival rate、A-MPDU 對照、理論值對照、可延伸方向），不放進作業報告，說明見 `supplement/supplement.md` |
| `../高速網路_作業一.pptx` | 作業題目 |
