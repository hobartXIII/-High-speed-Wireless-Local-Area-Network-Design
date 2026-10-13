// 產生作業一報告的白話版 HW1_report_plain.docx（內容與數據同 build_report.js，只改寫法：口語、一句一行）
// 用法（在 hw1/report/ 下）：
//   node build_report_plain.js                        # 寫出 ../HW1_report_plain.docx
//   powershell -File to_pdf.ps1 HW1_report_plain      # 用 Word 轉出 ../HW1_report_plain.pdf
// 內容範圍以題目 PPT 為準；專有名詞統一整理在 ../glossary.md。
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, AlignmentType, ShadingType, BorderStyle, ImageRun, Footer, PageNumber,
  LevelFormat, VerticalAlign, TableLayoutType,
} = require("docx");

const imgPath = process.argv[2] || path.join(__dirname, "..", "throughput_vs_rate.png");
const outPath = process.argv[3] || path.join(__dirname, "..", "HW1_report_plain.docx");

const BODY = { ascii: "Times New Roman", hAnsi: "Times New Roman", eastAsia: "PMingLiU" };
const HEAD = { ascii: "Arial", hAnsi: "Arial", eastAsia: "Microsoft JhengHei" };
const SZ = 22; // 11 pt

const border = { style: BorderStyle.SINGLE, size: 4, color: "808080" };
const borders = { top: border, bottom: border, left: border, right: border };

// 文字片段：字串，或 {t, b, sub}
function runs(parts, extra = {}) {
  return (Array.isArray(parts) ? parts : [parts]).map((p) => {
    const o = typeof p === "string" ? { t: p } : p;
    return new TextRun({ text: o.t, bold: o.b, subScript: o.sub, font: BODY, size: SZ, ...extra });
  });
}
// 一句一行：每句自成一個段落，段與段之間空一點
const lines = (...ls) => ls.map((l, i) => new Paragraph({ children: runs(l),
  spacing: { after: i === ls.length - 1 ? 160 : 20, line: 300 } }));
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

const C = AlignmentType.CENTER, L = AlignmentType.LEFT, R = AlignmentType.RIGHT;
const CW = (s) => ["CW", { t: s, sub: true }];
const TC = ["T", { t: "c", sub: true }];

const paramTable = table([560, 2700, 6152], [
  ["#", "題目參數", "設定"],
  ["1", "Channel Bandwidth", "20 MHz（5 GHz，通道 36）"],
  ["2", "SIFS / DIFS", "SIFS = 16 µs，slot = 9 µs，DIFS = SIFS + 2 × slot = 34 µs（題目沒給數值，照講義 p.22）"],
  ["2", "PLCP Length", "36 µs（802.11n HT-mixed 前導：L-STF 8 + L-LTF 8 + L-SIG 4 + HT-SIG 8 + HT-STF 4 + HT-LTF 4 µs）"],
  ["3", "MCS", "資料用 HtMcs7（64-QAM 5/6，65 Mbps），RTS 用 HtMcs0，ACK、CTS 用 OFDM 6 Mbps，Block Ack 用 OFDM 24 Mbps"],
  ["4", [...CW("min")], ["15（", ...CW("max"), " = 1023）"]],
  ["5", "Data Length L", "UDP payload 1472 B（加上標頭後 MAC 訊框 1538 B，在空中要傳 228 µs）"],
  ["6", "Number of STAs", "5、20（要比較的變數）"],
  ["7", "Arrival Rate λ", "200、800 packets/s（要比較的變數）"],
  ["8", "RTS/CTS", "關：threshold = 999999；開：threshold = 0（要比較的變數）"],
], [C, L, L]);

