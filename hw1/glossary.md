# 作業一：英文與縮寫名詞對照

作業一各份說明（`hw1-spec.md`、`ns3-hw1.md`、`ns3-guide.md`、`supplement/supplement.md`）中出現的英文名詞與縮寫。「講義」欄標示 repo 裡哪一章的筆記有提到；「—」表示講義筆記沒有，是作業或 ns-3 才用到的名詞。

## 1. 802.11 架構與 MAC

| 名詞 | 英文全名 | 中文 | 意思 | 講義 |
|---|---|---|---|---|
| IEEE 802.11 | Institute of Electrical and Electronics Engineers 802.11 | 無線區域網路標準 | Wi-Fi 的標準；a/b/g/n/ac/ax 是各版修訂 | 2-1 |
| 802.11n | — | — | 2009 年的修訂，又稱 Wi-Fi 4；加入 MIMO、40 MHz、A-MPDU，PHY 叫 HT | 2-1 |
| 802.11e | — | — | 2005 年的 QoS 修訂，加入 EDCA 與 AIFS | 2-4 |
| Wi-Fi | — | — | Wi-Fi Alliance 的認證商標，一般用來指 802.11 網路 | 2-1 |
| AP | Access Point | 存取點 | BSS 的中心，STA 透過它連到其他網路；本作業只當接收端 | 2-1 |
| STA | Station | 站台 | 有 802.11 MAC 與 PHY 的裝置；本作業的 STA 都往 AP 送資料 | 2-1 |
| BSS | Basic Service Set | 基本服務集 | 一個 AP 和連上它的 STA | 2-1 |
| Infrastructure | Infrastructure mode | 基礎架構模式 | 透過 AP 通訊的模式（相對於 ad hoc 直接互傳） | 2-1 |
| ad hoc | — | 隨意網路 | STA 之間不經 AP 直接通訊 | 2-1 |
| mesh | — | 網狀網路 | 多個節點互相轉送封包的網路 | — |
| association | — | 連結 | STA 加入 AP 的程序；完成前不能傳資料，所以模擬 1 s 才開始送 | 2-2 |
| MAC | Medium Access Control | 媒介存取控制 | 決定誰、何時可以用通道的子層 | 2-2 |
| PHY | Physical layer | 實體層 | 調變、編碼、前導碼、無線電收發 | 2-1 |
| QoS | Quality of Service | 服務品質 | 依流量類別給不同優先權 | 2-4 |
| DCF | Distributed Coordination Function | 分散式協調功能 | 802.11 基本的存取方法，即 CSMA/CA | 2-4 |
| CSMA/CA | Carrier Sense Multiple Access with Collision Avoidance | 載波感測多重存取／碰撞避免 | 先聽通道、閒置 DIFS 後隨機退避再送，靠 ACK 確認 | 2-4 |
| EDCA | Enhanced Distributed Channel Access | 增強型分散式通道存取 | 802.11e 的 DCF 加強版：分 4 種存取類別，各用不同 AIFS 與 CW | 2-1、2-2 |
| AC | Access Category | 存取類別 | EDCA 的 4 種流量類別：BK、BE、VI、VO | — |
| BE | Best Effort | 盡力而為 | EDCA 一般資料的類別，ns-3 預設 AIFSN = 3；本作業的流量都走 BE | — |
| IFS | Interframe Space | 訊框間隔 | 兩個訊框之間必須空出的時間，越短越優先 | 2-4 |
| SIFS | Short IFS | 短訊框間隔 | 最短的間隔，給 ACK、CTS、Block Ack；本作業 16 µs | 2-4 |
| PIFS | PCF IFS | PCF 訊框間隔 | SIFS + 1 slot = 25 µs，給 PCF 的 AP 搶通道 | 2-4 |
| DIFS | DCF IFS | DCF 訊框間隔 | SIFS + 2 slot；本作業依講義 p.22 為 34 µs | 2-4 |
| AIFS | Arbitration IFS | 仲裁訊框間隔 | EDCA 用的 DIFS：SIFS + AIFSN × slot | 2-4 |
| AIFSN | AIFS Number | AIFS 的 slot 數 | AIFS 公式裡的 slot 個數；AIFSN = 2 時 AIFS 就等於 DIFS | 2-4 |
| EIFS | Extended IFS | 延伸訊框間隔 | 收到錯誤訊框後改等的較長間隔，避免打斷別人的 ACK | 2-4 |
| PCF | Point Coordination Function | 點協調功能 | AP 輪詢的無競爭存取，本作業沒用到 | 2-4 |
| slot / slot time | — | 時槽 | 退避倒數的時間單位；本作業 9 µs | 2-4 |
| backoff | — | 退避 | 從 [0, CW] 隨機抽一個數 × slot 倒數，倒數到 0 才送 | 2-4 |
| CW | Contention Window | 競爭視窗 | 退避亂數的上限；每次失敗加倍 | 2-4 |
| CW<sub>min</sub> / CW<sub>max</sub> | Minimum / Maximum CW | 最小／最大競爭視窗 | CW 的起始值與上限；本作業 15 與 1023 | 2-4 |
| ACK | Acknowledgement | 確認訊框 | 收到正確訊框後隔 SIFS 回的訊框，沒收到就重傳 | 2-4 |
| Block Ack（BA） | Block Acknowledgement | 區塊確認 | 一次確認一整個 A-MPDU 裡的多個 MPDU | — |
| BAR | Block Ack Request | 區塊確認請求 | 沒收到 Block Ack 時，傳送端用來要求補回 | — |
| RTS | Request To Send | 請求傳送 | 送資料前先送的短訊框，用來預約通道 | 2-4 |
| CTS | Clear To Send | 允許傳送 | 接收端回 RTS 的短訊框；其他站台聽到後設定 NAV | 2-4 |
| RTS/CTS | — | — | 先交換 RTS、CTS 再送資料；碰撞時只浪費短短的 RTS | 2-4 |
| RTS threshold | — | RTS 門檻 | 訊框比門檻長才走 RTS/CTS；本作業開 = 0（全部走）、關 = 999999（都不走） | 2-4 |
| NAV | Network Allocation Vector | 網路配置向量 | 依訊框的 Duration 欄位設定的計時器，倒數完前不搶通道（虛擬載波感測） | 2-4 |
| Duration | Duration/ID field | 持續時間欄位 | MAC 標頭中的欄位，告訴別人這次交換還要佔用多久（µs） | 2-3 |
| hidden terminal / hidden node | — | 隱藏終端 | 兩個 STA 互相聽不到，但都聽得到 AP，容易碰撞；本作業的拓樸沒有 | 2-4 |
| collision | — | 碰撞 | 兩個以上 STA 同時送，接收端無法正確解出 | 1、2-4 |
| retry limit | — | 重傳上限 | 超過次數就丟棄該封包 | 2-4 |

