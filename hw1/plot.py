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
