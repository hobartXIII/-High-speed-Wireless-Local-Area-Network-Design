# 作業一：802.11n Throughput vs. Arrival Rate（ns-3 實作）

## 0. 題目與實驗設計

| 參數 | 值 |
|---|---|
| STA 數 | 5、20 |
| Arrival Rate（每個 STA） | 200、800 packets/s |
| RTS/CTS | 關（threshold = 999999）／開（threshold = 0） |

必跑組合是 2 × 2 × 2 = 8 組，每組用 3 個 random seed 跑完後取平均。

**自訂的固定設定**（題目沒規定，報告裡要寫出來）：

| 項目 | 設定 | 理由 |
|---|---|---|
| 標準／頻段 | 802.11n、5 GHz、20 MHz、通道 36 | 5 GHz 干擾少，20 MHz 是最基本設定 |
| 速率 | 固定 HtMcs7（65 Mbps，1 條串流、長 GI） | 排除速率調整演算法的影響 |
| 封包大小 | UDP payload 1472 B（IP 封包 1500 B） | 對齊 Ethernet MTU |
| 流量模型 | Poisson 到達（封包間隔為指數分布，平均 1/λ） | 對應題目「arrival rate」 |
| 拓樸 | AP 在原點，STA 平均分布在半徑 5 m 的圓上 | 每台都聽得到彼此，沒有 hidden terminal |
| 方向 | 只有上行（STA → AP） | 所有 STA 一起搶通道 |
| A-MPDU | 預設開（ns-3 的 HT 預設） | 802.11n 的主要特色之一 |
| 時間 | 1 s 開始送、2 s 開始量、20 s 結束 | 扣掉 association 和暖機 |

每組負載換算（1500 B）：

| | 200 pkt/s | 800 pkt/s |
|---|---|---|
| 5 STA | 12 Mbps | 48 Mbps |
| 20 STA | 48 Mbps | 192 Mbps |

---

## 1. 環境安裝（Windows 用 WSL2）

ns-3 不支援原生 Windows，所以要在 WSL2 的 Ubuntu 裡跑。

```powershell
# PowerShell（系統管理員）
wsl --install -d Ubuntu
```

```bash
# Ubuntu 內
sudo apt update
sudo apt install -y g++ cmake ninja-build python3 python3-pip git
pip3 install pandas matplotlib          # 畫圖用；若遇 externally-managed 錯誤改用 sudo apt install python3-pandas python3-matplotlib

cd ~
git clone https://gitlab.com/nsnam/ns-3-dev.git
cd ns-3-dev
git checkout $(git tag -l 'ns-3.4*' | sort -V | tail -1)   # 切到最新的正式版
./ns3 configure --build-profile=optimized
./ns3 build
```

> 實際安裝版本：ns-3.49（Ubuntu 24.04、g++ 13.3），只啟用作業需要的模組：
> `./ns3 configure --build-profile=optimized --enable-modules='wifi;applications;internet;mobility;stats'`
> 如果 sudo 要密碼又不想輸入，可以在 PowerShell 用 `wsl -d Ubuntu -u root apt-get install ...` 以 root 安裝。

---

## 2. 模擬程式 `scratch/hw1.cc`

把下面的程式存成 `~/ns-3-dev/scratch/hw1.cc`。