const resultTable = table([1100, 2000, 1500, 2400, 2412], [
  ["STA 數", "λ（packets/s）", "RTS/CTS", "Offered Load（Mbps）", "Throughput（Mbps）"],
  ["5", "200", "關", "11.8", "11.8"],
  ["5", "200", "開", "11.8", "11.8"],
  ["5", "800", "關", "47.1", "46.5"],
  ["5", "800", "開", "47.1", "47.2"],
  ["20", "200", "關", "47.1", "33.6"],
  ["20", "200", "開", "47.1", "45.6"],
  ["20", "800", "關", "188.4", "35.6"],
  ["20", "800", "開", "188.4", "58.3"],
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

      h1("一、做了什麼"),
      ...lines(
        "這次作業要在 IEEE 802.11n Wi-Fi 網路中，觀察不同負載與競爭程度下的 Throughput。",
        "主要調整三個參數：STA 數（5、20）、每個 STA 的 Arrival Rate λ（200、800 packets/s），以及 RTS/CTS（開、關）。",
        "最後畫出 Throughput vs. Arrival Rate，依 STA 數分組比較，並說明觀察到的變化與現象。",
        "模擬工具是 ns-3.49。",
      ),
      ...lines("題目的 8 個系統參數，設定如表 1。"),
      caption("表 1　系統參數"),
      paramTable,
      new Paragraph({ spacing: { after: 60 } }),
      ...lines(
        "AP 放在中間，STA 平均排在半徑 5 m 的圓上，每一台都聽得到彼此。",
        "每台 STA 都往 AP 送 UDP 封包，封包什麼時候產生是隨機的（Poisson）。",
        "MAC 用 802.11 的 DCF，也就是 CSMA/CA；A-MPDU 維持 802.11n 預設的開啟。",
      ),
      ...lines(
        "STA 數 2 種、λ 2 種、RTS/CTS 開關 2 種，一共 8 組。",
        "每組用 3 個不同的 seed 各跑一次，再取平均。",
        "封包從第 1 秒開始送，只拿第 2 到 20 秒這段來算結果。",
      ),

      h1("二、結果"),
      ...lines(
        "Throughput 是 AP 在第 2 到 20 秒收到的 UDP 資料量（bit）除以 18 秒。",
        "Offered Load 是所有 STA 加起來想送的量，算法是 STA 數 × λ × 1472 B × 8。",
        "圖 1 的虛線是 Offered Load，誤差棒是 3 個 seed 的標準差，都不到 0.5 Mbps。",
      ),
      figure,
      caption("圖 1　Throughput vs. Arrival Rate（依 STA 數分開畫）"),
      caption("表 2　8 組結果（3 個 seed 的平均）"),
      resultTable,
      new Paragraph({ spacing: { after: 60 } }),
      ...lines(
        "大致可以看出兩件事。",
        "5 台 STA 的時候，想送多少就收到多少。",
        "20 台 STA 的時候，收到的比想送的少很多，而且開 RTS/CTS 比沒開好。",
      ),

      h1("三、為什麼會這樣"),
      h2("1. 台數和負載的影響"),
      ...lines(
        "5 台 STA 時，Throughput 跟 Offered Load 差不多，表示網路還沒塞滿。",
        ["封包到了以後，等一個 DIFS（34 µs），再加上一段隨機退避（平均 7.5 個 slot，也就是 ", ...CW("min"), " 15 的一半乘 9 µs，約 68 µs），就能送出去。"],
      ),
      ...lines(
        "20 台就不一樣了。",
        "λ 從 200 加到 800，想送的量變成 4 倍，Throughput 卻只從 33.6 變成 35.6 Mbps。",
        "代表網路已經滿了，送不出去的封包只能在佇列裡被丟掉。",
      ),
      ...lines(
        "滿載時的 Throughput 比 PHY 速率 65 Mbps 低很多，主要有兩個原因。",
        "一是每送一次都要花固定的時間：DIFS 34 µs、平均退避約 68 µs、PLCP 前導 36 µs、SIFS 16 µs、Block Ack 32 µs，加起來大約 186 µs。",
        "二是碰撞會浪費時間。",
        "A-MPDU 把好幾個封包綁在一起送，可以攤掉固定的時間，但沒辦法避免碰撞。",
      ),
      ...lines(
        "再看總負載一樣的兩組：5 台 × 800 和 20 台 × 200，Offered Load 都是 47.1 Mbps。",
        "RTS/CTS 關掉時，前者有 46.5 Mbps，後者只有 33.6 Mbps。",
        "差別就在同時搶通道的台數。",
      ),
      ...lines(
        ["DCF 裡每台 STA 第一次退避，是從 0 到 15 這 16 個 slot 裡隨機挑一個。"],
        "同時想送的 STA 越多，越容易有兩台挑到同一個 slot，然後撞在一起。",
        ["沒開 RTS/CTS 時，撞一次浪費的時間（", ...TC, "）差不多是整個 A-MPDU 的長度再加上 DIFS。"],
        "撞了之後 CW 還會加倍，變成 31、63，一直到 1023，等待的時間也跟著拉長。",
      ),

      h2("2. RTS/CTS 的影響"),
      ...lines(
        "20 台 STA 時，開 RTS/CTS 讓 Throughput 在 λ = 200 和 800 時分別多了大約 36% 和 64%。",
        "5 台 STA 時，開不開差不多。",
      ),
      ...lines(
        "原因還是在碰撞的代價。",
        "沒開的時候，一撞就浪費整個 A-MPDU，最長可以到好幾 ms。",
        ["開了以後，會撞的只剩很短的 RTS，", ...TC, " 只有 RTS、等 CTS 逾時和 DIFS 的時間，大約 0.14 ms。"],
        "CTS 回來之後，其他 STA 會照 NAV 先不搶通道，後面的資料就不會被撞。",
      ),
      ...lines(
        "RTS/CTS 也不是沒有成本，每次成功傳送要多花 RTS 64 + CTS 44 + 2 × SIFS 16 = 140 µs。",
        "但在 20 台一起搶的情況下，省下的碰撞時間比這多得多。",
      ),

      h1("四、結論"),
      ...[
        "STA 越多，碰撞越多。同樣 47.1 Mbps 的 Offered Load，20 台只送出 33.6 Mbps，5 台有 46.5 Mbps。",
        "還沒塞滿時，想送多少就收到多少；塞滿以後再加 λ 也沒用，20 台從 200 加到 800，Throughput 只多了 2 Mbps。",
        "台數多、搶得兇的時候，RTS/CTS 很有用，20 台時 Throughput 多了 36% 到 64%；5 台時影響不大。",
      ].map((t) => new Paragraph({ numbering: { reference: "concl", level: 0 },
        spacing: { after: 80, line: 300 }, children: runs(t) })),
    ],
  }],
});

Packer.toBuffer(doc).then((b) => { fs.writeFileSync(outPath, b); console.log("wrote", outPath); });
