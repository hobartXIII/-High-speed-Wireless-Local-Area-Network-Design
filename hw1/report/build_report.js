// 產生作業一報告 HW1_report.docx（報告以本腳本為準，Claude 文件版已停用）
// 用法（在 hw1/report/ 下）：
//   npm install                     # 第一次，安裝 docx
//   node build_report.js            # 讀 ../throughput_vs_rate.png，寫出 ../HW1_report.docx
//   powershell -File to_pdf.ps1     # 用 Word 轉出 ../HW1_report.pdf
// 內容範圍以題目 PPT 為準；移出的內容在 ../supplement/supplement.md 第 7.6 節。
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, AlignmentType, ShadingType, BorderStyle, ImageRun, Footer, PageNumber,
  LevelFormat, VerticalAlign, TableLayoutType,
} = require("docx");

const imgPath = process.argv[2] || path.join(__dirname, "..", "throughput_vs_rate.png");
const outPath = process.argv[3] || path.join(__dirname, "..", "HW1_report.docx");

const BODY = { ascii: "Times New Roman", hAnsi: "Times New Roman", eastAsia: "PMingLiU" };
const HEAD = { ascii: "Arial", hAnsi: "Arial", eastAsia: "Microsoft JhengHei" };
const SZ = 22; // 11 pt

const CONTENT_W = 9412; // A4 11906 - 2 × 1247
const border = { style: BorderStyle.SINGLE, size: 4, color: "808080" };
const borders = { top: border, bottom: border, left: border, right: border };

// 文字片段：字串，或 {t, b, sub}
function runs(parts, extra = {}) {
  return (Array.isArray(parts) ? parts : [parts]).map((p) => {
    const o = typeof p === "string" ? { t: p } : p;
    return new TextRun({ text: o.t, bold: o.b, subScript: o.sub, font: BODY, size: SZ, ...extra });
  });
}
const para = (parts, opts = {}) =>
  new Paragraph({ children: runs(parts), alignment: AlignmentType.JUSTIFIED, spacing: { after: 100, line: 300 }, ...opts });
const h1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: t, font: HEAD })] });
const h2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: t, font: HEAD })] });
const caption = (t) =>
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 140 },
    children: [new TextRun({ text: t, font: BODY, size: 20, bold: true })] });

function cell(parts, w, { header = false, align = AlignmentType.LEFT } = {}) {
  return new TableCell({
    borders, width: { size: w, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER,
    shading: header ? { fill: "E7E6E6", type: ShadingType.CLEAR, color: "auto" } : undefined,
    margins: { top: 50, bottom: 50, left: 90, right: 90 },
    children: [new Paragraph({ alignment: align, spacing: { line: 260 },
      children: runs(parts, { size: 20, bold: header || undefined }) })],
  });
}
function table(widths, rows, aligns) {
  return new Table({
    width: { size: widths.reduce((a, b) => a + b), type: WidthType.DXA },
    columnWidths: widths, layout: TableLayoutType.FIXED, alignment: AlignmentType.CENTER,
    rows: rows.map((r, i) => new TableRow({
      tableHeader: i === 0, cantSplit: true,
      children: r.map((c, j) => cell(c, widths[j], { header: i === 0, align: i === 0 ? AlignmentType.CENTER : aligns[j] })),
    })),
  });
}

const C = AlignmentType.CENTER, L = AlignmentType.LEFT;
const CW = (s) => ["CW", { t: s, sub: true }];

const paramTable = table([560, 2700, 6152], [
  ["#", "題目參數", "本實驗設定"],
  ["1", "Channel Bandwidth", "20 MHz（5 GHz，通道 36）"],
  ["2", "SIFS / DIFS", "SIFS = 16 µs，slot = 9 µs；DIFS = SIFS + 2 × slot = 34 µs（題目未給數值，依講義 p.22）"],
  ["2", "PLCP Length", "36 µs（802.11n HT-mixed 前導：L-STF 8 + L-LTF 8 + L-SIG 4 + HT-SIG 8 + HT-STF 4 + HT-LTF 4 µs）"],
  ["3", "MCS", "資料 HtMcs7（64-QAM 5/6，65 Mbps）；RTS 為 HtMcs0；ACK、CTS 為 OFDM 6 Mbps；Block Ack 為 OFDM 24 Mbps"],
  ["4", [...CW("min")], ["15（", ...CW("max"), " = 1023）"]],
  ["5", "Data Length L", "UDP payload 1472 B（MAC 訊框 1538 B，空中時間 228 µs）"],
  ["6", "Number of STAs", "5、20（變數）"],
  ["7", "Arrival Rate λ", "200、800 packets/s（變數）"],
  ["8", "RTS/CTS", "關閉：threshold = 999999；開啟：threshold = 0（變數）"],
], [C, L, L]);

const R = AlignmentType.RIGHT;
const resultTable = table([1100, 2000, 1500, 2400, 2412], [
  ["STA 數", "λ（packets/s）", "RTS/CTS", "Offered Load（Mbps）", "Throughput（Mbps）"],
  ["5", "200", "關閉", "11.8", "11.8"],
  ["5", "200", "開啟", "11.8", "11.8"],
  ["5", "800", "關閉", "47.1", "46.5"],
  ["5", "800", "開啟", "47.1", "47.2"],
  ["20", "200", "關閉", "47.1", "33.6"],
  ["20", "200", "開啟", "47.1", "45.6"],
  ["20", "800", "關閉", "188.4", "35.6"],
  ["20", "800", "開啟", "188.4", "58.3"],
], [C, C, C, R, R]);

const img = fs.readFileSync(imgPath);
const IMG_W = 600; // px（約 15.9 cm）
const figure = new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 120 },
  children: [new ImageRun({ type: "png", data: img, transformation: { width: IMG_W, height: Math.round(IMG_W * 900 / 2400) } })] });