```cpp
#include "ns3/applications-module.h"
#include "ns3/core-module.h"
#include "ns3/internet-module.h"
#include "ns3/mobility-module.h"
#include "ns3/network-module.h"
#include "ns3/wifi-module.h"

#include <cmath>
#include <fstream>
#include <map>

using namespace ns3;

NS_LOG_COMPONENT_DEFINE("Hw1");

static uint64_t g_txPkts = 0;

// Poisson 到達：送一個封包後，隔指數分布的時間再送下一個
static void
PoissonSend(Ptr<Socket> sock, uint32_t size, Ptr<ExponentialRandomVariable> iat, Time stop)
{
    if (Simulator::Now() >= stop)
    {
        return;
    }
    sock->Send(Create<Packet>(size));
    g_txPkts++;
    Simulator::Schedule(Seconds(iat->GetValue()), &PoissonSend, sock, size, iat, stop);
}

// --printParams：記錄每種訊框最大的一個的大小、速率與空中時間
struct FrameInfo
{
    uint32_t size;
    uint32_t nMpdus;
    std::string mode;
    Time duration;
};

static std::map<std::string, FrameInfo> g_frames;

static void
PhyTxBegin(WifiConstPsduMap psduMap, WifiTxVector txVector, double /* txPowerW */)
{
    for (const auto& [staId, psdu] : psduMap)
    {
        std::string type = psdu->GetHeader(0).GetTypeString();
        if (psdu->GetNMpdus() > 1)
        {
            type = "A-MPDU(" + type + ")";
        }
        if (g_frames.count(type) == 0 || psdu->GetSize() > g_frames[type].size)
        {
            g_frames[type] = {psdu->GetSize(),
                              static_cast<uint32_t>(psdu->GetNMpdus()),
                              txVector.GetMode().GetUniqueName(),
                              WifiPhy::CalculateTxDuration(psdu->GetSize(),
                                                           txVector,
                                                           WIFI_PHY_BAND_5GHZ)};
        }
    }
}

// 印出實際生效的 PHY／MAC 參數（題目系統參數 1–5）
static void
PrintParams(Ptr<WifiNetDevice> dev, const std::string& name)
{
    Ptr<WifiPhy> phy = dev->GetPhy();
    Ptr<QosTxop> be = dev->GetMac()->GetQosTxop(AC_BE);
    Time sifs = phy->GetSifs();
    Time slot = phy->GetSlot();
    uint8_t aifsn = be->GetAifsn(0);
    std::cout << name << ": SIFS=" << sifs.GetMicroSeconds() << "us slot=" << slot.GetMicroSeconds()
              << "us PIFS=" << phy->GetPifs().GetMicroSeconds() << "us AIFSN=" << +aifsn
              << " DIFS(AIFS_BE)=" << (sifs + aifsn * slot).GetMicroSeconds()
              << "us CWmin=" << be->GetMinCw(0) << " CWmax=" << be->GetMaxCw(0)
              << " width=" << phy->GetChannelWidth() << "MHz" << std::endl;
}

int
main(int argc, char* argv[])
{
    uint32_t nSta = 5;
    double rate = 200;       // packets/s per STA
    bool rts = false;
    bool ampdu = true;
    uint32_t pktSize = 1472; // UDP payload (bytes)
    std::string mcs = "HtMcs7";
    uint32_t cwMin = 15;     // 題目參數 4
    uint32_t cwMax = 1023;
    uint32_t aifsn = 3;      // DIFS(AIFS_BE) = SIFS + aifsn × slot
    bool printParams = false;
    double startTime = 1.0;
    double warmup = 2.0;
    double simTime = 20.0;
    uint32_t run = 1;
    std::string out = "results.csv";

    CommandLine cmd(__FILE__);
    cmd.AddValue("nSta", "Number of STAs", nSta);
    cmd.AddValue("rate", "Arrival rate per STA (packets/s)", rate);
    cmd.AddValue("rts", "Enable RTS/CTS", rts);
    cmd.AddValue("ampdu", "Enable A-MPDU aggregation", ampdu);
    cmd.AddValue("pktSize", "UDP payload size (bytes)", pktSize);
    cmd.AddValue("mcs", "HT MCS (e.g. HtMcs7)", mcs);
    cmd.AddValue("cwMin", "Minimum contention window (BE)", cwMin);
    cmd.AddValue("cwMax", "Maximum contention window (BE)", cwMax);
    cmd.AddValue("aifsn", "AIFSN of BE (DIFS = SIFS + aifsn * slot)", aifsn);
    cmd.AddValue("printParams", "Print effective PHY/MAC parameters and frame airtimes", printParams);
    cmd.AddValue("simTime", "Simulation end time (s)", simTime);
    cmd.AddValue("run", "RNG run number", run);
    cmd.AddValue("out", "Output CSV file", out);
    cmd.Parse(argc, argv);

    RngSeedManager::SetSeed(1);
    RngSeedManager::SetRun(run);

    NodeContainer apNode;
    apNode.Create(1);
    NodeContainer staNodes;
    staNodes.Create(nSta);

    // PHY / Channel
    YansWifiChannelHelper channel = YansWifiChannelHelper::Default();
    YansWifiPhyHelper phy;
    phy.SetChannel(channel.Create());
    phy.Set("ChannelSettings", StringValue("{36, 20, BAND_5GHZ, 0}"));

    // 802.11n，固定速率；RtsCtsThreshold = 0 表示每個訊框都先送 RTS
    WifiHelper wifi;
    wifi.SetStandard(WIFI_STANDARD_80211n);
    wifi.SetRemoteStationManager("ns3::ConstantRateWifiManager",
                                 "DataMode", StringValue(mcs),
                                 "ControlMode", StringValue("HtMcs0"),
                                 "RtsCtsThreshold", UintegerValue(rts ? 0 : 999999));

    WifiMacHelper mac;
    Ssid ssid("hw1");
    mac.SetType("ns3::StaWifiMac", "Ssid", SsidValue(ssid));
    NetDeviceContainer staDevs = wifi.Install(phy, mac, staNodes);
    mac.SetType("ns3::ApWifiMac", "Ssid", SsidValue(ssid));
    NetDeviceContainer apDev = wifi.Install(phy, mac, apNode);

    if (!ampdu)
    {
        Config::Set("/NodeList/*/DeviceList/*/$ns3::WifiNetDevice/Mac/BE_MaxAmpduSize",
                    UintegerValue(0));
    }

    // 明確設定 BE 的 EDCA 參數（題目參數 2、4）；AP 也設定，association 時 AP 會把同一組值通告給 STA
    NetDeviceContainer allDevs(apDev, staDevs);
    for (uint32_t i = 0; i < allDevs.GetN(); i++)
    {
        Ptr<QosTxop> be = DynamicCast<WifiNetDevice>(allDevs.Get(i))->GetMac()->GetQosTxop(AC_BE);
        be->SetMinCw(cwMin, 0);
        be->SetMaxCw(cwMax, 0);
        be->SetAifsn(aifsn, 0);
    }

    // 拓樸：AP 在原點，STA 平均分布在半徑 5 m 的圓上
    MobilityHelper mobility;
    Ptr<ListPositionAllocator> pos = CreateObject<ListPositionAllocator>();
    pos->Add(Vector(0, 0, 0));
    for (uint32_t i = 0; i < nSta; i++)
    {
        double th = 2 * M_PI * i / nSta;
        pos->Add(Vector(5 * std::cos(th), 5 * std::sin(th), 0));
    }
    mobility.SetPositionAllocator(pos);
    mobility.SetMobilityModel("ns3::ConstantPositionMobilityModel");
    mobility.Install(apNode);
    mobility.Install(staNodes);

    // IP
    InternetStackHelper stack;
    stack.Install(apNode);
    stack.Install(staNodes);
    Ipv4AddressHelper addr;
    addr.SetBase("10.1.1.0", "255.255.255.0");
    Ipv4InterfaceContainer apIf = addr.Assign(apDev);
    addr.Assign(staDevs);

    // AP 上的 UDP sink
    uint16_t port = 9;
    PacketSinkHelper sinkHelper("ns3::UdpSocketFactory",
                                InetSocketAddress(Ipv4Address::GetAny(), port));
    ApplicationContainer sinkApp = sinkHelper.Install(apNode.Get(0));
    sinkApp.Start(Seconds(0));
    Ptr<PacketSink> sink = DynamicCast<PacketSink>(sinkApp.Get(0));

    // 每個 STA 一個 Poisson 來源
    Time stop = Seconds(simTime);
    Ptr<UniformRandomVariable> jitter = CreateObject<UniformRandomVariable>();
    for (uint32_t i = 0; i < nSta; i++)
    {
        Ptr<Socket> s = Socket::CreateSocket(staNodes.Get(i), UdpSocketFactory::GetTypeId());
        s->Connect(InetSocketAddress(apIf.GetAddress(0), port));
        Ptr<ExponentialRandomVariable> iat = CreateObject<ExponentialRandomVariable>();
        iat->SetAttribute("Mean", DoubleValue(1.0 / rate));
        Simulator::Schedule(Seconds(startTime + jitter->GetValue(0, 0.01)),
                            &PoissonSend, s, pktSize, iat, stop);
    }

    // 暖機結束時記下計數，只統計 [warmup, simTime] 這段
    uint64_t rxAtWarmup = 0;
    uint64_t txAtWarmup = 0;
    Simulator::Schedule(Seconds(warmup), [&]() {
        rxAtWarmup = sink->GetTotalRx();
        txAtWarmup = g_txPkts;
    });

    if (printParams)
    {
        // 暖機結束時 association 已完成，印出的是實際生效的值
        Simulator::Schedule(Seconds(warmup), [&]() {
            PrintParams(DynamicCast<WifiNetDevice>(apDev.Get(0)), "AP  ");
            PrintParams(DynamicCast<WifiNetDevice>(staDevs.Get(0)), "STA0");
        });
        Config::ConnectWithoutContext(
            "/NodeList/*/DeviceList/*/$ns3::WifiNetDevice/Phy/PhyTxPsduBegin",
            MakeCallback(&PhyTxBegin));
    }

    Simulator::Stop(Seconds(simTime));
    Simulator::Run();

    double dur = simTime - warmup;
    uint64_t rxBytes = sink->GetTotalRx() - rxAtWarmup;
    double throughput = rxBytes * 8.0 / dur / 1e6;
    double offered = nSta * rate * pktSize * 8.0 / 1e6;
    double txPkts = static_cast<double>(g_txPkts - txAtWarmup);
    double loss = txPkts > 0 ? 1.0 - (rxBytes / pktSize) / txPkts : 0.0;

    std::ifstream test(out);
    bool newFile = !test.good() || test.peek() == std::ifstream::traits_type::eof();
    test.close();
    std::ofstream f(out, std::ios::app);
    if (newFile)
    {
        f << "nSta,rate,rts,ampdu,run,offered_Mbps,throughput_Mbps,loss\n";
    }
    f << nSta << "," << rate << "," << rts << "," << ampdu << "," << run << ","
      << offered << "," << throughput << "," << loss << "\n";

    std::cout << "nSta=" << nSta << " rate=" << rate << " rts=" << rts
              << " offered=" << offered << " Mbps  throughput=" << throughput
              << " Mbps  loss=" << loss << std::endl;

    if (printParams)
    {
        WifiTxVector tv;
        tv.SetMode(HtPhy::GetHtMcs7());
        tv.SetPreambleType(WIFI_PREAMBLE_HT_MF);
        tv.SetChannelWidth(MHz_u{20});
        tv.SetGuardInterval(NanoSeconds(800));
        tv.SetNss(1);
        std::cout << "PLCP preamble+header (HT-MF, 1 SS) = "
                  << WifiPhy::CalculatePhyPreambleAndHeaderDuration(tv).GetMicroSeconds() << "us"
                  << std::endl;
        for (const auto& [type, info] : g_frames)
        {
            std::cout << "  " << type << ": " << info.size << " B (" << info.nMpdus << " MPDU), "
                      << info.mode << ", "
                      << info.duration.GetMicroSeconds() << "us" << std::endl;
        }
    }

    Simulator::Destroy();
    return 0;
}
```

