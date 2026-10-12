import sys

import pandas as pd
import matplotlib.pyplot as plt

# 用法：python3 plot_ampdu.py [A-MPDU 開的 CSV] [A-MPDU 關的 CSV] [輸出圖檔]
on_csv = sys.argv[1] if len(sys.argv) > 1 else "results_all_rates.csv"
off_csv = sys.argv[2] if len(sys.argv) > 2 else "results_noampdu.csv"
dst = sys.argv[3] if len(sys.argv) > 3 else "ampdu_compare.png"

df = pd.concat([pd.read_csv(on_csv), pd.read_csv(off_csv)])
g = (df.groupby(["nSta", "ampdu", "rts", "rate"])
       .agg(thr=("throughput_Mbps", "mean"),
            std=("throughput_Mbps", "std"),
            offered=("offered_Mbps", "mean"))
       .reset_index())

# 顏色區分 RTS/CTS，線型區分 A-MPDU
lines = [
    (1, 0, "A-MPDU on,  RTS off", "C0", "o-"),
    (1, 1, "A-MPDU on,  RTS on", "C1", "s-"),
    (0, 0, "A-MPDU off, RTS off", "C0", "o--"),
    (0, 1, "A-MPDU off, RTS on", "C1", "s--"),
]

stas = sorted(g.nSta.unique())
fig, axes = plt.subplots(1, len(stas), figsize=(6 * len(stas), 4.5), sharey=True)
for ax, n in zip(axes, stas):
    sub = g[g.nSta == n]
    for ampdu, rts, label, color, fmt in lines:
        d = sub[(sub.ampdu == ampdu) & (sub.rts == rts)].sort_values("rate")
        ax.errorbar(d.rate, d.thr, yerr=d["std"], fmt=fmt, color=color,
                    mfc="white" if ampdu == 0 else color, capsize=3, label=label)
    d = sub[(sub.ampdu == 1) & (sub.rts == 0)].sort_values("rate")
    ax.plot(d.rate, d.offered, "k:", alpha=0.4, label="Offered load")
    ax.set_title(f"STA = {n}")
    ax.set_xlabel("Arrival rate per STA (packets/s)")
    ax.grid(alpha=0.3)
    ax.legend(fontsize=9)
axes[0].set_ylabel("Throughput (Mbps)")
for ax in axes:
    ax.set_ylim(0, g.thr.max() * 1.3)
plt.tight_layout()
plt.savefig(dst, dpi=200)

# 飽和值（最大 rate）摘要
sat = g[g.rate == g.rate.max()].pivot_table(index="nSta", columns=["ampdu", "rts"], values="thr")
print(sat.round(1).to_string())