## 2. 訊框與資料單位

| 名詞 | 英文全名 | 中文 | 意思 | 講義 |
|---|---|---|---|---|
| MSDU | MAC Service Data Unit | MAC 服務資料單元 | 上層交給 MAC 的資料（本作業是 IP 封包加 LLC 標頭） | 2-1 |
| MPDU | MAC Protocol Data Unit | MAC 協定資料單元 | MAC 送出的一個訊框 = MAC 標頭 + MSDU + FCS；本作業 1538 B | 2-1 |
| A-MPDU | Aggregate MPDU | 聚合 MPDU | 802.11n 把多個 MPDU 接在一起，用一個前導碼送出，大幅減少額外負擔 | — |
| PSDU | PLCP Service Data Unit | PLCP 服務資料單元 | PHY 收到的 MAC 資料，即 MPDU 或 A-MPDU | 2-1 |
| PPDU | PLCP Protocol Data Unit | PLCP 協定資料單元 | 真正在空中傳的單位 = 前導碼 + PHY 標頭 + PSDU | 2-1 |
| QoS Data（QOSDATA） | — | QoS 資料訊框 | 有 QoS 控制欄位的資料訊框，802.11n 的資料都用這種 | 2-3 |
| FCS | Frame Check Sequence | 訊框檢查序列 | 訊框尾端的 CRC-32，用來檢查錯誤 | 2-3 |
| LLC | Logical Link Control | 邏輯鏈路控制 | MAC 之上的子層，加 8 B 標頭（LLC/SNAP） | 0 |
| payload | — | 酬載 | 訊框或封包裡真正的資料部分；本作業 UDP payload 1472 B | — |
| header | — | 標頭 | 加在資料前面的控制資訊 | — |
| B / bytes / octets | — | 位元組 | 8 bits | — |

