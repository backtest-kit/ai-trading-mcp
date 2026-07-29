<img src="https://github.com/tripolskypetr/backtest-kit/raw/refs/heads/master/assets/consciousness.svg" height="45px" align="right">

# 🧿 backtest-ollama-crontab

> A **TypeScript monorepo** for [backtest-kit](https://github.com/tripolskypetr/backtest-kit) demonstrating how a local **Ollama LLM** (running `gpt-oss` quantized) can be wired into a trading-signal pipeline as an **outline-based risk filter**, with a **15-minute crontab** doing live Telegram-channel ingestion. The strategy parses signals from any public Telegram channel, asks the LLM whether each signal is safe to trade

![screenshot](https://raw.githubusercontent.com/tripolskypetr/backtest-kit/HEAD/assets/screenshots/screenshot16.png)

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/tripolskypetr/backtest-kit)
[![npm](https://img.shields.io/npm/v/backtest-kit.svg?style=flat-square)](https://npmjs.org/package/backtest-kit)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)]()
[![Build](https://github.com/tripolskypetr/backtest-kit/actions/workflows/webpack.yml/badge.svg)](https://github.com/tripolskypetr/backtest-kit/actions/workflows/webpack.yml)

📚 **[API Reference](https://backtest-kit.github.io/documents/example_02_first_backtest.html)** | 🌟 **[Quick Start](https://github.com/tripolskypetr/backtest-kit/tree/master/example)**

## 🚀 Quick Start

### 1. Build the workspace packages

```bash
npm run build:x        # macOS / Linux
npm run build:win      # Windows
```

Each build emits per-package `build/index.cjs` + rolled-up `types.d.ts`.

### 2. Authenticate the Telegram MTProto session

```bash
cd ./packages/main
npm run auth
```

A QR code prints in the terminal. Scan it with the Telegram app on your phone (Settings → Devices → Link Desktop Device). On success, a `session.txt` file is written next to the auth command.

### 3. Copy the session into the strategy folder

```bash
cp packages/main/session.txt content/jan_2026.strategy/session.txt
```

The strategy reads this file at runtime to subscribe to the configured channel without re-authenticating.

### 4. Run the backtest

From the repo root:

```bash
npm start -- --backtest --ui --entry ./content/jan_2026.strategy/jan_2026.strategy.ts --cache
```

## 🎯 What this repo demonstrates

A real-world experiment: take any free, public Telegram trading-signals channel, wire each signal through a **local Ollama LLM** (`gpt-oss` quantized) acting as a risk filter, and measure whether the LLM gate actually improves P&L on historical data.

### Pipeline

1. **Telegram crawler** (`packages/core/src/lib/services/core/CrawlerService.ts`) — pulls raw messages from the configured channel.

2. **Parser** (`packages/core/src/lib/services/screen/ChannelScreenService.ts`) — extracts `direction`, `entry`, `targets`, `stoploss` from signal text into a `parser-items` Mongo collection.

3. **Risk outline** ([`packages/core/src/logic/outline/risk.outline.ts`](packages/core/src/logic/outline/risk.outline.ts)) — for every parsed signal, runs the LLM against 1m/15m candles + a pre-computed metrics packet (`avgRangePct`, `momentum24hPct`) and asks for a `riskAction: "skip" | "follow"` verdict.

4. **Strategy** ([`content/jan_2026.strategy/jan_2026.strategy.ts`](content/jan_2026.strategy/jan_2026.strategy.ts)) — opens a position only when the LLM voted `follow` and the live price falls inside the channel's entry zone. TP = `targets[2]`, SL = `signal.stoploss`.

5. **Crontab triggers** — `Cron.register` from `backtest-kit` schedules a `15m` live-fetch and a one-shot backtest-prepare handler. In live mode the worker re-polls the channel every 15 minutes; in backtest mode it pulls the entire frame at startup.

## 📊 Before vs After Ollama

Two backtests on the **same parsed-signal set** for January 2026:

### 📋 Trade Log WITHOUT Ollama

**Signals**

| # | Symbol | Opened (UTC) | Closed (UTC) | Held | Dir | Open | Close | Peak | DD | PNL% | Exit |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | SOL | Jan 05 07:13 | Jan 05 20:09 | 12.9h | LONG | $135.23 | $139.10 | +2.42% | −1.72% | **+2.45%** | take-profit |
| 2 | NEAR | Jan 06 08:46 | Jan 06 11:44 | 3.0h | LONG | $1.77 | $1.80 | +1.57% | −0.59% | **+1.64%** | take-profit |
| 3 | HYPE | Jan 06 09:59 | Jan 06 12:13 | 2.2h | LONG | $26.52 | $27.04 | +1.55% | −1.41% | **+1.56%** | take-profit |
| 4 | TRX | Jan 06 10:17 | Jan 11 00:06 | 109.8h | SHORT | $0.2915 | $0.3027 | −0.32% | −4.21% | **−4.24%** | stop-loss |
| 5 | FARTCOIN | Jan 06 10:43 | Jan 17 23:50 | 277.1h | SHORT | $0.4401 | $0.3500 | +19.34% | −7.64% | **+20.13%** | take-profit |
| 6 | NEAR | Jan 06 19:10 | Jan 06 20:47 | 1.6h | LONG | $1.76 | $1.80 | +1.66% | −0.71% | **+1.81%** | take-profit |
| 7 | NEAR | Jan 07 13:28 | Jan 08 06:15 | 16.8h | LONG | $1.76 | $1.69 | −0.38% | −4.09% | **−4.26%** | stop-loss |
| 8 | NEAR | Jan 09 15:23 | Jan 12 13:45 | 70.4h | SHORT | $1.69 | $1.66 | +1.19% | −4.93% | **+1.28%** | take-profit |
| 9 | PUMP | Jan 10 14:13 | Jan 14 16:12 | 98.0h | LONG | $0.002381 | $0.002930 | +21.10% | −5.42% | **+22.58%** | take-profit |
| 10 | TRX | Jan 12 13:09 | Jan 15 17:07 | 76.0h | SHORT | $0.2979 | $0.3099 | −0.29% | −4.43% | **−4.45%** | stop-loss |
| 11 | BTC | Jan 13 11:31 | Jan 13 15:59 | 4.5h | LONG | $92,202.22 | $93,400.00 | +0.81% | −0.71% | **+0.90%** | take-profit |
| 12 | HYPE | Jan 13 17:21 | Jan 13 22:14 | 4.9h | LONG | $24.46 | $25.19 | +2.44% | −0.40% | **+2.59%** | take-profit |
| 13 | SOL | Jan 15 13:55 | Jan 18 23:46 | 81.8h | LONG | $145.20 | $139.10 | −0.14% | −4.58% | **−4.59%** | stop-loss |
| 14 | TRX | Jan 16 17:59 | Jan 17 14:15 | 20.3h | LONG | $0.3080 | $0.3144 | +1.66% | −0.61% | **+1.66%** | take-profit |
| 15 | SOL | Jan 19 05:26 | Jan 20 08:07 | 26.7h | SHORT | $133.50 | $130.40 | +1.88% | −1.56% | **+1.93%** | take-profit |
| 16 | POL | Jan 21 17:41 | Jan 21 19:59 | 2.3h | LONG | $0.1329 | $0.1376 | +3.11% | −0.40% | **+3.12%** | take-profit |
| 17 | TRX | Jan 22 09:16 | Jan 28 08:46 | 143.5h | SHORT | $0.2999 | $0.2930 | +1.89% | −4.00% | **+1.89%** | take-profit |
| 18 | SOL | Jan 22 09:32 | Jan 25 16:01 | 78.5h | LONG | $129.90 | $125.10 | +0.20% | −4.05% | **−4.08%** | stop-loss |
| 19 | POL | Jan 22 12:26 | Jan 23 14:03 | 25.6h | LONG | $0.1340 | $0.1290 | +0.15% | −4.11% | **−4.15%** | stop-loss |
| 20 | FARTCOIN | Jan 26 16:21 | Jan 31 14:28 | 118.1h | SHORT | $0.2824 | $0.2300 | +17.97% | −11.99% | **+18.20%** | take-profit |
| 21 | SOL | Jan 28 22:15 | Jan 29 14:59 | 16.7h | LONG | $125.46 | $120.50 | −0.13% | −4.21% | **−4.34%** | stop-loss |
| 22 | TRX | Jan 30 12:19 | Jan 31 20:44 | 32.4h | SHORT | $0.2895 | $0.2867 | +1.29% | −2.44% | **+0.58%** | time-exit |

**Statistics**

| Metric | Value |
|---|---|
| Total trades | 22 |
| Total PNL | **+52.22%** |
| Wins / Losses | 15 / 7 |
| Winrate | **68%** |
| Mean trade PNL | **+2.374%** |
| Std dev per trade | 7.676% |
| Sharpe Ratio (per-trade) | **+0.309** |
| Max drawdown (single trade) | −4.59% |
| Profit factor | **2.73** |
| Expectancy per trade | **+$2.37** (per $100 stake) |

### 📋 Trade Log with Ollama

**Signals**

| # | Symbol | Opened (UTC) | Closed (UTC) | Held | Dir | Open | Close | Peak | DD | PNL% | Exit |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | SOL | Jan 05 07:13 | Jan 05 20:09 | 12.9h | LONG | $135.23 | $139.10 | +2.42% | −1.72% | **+2.45%** | take-profit |
| 2 | NEAR | Jan 06 08:46 | Jan 06 11:44 | 3.0h | LONG | $1.77 | $1.80 | +1.57% | −0.59% | **+1.64%** | take-profit |
| 3 | HYPE | Jan 06 09:59 | Jan 06 12:13 | 2.2h | LONG | $26.52 | $27.04 | +1.55% | −1.41% | **+1.56%** | take-profit |
| 4 | FARTCOIN | Jan 06 10:43 | Jan 17 23:50 | 277.1h | SHORT | $0.4401 | $0.3500 | +19.34% | −7.64% | **+20.13%** | take-profit |
| 5 | NEAR | Jan 06 19:10 | Jan 06 20:47 | 1.6h | LONG | $1.76 | $1.80 | +1.66% | −0.71% | **+1.81%** | take-profit |
| 6 | NEAR | Jan 09 15:23 | Jan 12 13:45 | 70.4h | SHORT | $1.69 | $1.66 | +1.19% | −4.93% | **+1.28%** | take-profit |
| 7 | PUMP | Jan 10 14:13 | Jan 14 16:12 | 98.0h | LONG | $0.002381 | $0.002930 | +21.10% | −5.42% | **+22.58%** | take-profit |
| 8 | BTC | Jan 13 11:31 | Jan 13 15:59 | 4.5h | LONG | $92,202.22 | $93,400.00 | +0.81% | −0.71% | **+0.90%** | take-profit |
| 9 | HYPE | Jan 13 17:21 | Jan 13 22:14 | 4.9h | LONG | $24.46 | $25.19 | +2.44% | −0.40% | **+2.59%** | take-profit |
| 10 | TRX | Jan 15 12:11 | Jan 15 22:35 | 10.4h | LONG | $0.3055 | $0.3124 | +1.86% | −0.49% | **+1.86%** | take-profit |
| 11 | SOL | Jan 15 13:55 | Jan 18 23:46 | 81.8h | LONG | $145.20 | $139.10 | −0.14% | −4.58% | **−4.59%** | stop-loss |
| 12 | TRX | Jan 16 17:59 | Jan 17 14:15 | 20.3h | LONG | $0.3080 | $0.3144 | +1.66% | −0.61% | **+1.66%** | take-profit |
| 13 | SOL | Jan 19 05:26 | Jan 20 08:07 | 26.7h | SHORT | $133.50 | $130.40 | +1.88% | −1.56% | **+1.93%** | take-profit |
| 14 | POL | Jan 21 17:41 | Jan 21 19:59 | 2.3h | LONG | $0.1329 | $0.1376 | +3.11% | −0.40% | **+3.12%** | take-profit |
| 15 | SOL | Jan 22 09:32 | Jan 25 16:01 | 78.5h | LONG | $129.90 | $125.10 | +0.20% | −4.05% | **−4.08%** | stop-loss |
| 16 | POL | Jan 22 12:26 | Jan 23 14:03 | 25.6h | LONG | $0.1340 | $0.1290 | +0.15% | −4.11% | **−4.15%** | stop-loss |
| 17 | FARTCOIN | Jan 26 16:21 | Jan 31 14:28 | 118.1h | SHORT | $0.2824 | $0.2300 | +17.97% | −11.99% | **+18.20%** | take-profit |

**Statistics**

| Metric | Value |
|---|---|
| Total trades | 17 |
| Total PNL | **+68.90%** |
| Wins / Losses | 14 / 3 |
| Winrate | **82%** |
| Mean trade PNL | **+4.053%** |
| Std dev per trade | 7.918% |
| Sharpe Ratio (per-trade) | **+0.512** |
| Max drawdown (single trade) | −4.59% |
| Profit factor | **6.37** |
| Expectancy per trade | **+$4.05** (per $100 stake) |

### 🤖 Baseline VS Ollama

| Metric | Without Ollama | With Ollama | Δ |
|---|---|---|---|
| Total trades | 22 | 17 | **−5** trades skipped |
| Total PNL | +52.22% | **+68.90%** | **+16.68 pp** |
| Winrate | 68% | **82%** | **+14 pp** |
| Wins / Losses | 15 / 7 | 14 / 3 | **−4 losing trades** |
| Sharpe Ratio | +0.309 | **+0.512** | **+0.203** |
| Profit factor | 2.73 | **6.37** | **+3.64** |
| Expectancy per trade | +$2.37 | **+$4.05** | **+$1.68** |

The LLM correctly **vetoed 6 signals**, of which **4 were losers** (`TRX SHORT Jan 06 −4.24%`, `NEAR LONG Jan 07 −4.26%`, `TRX SHORT Jan 12 −4.45%`, `SOL LONG Jan 28 −4.34%`) — totaling **−17.29% avoided**. The two skipped winners (`TRX SHORT Jan 22 +1.89%`, `TRX SHORT Jan 30 +0.58%`) cost **−2.47%**. **Net win: +14.82% from filtering**, plus one additional trade (`TRX LONG Jan 15 +1.86%`) the LLM run captured.

## 🛠️ Architecture in 60 seconds

| Layer | File | Responsibility |
|---|---|---|
| Crawl | `packages/core/src/lib/services/core/CrawlerService.ts` | Telegram `iterMessages` → `parser-items` upsert |
| Parse | `packages/core/src/lib/services/screen/ChannelScreenService.ts` | Regex extraction of `direction/entry/targets/stoploss` |
| Job | `packages/core/src/lib/services/job/SignalJobService.ts` | Subscribes to `signalJobSubject`, runs each unvisited row through `SignalLogicService` |
| Outline | `packages/core/src/logic/outline/risk.outline.ts` | LLM prompt + `commitMetricsHistory` + zod-validated response |
| Logic | `packages/core/src/lib/services/logic/SignalLogicService.ts` | Pure passthrough of LLM verdict to `screen-items` DTO |
| Schema | `packages/core/src/schema/Screen.schema.ts` | Final stored fields: `direction`, `entryFrom/To`, `targets`, `stoploss`, `riskAction`, `riskSureLevel`, `riskConfidence`, `riskDescription`, `riskReasoning` |
| Strategy | `content/jan_2026.strategy/jan_2026.strategy.ts` | Reads `screen-items`, opens position only when `riskAction === "follow"` |
| Cron | same file, `Cron.register(...)` | `interval: "15m"` for live polling; no `interval` = one-shot backtest prepare |

## 🔑 Environment Variables

| Var | Default | Purpose |
|---|---|---|
| `CC_MONGO_CONNECTION_STRING` | `mongodb://localhost:27017/backtest-pro?wtimeoutMS=15000` | Mongo connection |
| `CC_TELEGRAM_API_ID` | `31861455` | Telegram MTProto API ID |
| `CC_TELEGRAM_API_HASH` | `ca60446c67ce250ee4e789c730163449` | Telegram MTProto API hash |
| `CC_SYMBOL_LIST` | `BTCUSDT,POLUSDT,ZECUSDT,HYPEUSDT,DOGEUSDT,SOLUSDT,PENGUUSDT,TRXUSDT,HBARUSDT,NEARUSDT,FARTCOINUSDT,ETHUSDT,PUMPUSDT,ENAUSDT` | Comma-separated symbols crawled per run |
| `CC_OLLAMA_URL` | `http://localhost:11434` | Ollama HTTP endpoint serving `gpt-oss` |

## 📜 Summary

| Aspect | This monorepo |
|---|---|
| **LLM gate** | Local Ollama (`gpt-oss` quantized) consulted per signal, returns `riskAction: "skip" \| "follow"` |
| **Empirical rules** | Embedded in LLM system prompt (`avgRangePct < 0.07%` for SHORT; `momentum24hPct < -1%` for LONG) — tunable without recompiling `packages/` |
| **Live ingestion** | 15-minute crontab via `Cron.register(.., interval: "15m")` polls the configured channel |
| **Backtest result** | January 2026: **+52.22% → +68.90%** with the LLM gate (Sharpe **+0.309 → +0.512**, winrate **68% → 82%**) |
| **DI surface** | `globalThis.core` typed via root `tsconfig.json` paths → rolled-up `types.d.ts` |
| **Strategy isolation** | Strategy files in `./content/` are loaded by `@backtest-kit/cli` at runtime, never bundled into `@pro/*` |
