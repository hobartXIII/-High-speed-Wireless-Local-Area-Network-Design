// 考古題、練習題的「小抄卡片＋筆記章節」註記。
// 題目資料用 k（例如 'K2 K4'，也可寫小抄區塊 '③'）與 sec（例如 ['ch2-4#dcf', 'ch3#edca']，# 前可用章節代號）。
// SECS 由 tools/build-exam-refs.js 從各章 HTML 產生，不要手改。
(function (root) {
  /* SECS:BEGIN */
  const SECS = {"ch0-lan":{"label":"CH0","ids":{"outline":[0,"課程大綱（講義 Outline）"],"orgs":[1,"標準組織與分工"],"def":[2,"LAN 定義與範圍"],"req":[3,"LAN 的基本需求"],"comp":[4,"LAN 組成"],"topo":[5,"網路拓樸"],"osi":[6,"OSI 七層"],"encap":[7,"協定的基本功能"],"ieee802":[8,"IEEE 802 標準家族"],"others":[9,"其他非 IEEE 802 的無線 LAN"],"glossary":[10,"專有名詞對照"],"check":[11,"考前自我檢查"]}},"ch1-csma-cd":{"label":"CH1","ids":{"std":[1,"標準依據"],"arch":[2,"IEEE 802.3 架構"],"protocol":[3,"CSMA/CD 協定的五個概念"],"window":[4,"碰撞偵測視窗 = 2a"],"collision":[5,"碰撞處理與 BEBA"],"frame":[6,"IEEE 802.3 訊框格式"],"flow":[7,"傳送與接收流程"],"config":[8,"網路配置限制（10BASE5）"],"phy":[9,"實體層選項比較"],"manchester":[10,"Manchester 編碼"],"modern":[11,"現代乙太網路：演進、Hub 與 Switch"],"calc":[12,"公式拆解與範例計算"],"glossary":[13,"專有名詞對照"],"check":[14,"考前自我檢查"]}},"ch2-1-80211-phy":{"label":"CH2-1","ids":{"outline":[0,"本章大綱（講義）"],"evolution":[1,"802.11 PHY 演進"],"unique":[2,"無線環境的特殊性"],"req":[3,"設計需求（講義）"],"overview":[4,"架構總覽"],"entities":[5,"802.11 協定實體"],"configs":[6,"三種網路配置"],"ds":[7,"Distribution System（DS）"],"ap":[8,"Access Point"],"mac":[9,"MAC 服務與功能"],"phy-svc":[10,"PHY 層服務"],"four-phy":[11,"四種 PHY"],"bands":[12,"免執照頻段"],"dsss":[13,"DSSS 實體層規格"],"channels":[14,"DSSS 頻道規劃（2.4GHz）"],"plcp":[15,"802.11b PLCP 訊框格式"],"modulation":[16,"調變基礎"],"home-ap":[17,"家用 AP 技術與天線"],"calc":[18,"公式拆解與範例計算"],"glossary":[19,"專有名詞對照"],"check":[20,"考前自我檢查"]}},"ch2-2-80211-mac":{"label":"CH2-2","ids":{"std":[1,"標準依據"],"diff":[2,"無線 LAN 與有線 LAN 的主要差異（p.2–3）"],"char":[3,"802.11 WLAN 特性（p.4）"],"amend":[4,"修訂版與其依據內容（p.5–8）"],"components":[5,"802.11 架構元件（p.9–13）"],"spatial":[6,"BSS 的空間關係（p.14–15）"],"portal":[7,"與有線 LAN 整合：Portal 與 Bridge（p.16–17）"],"services":[8,"邏輯服務介面（p.18–19、21）"],"address":[9,"多重邏輯位址空間（p.20）"],"distribution":[10,"DS 內的訊息分送（p.22–23）"],"mobility":[11,"移動性類型與漫遊（p.24）"],"assoc":[12,"Association 三兄弟（必考比較）（p.25–27）"],"access":[13,"存取與機密性控制（p.28–29）"],"auth":[14,"認證服務（Authentication）（p.30–32）"],"glossary":[15,"專有名詞對照"],"check":[16,"考前自我檢查"]}},"ch2-3-80211-frame":{"label":"CH2-3","ids":{"std":[1,"標準依據"],"wep":[2,"隱私與存取控制：WEP（p.1–2）"],"privacy":[3,"隱私服務（p.3–4）"],"states":[4,"站台狀態與訊框類別（p.5–9）"],"ibss":[5,"ESS 與 IBSS 的差異（p.10）"],"format":[6,"MAC 訊框格式（p.11–13）"],"fc":[7,"Frame Control 各欄位（p.12、14–15）"],"duration":[8,"Duration/ID 欄位（p.15–16）"],"addr":[9,"位址欄位（p.13、17、21）"],"frag":[10,"Sequence Control 與分段（p.17）"],"control":[11,"控制訊框格式（p.18–20）"],"data":[12,"資料訊框（p.21、23）"],"exchange":[13,"訊框交換順序（p.24）"],"mgmt":[14,"管理訊框（p.25–27）"],"cap":[15,"能力資訊欄位（p.28–31）"],"agility":[16,"頻道敏捷 Channel Agility（p.31–33）"],"calc":[17,"公式與計算"],"confuse":[18,"易混淆處"],"review":[19,"複習問題"],"recap":[20,"一頁速記"],"glossary":[21,"專有名詞對照"],"check":[22,"考前自我檢查"]}},"ch2-4-80211-dcf":{"label":"CH2-4","ids":{"std":[1,"標準依據"],"ie":[2,"資訊元素（p.1–4）"],"erp":[3,"ERP 資訊元素與保護機制（p.5）"],"arch":[4,"MAC 架構：DCF 與 PCF（p.6–8）"],"dcf":[5,"DCF 的功能（p.9–11）"],"ifs":[6,"訊框間隔 IFS（p.13–15）"],"backoff":[7,"隨機退避與二元指數退避（p.16–17）"],"basic":[8,"基本存取協定（p.19–21）"],"overhead":[9,"DCF 的缺點：額外負擔（p.22–23）"],"hidden":[10,"Hidden Node 與 RTS/CTS（p.24–26）"],"proc":[11,"DCF 存取程序（p.27–28）"],"frag":[12,"分段（p.29–33）"],"defrag":[13,"重組（p.34）"],"bcast":[14,"廣播與群播（p.35）"],"calc":[15,"公式與計算"],"confuse":[16,"易混淆處"],"review":[17,"複習問題"],"recap":[18,"一頁速記"],"glossary":[19,"專有名詞對照"],"check":[20,"考前自我檢查"]}},"ch2-5-80211-pcf-mgmt":{"label":"CH2-5","ids":{"std":[1,"標準依據"],"pcf":[2,"PCF 概觀（p.1–3）"],"burst":[3,"PCF Burst（p.4）"],"type":[4,"Type／Subtype 組合（p.5–6）"],"cfp":[5,"CFP 結構與時序、Beacon 產生（p.7–9）"],"access":[6,"PCF 存取與傳送程序（p.10–12）"],"mgmt":[7,"MAC 管理層（p.13–14）"],"sync":[8,"同步：TSF（p.15–16）"],"tbtt":[9,"TBTT 與 Beacon 產生（p.17）"],"ps":[10,"省電管理（p.18–22）"],"ibss-ps":[11,"IBSS 省電管理：ATIM（p.23–24）"],"scan":[12,"掃描（p.26–29）"],"roam":[13,"Infrastructure 網路與漫遊（p.30–32）"],"calc":[14,"公式與計算"],"confuse":[15,"易混淆處"],"review":[16,"複習問題"],"recap":[17,"一頁速記"],"glossary":[18,"專有名詞對照"],"check":[19,"考前自我檢查"]}},"ch3-80211e-qos":{"label":"CH3","ids":{"std":[1,"標準依據"],"why":[2,"為什麼需要 QoS（p.3–8）"],"brief":[3,"802.11e 概觀（p.9–11）"],"diff":[4,"流量區分：UP 與 AC（p.12–17）"],"tspec":[5,"TSPEC、TID 與 QoS Control 欄位（p.18–20）"],"ack":[6,"Ack Policy（p.21–22）"],"txop":[7,"TXOP 與 QoS Control 的 8 bits（p.23–25）"],"addts":[8,"ADDTS 與 TSPEC 元素（p.26–31）"],"edca":[9,"HCF 與 EDCA（p.32–45）"],"hcca":[10,"HCCA 與 TXOP（p.46–52）"],"dls":[11,"Direct Link Setup（p.53–55）"],"ba":[12,"Block Acknowledgement（p.56–64）"],"apsd":[13,"APSD 與 WMM Power Save（p.65–80）"],"next":[14,"結論與後續標準（p.81–91）"],"calc":[15,"公式與計算"],"confuse":[16,"易混淆處"],"review":[17,"複習問題"],"recap":[18,"一頁速記"],"glossary":[19,"專有名詞對照"],"check":[20,"考前自我檢查"]}},"ch4-random-access":{"label":"CH4","ids":{"std":[1,"標準依據"],"class":[2,"多重存取協定的分類（p.1、p.31–33）"],"aloha":[3,"ALOHA 協定（p.2–6）"],"tput":[4,"吞吐量的定義與假設（p.7–8、p.12）"],"poisson":[5,"Poisson 分佈與 Poisson 過程（p.9–11）"],"gs":[6,"提供負載 G 與 S = G·P"],"vuln":[7,"易受干擾期與 Pure ALOHA 吞吐量（p.15–17）"],"slotted":[8,"Slotted ALOHA（p.17–18）"],"csma":[9,"CSMA 與三種 persistence（p.19–24）"],"cd":[10,"CSMA/CD（p.25–28）"],"ca":[11,"CSMA/CA（p.29–30）"],"traffic":[12,"流量模型（p.34–42）"],"calc":[13,"公式拆解與範例計算"],"glossary":[14,"專有名詞對照"],"check":[15,"考前自我檢查"]}}};
  /* SECS:END */
  const ALIAS = {};
  for (const [file, v] of Object.entries(SECS)) ALIAS[v.label.toLowerCase()] = file;
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

  // 回傳註記 HTML；links = false 時（PDF）不加連結
  function examRefs(q, links = true) {
    const parts = [];
    if (q.k) parts.push(`<span class="ref-k">🗂 ${q.k}</span>`);
    if (q.sec && q.sec.length) {
      const groups = [];
      for (const ref of q.sec) {
        const [c, id] = ref.split('#');
        const file = SECS[c] ? c : ALIAS[c.toLowerCase()];
        const ch = SECS[file];
        if (!ch || !ch.ids[id]) throw new Error('exam-refs：找不到章節 ' + ref);
        const [n, title] = ch.ids[id];
        let g = groups.find(x => x.file === file);
        if (!g) groups.push(g = { file, label: ch.label, items: [] });
        g.items.push(links ? `<a href="${file}.html#${id}" title="${esc(title)}">§${n}</a>` : `§${n}`);
      }
      parts.push('<span class="ref-ch">📚 ' + groups.map(g => `${g.label} ${g.items.join('、')}`).join('；') + '</span>');
    }
    return parts.length ? `<div class="mq-refs">${parts.join('')}</div>` : '';
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = examRefs;
  else root.examRefs = examRefs;
})(this);