## 3. 實體層

| 名詞 | 英文全名 | 中文 | 意思 | 講義 |
|---|---|---|---|---|
| HT | High Throughput | 高輸送量 | 802.11n 的 PHY 名稱 | 2-1 |
| OFDM | Orthogonal Frequency Division Multiplexing | 正交分頻多工 | 把頻寬切成許多子載波同時傳；802.11a/g/n 都用 | 2-1 |
| MIMO | Multiple-Input Multiple-Output | 多輸入多輸出 | 多根天線同時傳多條資料流 | 2-1 |
| SS | Spatial Stream | 空間串流 | MIMO 的一條獨立資料流；本作業 1 條 | 2-1 |
| MCS | Modulation and Coding Scheme | 調變與編碼方式 | 802.11n 用編號（0–31）代表調變、碼率、串流數的組合 | 2-1 |
| HtMcs7 | HT MCS 7 | — | 64-QAM、碼率 5/6、1 條串流；20 MHz 長 GI 下 65 Mbps | 2-1 |
| HtMcs0 | HT MCS 0 | — | BPSK、碼率 1/2；20 MHz 下 6.5 Mbps，本作業送 RTS 用 | 2-1 |
| QAM | Quadrature Amplitude Modulation | 正交振幅調變 | 64-QAM 每個符號帶 6 bits | 2-1 |
| BPSK | Binary Phase Shift Keying | 二元相移鍵控 | 每個符號帶 1 bit，最穩但最慢 | 2-1 |
| code rate | — | 碼率 | 有用資料占傳送位元的比例，5/6 表示每 6 bits 有 5 bits 是資料 | 2-1 |
| GI | Guard Interval | 保護間隔 | OFDM 符號之間的空白，防止多路徑干擾；長 GI 800 ns、短 GI 400 ns | 2-1 |
| PLCP | Physical Layer Convergence Procedure | 實體層匯聚程序 | PHY 加上前導碼與 PHY 標頭的子層；題目的「PLCP Length」就是它佔的時間 | 2-1 |
| preamble | — | 前導碼 | 讓接收端同步、估測通道的已知訊號 | 2-1 |
| HT-mixed（HT-MF） | HT Mixed Format | HT 混合格式 | 前段相容舊 802.11a/g、後段是 HT 欄位的前導格式；本作業 36 µs | — |
| L-STF | Legacy Short Training Field | 傳統短訓練欄位 | 8 µs，偵測訊號、自動增益 | — |
| L-LTF | Legacy Long Training Field | 傳統長訓練欄位 | 8 µs，通道估測；L-STF + L-LTF = 講義 p.22 的 16 µs preamble | — |
| L-SIG | Legacy Signal Field | 傳統信號欄位 | 4 µs，帶速率與長度 | — |
| HT-SIG | HT Signal Field | HT 信號欄位 | 8 µs，帶 MCS、頻寬等 HT 參數 | — |
| HT-STF / HT-LTF | HT Short / Long Training Field | HT 短／長訓練欄位 | 各 4 µs，MIMO 的增益與通道估測 | — |
| Channel Bandwidth | — | 通道頻寬 | 一個通道佔的頻寬；本作業 20 MHz | 2-1 |
| channel 36 | — | 通道 36 | 5 GHz 頻段中心頻率 5180 MHz 的通道 | — |
| channel bonding | — | 頻道聚合 | 把相鄰 20 MHz 合成 40 MHz | 2-2 |
| band | — | 頻段 | 2.4 GHz 或 5 GHz | 2-1 |
| propagation loss | — | 傳播損耗 | 訊號隨距離衰減；本作業用 log-distance 模型 | — |

## 4. 流量、量測與模型