const doc = new Document({
  styles: {
    default: { document: { run: { font: BODY, size: SZ } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: HEAD, color: "000000" },
        paragraph: { spacing: { before: 240, after: 120 }, keepNext: true, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: HEAD, color: "000000" },
        paragraph: { spacing: { before: 160, after: 80 }, keepNext: true, outlineLevel: 1 } },
    ],
  },
  numbering: { config: [{ reference: "concl", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
    style: { paragraph: { indent: { left: 400, hanging: 400 } } } }] }] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1247, bottom: 1247, left: 1247, right: 1247 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
      new TextRun({ children: ["第 ", PageNumber.CURRENT, " 頁，共 ", PageNumber.TOTAL_PAGES, " 頁"], font: BODY, size: 18 })] })] }) },
    children: [
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
        children: [new TextRun({ text: "高速網路 作業一：802.11n Throughput 分析", font: HEAD, size: 34, bold: true })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
        children: [new TextRun({ text: "邱勇嘉　　2026 年 10 月 13 日", font: BODY, size: SZ })] }),

      h1("1. 實驗目的與參數設定"),
      para("本實驗以 ns-3.49 模擬 IEEE 802.11n 無線區域網路，探討站台（Station, STA）數量、每個 STA 的封包到達率（Arrival Rate, λ），以及 RTS/CTS（Request To Send / Clear To Send）機制對 Throughput 的影響。題目所列 8 項系統參數之設定如表 1。"),
      caption("表 1　系統參數設定"),
      paramTable,
      para(["表中縮寫：SIFS（Short Interframe Space）、DIFS（DCF Interframe Space）、PLCP（Physical Layer Convergence Procedure）、MCS（Modulation and Coding Scheme）、", ...CW(""), "（Contention Window）。"],
        { spacing: { before: 80, after: 120, line: 280 } }),
      para("實驗環境：存取點（Access Point, AP）位於原點，STA 平均分布於半徑 5 m 的圓上，所有節點彼此皆可偵聽。流量為上行 UDP（User Datagram Protocol，STA → AP），封包到達服從 Poisson 分布。媒介存取控制（Medium Access Control, MAC）採分散式協調功能（Distributed Coordination Function, DCF，即 CSMA/CA），並啟用 802.11n 預設的 A-MPDU（Aggregate MAC Protocol Data Unit）聚合。實驗組合為 STA 數 2 種 × λ 2 種 × RTS/CTS 開關 2 種，共 8 組，每組以 3 個 seed 執行後取平均；模擬於 1 s 開始送出封包，量測區間為 2–20 s。"),

      h1("2. 實驗結果"),
      para(["Throughput 定義為 AP 在 2–20 s 收到的 UDP payload 位元數 ÷ 18 s；Offered Load = STA 數 × λ × 1472 B × 8。各組結果如圖 1 與表 2，圖中虛線為 Offered Load，誤差棒為 3 個 seed 的標準差（皆在 0.5 Mbps 以內）。"]),
      figure,
      caption("圖 1　Throughput vs. Arrival Rate（依 STA 數分組）"),
      caption("表 2　8 組實驗結果（3 個 seed 平均）"),
      resultTable,
      para("由表 2 可見，5 STA 在兩種 λ 下的 Throughput 皆接近 Offered Load；20 STA 的 Throughput 則明顯低於 Offered Load，且開啟 RTS/CTS 時較高。",
        { spacing: { before: 120, after: 100, line: 300 } }),

      h1("3. 結果分析與討論"),
      h2("3.1 負載與 STA 數量的影響"),
      para(["5 STA 時 Throughput 等於 Offered Load，表示尚未飽和，封包到達後僅需等待 DIFS（34 µs）與平均 7.5 個 slot 的退避時間（", ...CW("min"), " 15 之半 × 9 µs ≈ 68 µs）即可送出。"]),
      para("20 STA 則已飽和：λ 由 200 增至 800 packets/s，Offered Load 增為 4 倍，Throughput 僅由 33.6 增至 35.6 Mbps，超出 MAC 傳輸能力的封包在佇列中被丟棄。飽和值遠低於實體層（Physical layer, PHY）速率 65 Mbps，原因有二：其一為每次傳輸的固定開銷，包括 DIFS 34 µs、平均退避約 68 µs、PLCP 前導 36 µs、SIFS 16 µs 與 Block Ack 32 µs，合計約 186 µs；其二為碰撞浪費的時間。A-MPDU 將多個封包合併為一次傳輸，可分攤固定開銷，但無法消除碰撞。"),
      para(["在相同 Offered Load（47.1 Mbps）下，5 STA × 800 packets/s 與 20 STA × 200 packets/s 於 RTS/CTS 關閉時分別為 46.5 與 33.6 Mbps，差異來自競爭程度而非負載。DCF 中各 STA 首次退避自 [0, ", ...CW("min"), "] = [0, 15] 共 16 個 slot 中隨機選擇，同時有待送封包的 STA 越多，選中相同 slot 的機率越高，碰撞機率隨 STA 數上升。每次碰撞須付出碰撞時間 T", { t: "c", sub: true }, "，RTS/CTS 關閉時 T", { t: "c", sub: true }, " 約為整個 A-MPDU 的傳輸時間加上 DIFS；碰撞後 CW 依序加倍為 31、63⋯（上限 1023），退避的閒置時間亦隨之增加。"]),

      h2("3.2 RTS/CTS 的改善效果"),
      para("20 STA 時開啟 RTS/CTS，Throughput 於 λ = 200 與 800 packets/s 分別提升約 36% 與 64%；5 STA 開啟與否差異不大。"),
      para(["改善來自碰撞時間 T", { t: "c", sub: true }, " 的縮短。RTS/CTS 關閉時，碰撞會浪費整個 A-MPDU 的傳輸時間（最長可達數 ms）；開啟後碰撞僅發生於 RTS，T", { t: "c", sub: true }, " 僅為 RTS、等待 CTS 逾時與 DIFS 之和，約 0.14 ms。CTS 回覆後，其他 STA 依網路配置向量（Network Allocation Vector, NAV）延後存取，後續的資料訊框不會遭受碰撞。其代價為每次成功傳輸額外增加 RTS 64 + CTS 44 + 2 × SIFS 16 = 140 µs；在 20 STA 的高競爭情境下，此成本遠小於節省的碰撞時間。"]),

      h1("4. 結論"),
      ...[
        [{ t: "STA 數量與競爭：", b: true }, "STA 越多，碰撞機率越高。相同 Offered Load 47.1 Mbps 下，20 STA 僅達 33.6 Mbps，5 STA 則為 46.5 Mbps。"],
        [{ t: "Arrival Rate 與飽和：", b: true }, "未飽和時 Throughput 等於 Offered Load；飽和後不再隨 λ 上升，20 STA 由 200 增至 800 packets/s 時 Throughput 僅增加 2 Mbps。"],
        [{ t: "RTS/CTS：", b: true }, "在高競爭時明顯有利，20 STA 的 Throughput 提升 36%–64%，因碰撞僅浪費短的 RTS；5 STA 時影響不大。"],
      ].map((p) => new Paragraph({ numbering: { reference: "concl", level: 0 }, alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 80, line: 300 }, children: runs(p) })),
    ],
  }],
});

Packer.toBuffer(doc).then((b) => { fs.writeFileSync(outPath, b); console.log("wrote", outPath); });