先跑一組確認能用：

```bash
cd ~/ns-3-dev
./ns3 build
./ns3 run "hw1 --nSta=5 --rate=200 --rts=0"
```

印出實際生效的 SIFS、slot、DIFS、CW 與各訊框空中時間（題目系統參數 2–5）：

```bash
./ns3 run "hw1 --nSta=5 --rate=800 --simTime=4 --printParams=1 --out=/tmp/x.csv"
```

**Throughput 的定義**：AP 的 sink 在量測期間收到的 UDP payload bits 除以量測時間，也就是應用層的 goodput（Mbps）。

---

## 3. 批次執行 `run_all.sh`

```bash
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
```

共 8 組 × 3 個 seed = 24 次，平行執行約半分鐘。

---

## 4. 畫圖

### ns-3 有沒有內建畫圖？

ns-3 有，但功能有限：

- **`ns3::Gnuplot` 類別**（stats 模組）：在 C++ 裡呼叫 `Gnuplot2dDataset::Add(x, y)`，程式會輸出 `.plt` 檔，再用系統裝的 gnuplot 轉成 png（`sudo apt install gnuplot`）。它只能處理同一次執行裡的資料。這份作業的每個點都來自不同次執行（不同 STA 數、rate、RTS 設定，還要取多個 seed 的平均），用它反而麻煩。
- **NetAnim**：只做封包流動的動畫，不能畫數據圖。
- **FlowMonitor**：只輸出統計數據（XML），不畫圖。