| 名詞 | 英文全名 | 中文 | 意思 |
|---|---|---|---|
| IP | Internet Protocol | 網際網路協定 | 第 3 層；IP 標頭 20 B |
| UDP | User Datagram Protocol | 使用者資料包協定 | 第 4 層，沒有重傳與壅塞控制；本作業的流量 |
| TCP | Transmission Control Protocol | 傳輸控制協定 | 有確認與壅塞控制的第 4 層協定，本作業沒用 |
| uplink | — | 上行 | STA → AP 的方向 |
| throughput | — | 吞吐量 | 單位時間成功收到的資料量（Mbps） |
| goodput | — | 有效吞吐量 | 只算應用層 payload 的 throughput；本作業的 throughput 就是 goodput |
| offered load | — | 提供負載 | 所有 STA 加起來想送的流量 = N<sub>STA</sub> × λ × 1472 × 8 |
| arrival rate（λ） | — | 到達率 | 每個 STA 每秒產生的封包數（packets/s、pkt/s） |
| Poisson | Poisson process | 卜瓦松過程 | 封包間隔為指數分布的隨機到達；平均間隔 1/λ |
| iat | inter-arrival time | 到達間隔 | 程式中產生封包間隔的變數 |
| loss rate | — | 遺失率 | 送出但沒收到的比例 |
| saturation | — | 飽和 | 每個 STA 佇列一直有封包，throughput 不再隨 λ 上升 |
| Mbps | Megabits per second | 百萬位元每秒 | 10<sup>6</sup> bits/s；數值等於每 µs 幾個 bits |
| µs / ms | microsecond / millisecond | 微秒／毫秒 | 10<sup>−6</sup> s／10<sup>−3</sup> s |
| Bianchi model | — | Bianchi 模型 | 2000 年 G. Bianchi 提出的 DCF 飽和 throughput 理論模型 |
| τ | — | 傳送機率 | Bianchi 模型中，某 STA 在一個 slot 開始傳送的機率 |
| p | — | 碰撞機率 | 某 STA 傳送時，至少有另一個 STA 也在傳的機率 |
| P<sub>tr</sub> | probability of transmission | 有人傳送的機率 | 一個 slot 中至少一個 STA 傳送的機率 |
| P<sub>s</sub> | probability of success | 成功機率 | 有人傳送時，剛好只有一個 STA 傳的機率 |
| T<sub>s</sub> | successful transmission time | 成功傳送時間 | 一次成功傳送佔用通道的時間（資料 + SIFS + ACK + DIFS） |
| T<sub>c</sub> | collision time | 碰撞時間 | 一次碰撞浪費的通道時間 |
| σ | — | slot 時間 | Bianchi 公式中的 slot，9 µs |
| W / m | — | — | W = CW<sub>min</sub> + 1；m 是 CW 最多加倍幾次（W × 2<sup>m</sup> − 1 = CW<sub>max</sub>） |
| seed / RNG run | random number generator | 亂數種子／亂數串流編號 | 固定後結果可重現；本作業 seed = 1、run = 1、2、3，取平均 |

## 5. ns-3

