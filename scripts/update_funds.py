"""Nightly fund data refresh for meliusoneconsulting.com.

Reads data/tickers.json, pulls the latest closing price and payout history for each
fund from Yahoo Finance (through the yfinance library), and writes data/funds-live.json.
If a fund can't be fetched, its last good numbers are kept, so the page never breaks.
"""
import json, math, pathlib, statistics, sys, time
from datetime import datetime, timedelta, timezone

import pandas as pd
import yfinance as yf

ROOT = pathlib.Path(__file__).resolve().parent.parent
TICKERS = json.loads((ROOT / "data" / "tickers.json").read_text())
OUT = ROOT / "data" / "funds-live.json"

prev = {}
if OUT.exists():
    try:
        prev = json.loads(OUT.read_text()).get("funds", {})
    except Exception:
        prev = {}

FREQ_FALLBACK = {"Twice a month": 24, "Weekly": 52, "Biweekly": 26, "Semi-monthly": 24, "Monthly": 12, "Quarterly": 4, "Semi-annual": 2, "Annual": 1}
SNAP = [52, 26, 24, 12, 4, 2, 1]


def per_year(dates, fallback):
    """Payments per year, from the gaps between recent payout dates."""
    if len(dates) >= 3:
        gaps = [(b - a).days for a, b in zip(dates[:-1], dates[1:])][-6:]
        gaps = [g for g in gaps if g > 0]
        if gaps:
            est = 365.25 / statistics.median(gaps)
            return min(SNAP, key=lambda n: abs(n - est))
    return fallback


def fetch(symbol):
    tk = yf.Ticker(symbol)
    hist = tk.history(period="1mo", auto_adjust=False)
    closes = hist["Close"].dropna() if "Close" in hist else pd.Series(dtype=float)
    if closes.empty:
        raise ValueError("no price")
    price = float(closes.iloc[-1])
    price_date = closes.index[-1].date().isoformat()
    div = tk.dividends
    if div is None or div.empty:
        raise ValueError("no payouts")
    cutoff = div.index.max() - pd.Timedelta(days=430)
    div = div[div.index >= cutoff].astype(float)
    return price, price_date, div


def returns(symbol):
    """Total returns with payouts reinvested (Yahoo's adjusted close): ytd, 1y, and 3y/5y/since-start a year."""
    h = yf.Ticker(symbol).history(period="max", auto_adjust=True)
    c = h["Close"].dropna() if "Close" in h else pd.Series(dtype=float)
    if len(c) < 30:
        return None
    end, last = c.index[-1], float(c.iloc[-1])
    out = {}

    def at(days):
        s = c[c.index <= end - pd.Timedelta(days=days)]
        return float(s.iloc[-1]) if len(s) else None

    jan = c[c.index < pd.Timestamp(year=end.year, month=1, day=1, tz=end.tz)]
    if len(jan):
        out["ytd"] = round((last / float(jan.iloc[-1]) - 1) * 100, 2)
    for key, yrs in (("y1", 1), ("y3", 3), ("y5", 5), ("y10", 10)):
        v = at(int(365.25 * yrs))
        if v:
            out[key] = round(((last / v) ** (1 / yrs) - 1) * 100, 2)
    span = (end - c.index[0]).days / 365.25
    if span >= 1:
        out["si"] = round(((last / float(c.iloc[0])) ** (1 / span) - 1) * 100, 2)
    out["asof"] = end.date().isoformat()
    out["start"] = c.index[0].date().isoformat()
    return out


def last_price(symbol):
    h = yf.Ticker(symbol).history(period="10d", auto_adjust=False)
    c = h["Close"].dropna() if "Close" in h else pd.Series(dtype=float)
    if c.empty:
        return None
    return {"p": round(float(c.iloc[-1]), 4), "pd": c.index[-1].date().isoformat(), "sym": symbol}


