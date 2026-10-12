"""作業一補充：單一 STA 無碰撞上限與 Bianchi 飽和模型，和模擬飽和值（λ = 1000 pkt/s）對照。

時間參數取自 `hw1 --printParams=1` 印出的 ns-3 實際值（µs）。
用法：python3 theory.py [results_all_rates.csv] [results_noampdu.csv]
"""
import sys

import pandas as pd

SIFS, SLOT, AIFSN = 16, 9, 3
DIFS = SIFS + AIFSN * SLOT          # 43（BE 的 AIFS）
CW_MIN, CW_MAX = 15, 1023
W = CW_MIN + 1                      # Bianchi 的 W
M = 6                               # W·2^M − 1 = 1023
PAYLOAD = 1472 * 8                  # 每個 MPDU 的 UDP payload（bits）

T_DATA = 228                        # 1538 B QoS Data，HtMcs7（含 36 µs PLCP）
T_AMPDU = 5360                      # 28 個 MPDU 的 A-MPDU（HT PPDU 上限 5.484 ms）
K_AMPDU = 28
T_ACK = 44                          # 14 B，OFDM 6 Mbps
T_BA = 32                           # Block Ack 32 B，OFDM 24 Mbps
T_RTS = 64                          # 20 B，HtMcs0
T_CTS = 44                          # 14 B，OFDM 6 Mbps
EIFS = SIFS + T_ACK + DIFS          # 103：收到錯誤訊框後改等 EIFS


def cases():
    """回傳 (A-MPDU, RTS, payload bits, Ts, Tc)。"""
    out = []
    for ampdu, t_data, t_resp, k in [(0, T_DATA, T_ACK, 1), (1, T_AMPDU, T_BA, K_AMPDU)]:
        ts = t_data + SIFS + t_resp + DIFS
        tc = t_data + EIFS
        out.append((ampdu, 0, k * PAYLOAD, ts, tc))
        rts = T_RTS + SIFS + T_CTS + SIFS
        out.append((ampdu, 1, k * PAYLOAD, rts + ts, T_RTS + EIFS))
    return out


def single_sta(payload, ts):
    """單一 STA、沒有碰撞：每次傳送前平均退避 CWmin/2 個 slot。"""
    return payload / (CW_MIN / 2 * SLOT + ts)


def bianchi_tau(n):
    """解 Bianchi 的固定點：τ（每個 slot 傳送機率）與 p（碰撞機率）。"""
    lo, hi = 1e-9, 1.0
    for _ in range(200):
        tau = (lo + hi) / 2
        p = 1 - (1 - tau) ** (n - 1)
        rhs = 2 * (1 - 2 * p) / ((1 - 2 * p) * (W + 1) + p * W * (1 - (2 * p) ** M))
        lo, hi = (tau, hi) if rhs > tau else (lo, tau)
    return tau, p


def bianchi(n, payload, ts, tc):
    tau, p = bianchi_tau(n)
    ptr = 1 - (1 - tau) ** n
    ps = n * tau * (1 - tau) ** (n - 1) / ptr
    s = ps * ptr * payload / ((1 - ptr) * SLOT + ptr * ps * ts + ptr * (1 - ps) * tc)
    return s, p


def main():
    files = sys.argv[1:] or ["results_all_rates.csv", "results_noampdu.csv"]
    sim = pd.concat([pd.read_csv(f) for f in files])
    sat = sim[sim.rate == 1000].groupby(["ampdu", "rts", "nSta"]).throughput_Mbps.mean()
    print(f"DIFS={DIFS} us  EIFS={EIFS} us  W={W}  m={M}\n")
    print("A-MPDU RTS | Ts(us) Tc(us) | 單STA上限 | n  p      Bianchi  模擬(1000 pkt/s)  差")
    for ampdu, rts, payload, ts, tc in cases():
        s1 = single_sta(payload, ts)
        for n in (5, 20):
            s, p = bianchi(n, payload, ts, tc)
            m = sat.get((ampdu, rts, n), float("nan"))
            print(f"  {ampdu}     {rts}  | {ts:5d}  {tc:5d} | {s1:6.2f}    | {n:2d} {p:.3f}  {s:6.2f}   {m:6.2f}           "
                  f"{(m - s) / s * 100:+5.1f}%")


if __name__ == "__main__":
    main()
