import {
  addStrategySchema,
  listenError,
  listenActivePing,
  Log,
  listenBeforeStart,
  getPositionHighestProfitDistancePnlCost,
  getPositionHighestMaxDrawdownPnlCost,
  getPositionPnlCost,
  BeforeStartContract,
  getCandles,
  getClosePrice,
  Cron,
} from "backtest-kit";
import { errorData, getErrorMessage, singleshot } from "functools-kit";

// Два фильтра входа, выведенные эмпирически из бэктестов января 2026.
// Используют ТОЛЬКО pre-publication данные — никакого look-ahead.
//
// 1. SHORT на "спящих" активах (avgRange < 0.07% за сутки, как TRX) — stop-hunt мишень.
//    Дроп 9 sleeping-SHORT убирает 8 убытков, baseline 31 сделка +6.31% → 22 сделки +16.83%.
//
// 2. LONG при момент 24h < -1% — канал зовёт ловить ножи на падающем рынке.
//    На свежем бэктесте (20 сделок, TP=T3) этот фильтр поднимает +60.30% → +68.90%
//    и winrate 74% → 82%. Дроп 2 LONG'ов которые сразу шли в SL по 4%.
const SHORT_MIN_AVG_RANGE_PCT = 0.07;
const LONG_MIN_MOMENTUM_24H_PCT = -1;
const PRE_CANDLES_LIMIT = 1440; // 24h 1m свечей для baseline

addStrategySchema({
  strategyName: "jan_2026_strategy",
  getSignal: async (symbol, when, currentPrice) => {
    console.log(symbol, when);

    const signal = await core.signalMainService.getLast4HourScreen(symbol, when);

    if (!signal) {
      return null;
    }

    const closePrice = await getClosePrice(symbol, "1m");
    if (closePrice < signal.entry.from || closePrice > signal.entry.to) {
      return null;
    }

    const t3 = signal.targets[2];

    /*
    // Загружаем 24h pre-publication свечей для волатильности. signal.publishedAt
    // практически совпадает с моментом вызова getSignal — окно `getCandles(.., 1440)`
    // покрывает ровно сутки до публикации.
    const preCandles = await getCandles(symbol, "1m", PRE_CANDLES_LIMIT);
    if (preCandles.length < PRE_CANDLES_LIMIT / 4) {
      return null;
    }

    // Фильтр 1: avgRange% < 0.07% на pre-publication 1m свечах = "спящий" актив
    // (как TRX в январе). Тонкая ликвидность + крупные spikes = stop-hunt мишень
    // под видом SHORT канала. На LONG не применяется — лонги на спящих активах работают.
    const avgRangePct =
      preCandles.reduce((acc, c) => acc + ((c.high - c.low) / c.close) * 100, 0) /
      preCandles.length;
    if (signal.direction === "short" && avgRangePct < SHORT_MIN_AVG_RANGE_PCT) {
      return null;
    }

    // Фильтр 2: momentum24h — общее изменение цены за 24h до публикации.
    // Если канал зовёт в LONG, а цена за сутки упала больше чем на 1% — это
    // "ловля ножей": подписчики покупают на спуске, рынок продолжает идти вниз,
    // стоп выбивает. На SHORT этот фильтр не работает (зеркальный паттерн
    // в данных не подтверждается).
    const momentum24hPct =
      ((preCandles[preCandles.length - 1].close - preCandles[0].open) /
        preCandles[0].open) *
      100;
    if (signal.direction === "long" && momentum24hPct < LONG_MIN_MOMENTUM_24H_PCT) {
      return null;
    }

    const info = {
      publishedAt: signal.publishedAt,
      data: {
        direction: signal.direction,
        entry: signal.entry,
        targets: signal.targets,
        stoploss: signal.stoploss,
      },
      filters: {
        avgRangePct: avgRangePct.toFixed(4),
        momentum24hPct: momentum24hPct.toFixed(2),
      },
      parsed: signal.note,
    };
    */

    return {
      id: signal.id,
      position: signal.direction,
      priceStopLoss: signal.stoploss,
      priceTakeProfit: t3,
      minuteEstimatedTime: Infinity,
      note: signal.note, // JSON.stringify(info, null, 2),
    };
  },
});

listenActivePing(async ({ symbol, data, currentPrice }) => {
  const peakProfitDistance = await getPositionHighestProfitDistancePnlCost(symbol);
  const peakMaxDrawdown = await getPositionHighestMaxDrawdownPnlCost(symbol);
  const currentPnl = await getPositionPnlCost(symbol);
  Log.info("position active", {
    symbol,
    signalId: data.id,
    priceOpen: data.priceOpen,
    takeProfit: data.priceTakeProfit,
    stopLoss: data.priceStopLoss,
    currentPrice,
    peakProfitDistance,
    peakMaxDrawdown,
    currentPnl,
  });
});

listenError((error) => {
  console.log(error);
  Log.debug("error", {
    error: errorData(error),
    message: getErrorMessage(error),
  });
});

Cron.register({
  name: "backtest-prepare-data",
  handler: async ({ symbol, when, backtest }) => {
    if (!backtest) {
      return;
    }
    console.log(`Fetching backtest data symbol=${symbol} when=${when}`)
    await core.crawlerMainService.crawlBacktestFrame(when);
  },
});

Cron.register({
  name: "live-fetch-data",
  handler: async ({ symbol, when, backtest }) => {
    if (backtest) {
      return;
    }
    console.log(`Fetching live data symbol=${symbol} when=${when}`)
    await core.crawlerMainService.crawlLiveFrame(when);
  },
  interval: "15m",
})