| 名詞 | 意思 |
|---|---|
| ns-3 | network simulator 3，開源的離散事件網路模擬器；ns-2 是舊版，兩者不相容 |
| discrete-event simulation | 離散事件模擬：只處理事件發生的時間點，中間直接跳過 |
| Node | 節點，一台裝置的空殼，要再裝 NetDevice、協定與 Application |
| NetDevice | 網路卡；Wi-Fi 是 `WifiNetDevice`（內含 WifiMac、WifiPhy） |
| Channel | 通道，連接多個 NetDevice 的傳輸媒介 |
| Application | 產生或接收流量的程式（如 `PacketSink`） |
| Helper | 輔助類別，一次幫很多節點裝好設備或協定（如 `WifiHelper`） |
| Attribute | 物件的可調參數（如 `RtsCtsThreshold`），可用 Config 或 Helper 設定 |
| Config | 用路徑字串設定或連接所有物件的 Attribute 與 trace |
| trace / TraceSource | 物件在事件發生時呼叫的掛勾，用來收集統計（如 `PhyTxBegin`） |
| Simulator | 模擬器核心：`Schedule` 排事件、`Run` 執行、`Stop` 結束、`Destroy` 釋放 |
| Ptr | ns-3 的智慧指標，自動管理物件生命週期 |
| scratch | ns-3 目錄中放自己程式的資料夾，放進去就會自動編譯 |
| build profile | 建置模式：`debug`（可開 log、較慢）、`optimized`（最快，log 被移除） |
| `./ns3` | ns-3 的建置與執行指令（包 CMake）：`configure`、`build`、`run` |
| YANS | Yet Another Network Simulator，ns-3 簡化的 Wi-Fi 通道與 PHY 模型（`YansWifiChannelHelper`、`YansWifiPhy`） |
| WifiMacHelper | 設定 MAC 類型：AP 用 `ApWifiMac`、STA 用 `StaWifiMac` |
| ConstantRateWifiManager | 固定速率的速率控制器，不會依訊號自動調整 MCS |
| WifiRemoteStationManager | 速率控制器的基底類別，也管 RTS threshold |
| DataMode / ControlMode | 資料訊框／控制訊框用的速率 |
| ChannelSettings | 設定通道的 Attribute：`{通道號碼, 頻寬, 頻段, 主通道}` |
| WifiTxVector | 一次傳送的 PHY 參數（MCS、頻寬、GI、串流數） |
| PSDU map（WifiConstPsduMap） | 一次傳送的 PSDU 集合，trace 回呼的參數 |
| PacketSink | 接收端 Application，統計收到的位元組 |
| Socket | 應用程式送收封包的介面；本作業用 UDP socket |
| MobilityModel | 節點的位置與移動模型；`ConstantPositionMobilityModel` 是固定不動 |
| ListPositionAllocator | 依清單指定每個節點的座標 |
| RngSeedManager | 設定全域亂數 seed 與 run 編號 |
| FlowMonitor | 統計每條流 throughput、延遲、遺失的模組 |
| PCAP | packet capture，封包擷取檔格式，可用 Wireshark 開 |
| NS_LOG / Log | ns-3 的除錯訊息輸出，要 debug 建置才有 |
| NetAnim | ns-3 的動畫顯示工具 |
| PrintHelp / PrintAttributes | 印出命令列參數說明／某類別所有 Attribute |
| CommandLine（`cmd.AddValue`） | 讓程式接受 `--參數=值` 的命令列參數 |

## 6. 工具與環境

| 名詞 | 意思 |
|---|---|
| WSL / WSL2 | Windows Subsystem for Linux，在 Windows 裡跑 Linux（本作業用 Ubuntu） |
| Ubuntu | Linux 發行版 |
| PowerShell | Windows 的命令列 shell |
| Bash / sh | Linux 的命令列 shell；`.sh` 是 shell 腳本 |
| terminal | 終端機，輸入指令的視窗 |
| sudo | 以系統管理員（root）權限執行指令 |
| apt | Ubuntu 的套件管理工具（`apt install`） |
| pip / venv | Python 的套件管理工具／虛擬環境 |
| git / clone / checkout | 版本控制；clone 下載整個 repo，checkout 切換版本 |
| repo | repository，版本控制的專案資料夾 |
| CMake / Ninja | 產生建置設定／實際執行編譯的工具 |
| g++ / C++ | GNU 的 C++ 編譯器／程式語言 |
| gdb | GNU 除錯器 |
| xargs / nproc | 把輸入轉成指令參數並平行執行／查詢 CPU 核心數 |
| Python / pandas / matplotlib | 程式語言／表格資料處理套件／畫圖套件 |
| gnuplot | 指令式畫圖工具；`multiplot` 一張多圖、`smooth unique` 同 x 取平均 |
| CSV | Comma-Separated Values，逗號分隔的表格文字檔 |
| PNG / PDF / PPT（pptx） | 圖檔／文件檔／PowerPoint 簡報檔 |
| Wireshark | 封包分析軟體，可開 PCAP |
| GPLv2 | GNU General Public License 第 2 版，ns-3 的開源授權 |