所以一般做法是 ns-3 只負責輸出 CSV，再用 Python matplotlib 或 gnuplot 畫圖，下面用的就是這種做法。

### `plot.py`（matplotlib）

```python
import sys

import pandas as pd
import matplotlib.pyplot as plt

src = sys.argv[1] if len(sys.argv) > 1 else "results.csv"
dst = sys.argv[2] if len(sys.argv) > 2 else "throughput_vs_rate.png"
df = pd.read_csv(src)
g = (df.groupby(["nSta", "rate", "rts"])
       .agg(thr=("throughput_Mbps", "mean"),
            std=("throughput_Mbps", "std"),
            offered=("offered_Mbps", "mean"))
       .reset_index())

stas = sorted(g.nSta.unique())
fig, axes = plt.subplots(1, len(stas), figsize=(6 * len(stas), 4.5), sharey=True)
for ax, n in zip(axes, stas):
    sub = g[g.nSta == n]
    for rts, label, m in [(0, "RTS/CTS off", "o-"), (1, "RTS/CTS on", "s-")]:
        d = sub[sub.rts == rts].sort_values("rate")
        ax.errorbar(d.rate, d.thr, yerr=d["std"], fmt=m, capsize=3, label=label)
    d = sub[sub.rts == 0].sort_values("rate")
    ax.plot(d.rate, d.offered, "k--", alpha=0.4, label="Offered load")
    ax.set_title(f"STA = {n}")
    ax.set_xlabel("Arrival rate per STA (packets/s)")
    ax.set_xticks(sorted(sub.rate.unique()))
    ax.grid(alpha=0.3)
    ax.legend()
axes[0].set_ylabel("Throughput (Mbps)")
ax_max = g.thr.max() * 1.3
for ax in axes:
    ax.set_ylim(0, ax_max)
plt.tight_layout()
plt.savefig(dst, dpi=200)
print(g.to_string(index=False))
```

