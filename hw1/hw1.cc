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
    uint32_t aifsn = 2;      // DIFS = SIFS + aifsn × slot = 34 µs（講義 p.22）
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