def summarize(t, price, price_date, div, freq_label):
    amounts = list(div.values)
    dates = [d.to_pydatetime() for d in div.index]
    latest = amounts[-1]
    recent = amounts[-5:-1]
    regular = latest
    special = False
    # A year-end or one-off special payout would make the yield look far too high.
    if recent and latest > 1.6 * statistics.median(recent):
        regular = statistics.median(recent)
        special = True
    n = per_year(dates, FREQ_FALLBACK.get(freq_label, 12))
    fwd = regular * n / price * 100
    year_ago = div.index.max() - pd.Timedelta(days=365)
    t12_sum = float(div[div.index > year_ago].sum())
    span_days = (div.index.max() - div.index.min()).days
    t12 = t12_sum / price * 100 if span_days >= 300 else None
    if not (0 < fwd < 80) or not math.isfinite(fwd):
        raise ValueError(f"yield out of range: {fwd:.1f}")
    return {
        "p": round(price, 4),
        "pd": price_date,
        "d": round(regular, 5),
        "dd": dates[-1].date().isoformat(),
        "n": n,
        "y": round(fwd, 2),
        "t12": round(t12, 2) if t12 is not None else None,
        "sp": special or None,
    }


funds, failed = {}, []
for row in TICKERS:
    t = row["t"]
    got = None
    for sym in [row["y"], t.replace(".", "-") + ".NE"]:
        try:
            price, pdate, div = fetch(sym)
            got = summarize(t, price, pdate, div, row.get("f", "Monthly"))
            got["sym"] = sym
            break
        except Exception as e:  # try the next exchange suffix
            err = str(e)
        time.sleep(0.6)
    if got:
        # total returns, from the full price history
        try:
            r = returns(got["sym"])
            if r:
                got["r"] = r
        except Exception:
            if t in prev and prev[t].get("r"):
                got["r"] = prev[t]["r"]
        # Canadian funds: is there a U.S.-dollar unit (like HYLD.U)?
        if row.get("lst") != "US":
            u = None
            base = t.replace(".", "-") + "-U"
            # try the exchange the fund itself trades on first (TSX .TO or Cboe Canada .NE)
            exs = [".NE", ".TO"] if got["sym"].endswith(".NE") else [".TO", ".NE"]
            for ex in exs:
                try:
                    u = last_price(base + ex)
                except Exception:
                    u = None
                if u:
                    break
                time.sleep(0.4)
            if u:
                # the .U units' own payouts and returns (in U.S. dollars), when Yahoo has them
                try:
                    up, upd, udiv = fetch(u["sym"])
                    full = summarize(t + ".U", up, upd, udiv, row.get("f", "Monthly"))
                    full["sym"] = u["sym"]
                    try:
                        ur = returns(u["sym"])
                        if ur:
                            full["r"] = ur
                    except Exception:
                        pass
                    u = full
                except Exception:
                    pass
                got["u"] = u
            elif t in prev and prev[t].get("u"):
                got["u"] = prev[t]["u"]
        if row.get("lst") == "US":
            got["cur"] = "USD"
        funds[t] = got
    else:
        failed.append(t)
        if t in prev:
            keep = dict(prev[t])
            keep["stale"] = True
            funds[t] = keep
    time.sleep(0.6)

ok = len(TICKERS) - len(failed)
if ok == 0:
    print("No funds could be fetched; leaving the existing file untouched.")
    sys.exit(0)

fx = None
try:
    fx = last_price("CAD=X")
except Exception:
    fx = None
if not fx:
    try:
        fx = json.loads(OUT.read_text()).get("fx")
    except Exception:
        fx = None

data = {
    "fx": {"usdcad": fx["p"], "d": fx["pd"]} if fx and "p" in fx else fx,
    "asOf": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ"),
    "seed": False,
    "source": "Yahoo Finance",
    "updated": ok,
    "failed": failed,
    "funds": funds,
}
OUT.write_text(json.dumps(data, indent=1))
print(f"Updated {ok} of {len(TICKERS)} funds. Kept last good data for: {', '.join(failed) or 'none'}")