```bash
python3 plot.py                                         # 讀 results.csv → throughput_vs_rate.png
```

### 若想用 gnuplot（不寫 Python）

```gnuplot
set datafile separator ","
set terminal pngcairo size 1200,450
set output "throughput_vs_rate.png"
set multiplot layout 1,2
do for [n in "5 20"] {
  set title "STA = ".n
  set xlabel "Arrival rate per STA (packets/s)"; set ylabel "Throughput (Mbps)"
  plot "results.csv" using ($1==n && $3==0 ? $2 : 1/0):7 smooth unique w lp t "RTS off", \
       "results.csv" using ($1==n && $3==1 ? $2 : 1/0):7 smooth unique w lp t "RTS on"
}
unset multiplot
```

`smooth unique` 會把同一個 x 的多個 seed 結果自動取平均。

---

## 5. 報告要回答的現象（拿模擬結果對照）

1. **未飽和區**：Throughput 約等於負載（曲線貼著虛線）。預期 5 STA 的 200、800 pkt/s 都落在這區。
2. **飽和**：Throughput 不再隨 rate 上升，loss 變大。預期 20 STA 在 200 pkt/s 就已飽和。
3. **STA 數的影響**：同樣的總負載下（5×800 和 20×200 都是 48 Mbps），20 STA 的 throughput 比較低。原因是競爭者多、碰撞機率上升，退避浪費的時間變多（DCF / Bianchi 模型）。
4. **RTS/CTS**：
   - 低負載：多了 RTS/CTS/SIFS 的開銷，開了 throughput 略降。
   - 高競爭加上長訊框（A-MPDU）：碰撞只會撞掉短的 RTS，不會浪費整個長訊框，所以開了可能持平甚至比較好。
   - 這份拓樸沒有 hidden terminal，RTS/CTS 主要的好處沒有發揮出來，報告裡可以點出這一點。
