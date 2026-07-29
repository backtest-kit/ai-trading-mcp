import {
  addStrategySchema,
  listenError,
  listenActivePing,
  Log,
  getPositionHighestProfitDistancePnlCost,
  getPositionHighestMaxDrawdownPnlCost,
  getPositionPnlCost,
  getClosePrice,
  Cron,
} from "backtest-kit";
import { errorData, getErrorMessage } from "functools-kit";

addStrategySchema({
  strategyName: "jan_2026_strategy",
  getSignal: async (symbol, when, currentPrice) => {
    console.log(symbol, when);

    const signal = await core.signalMainService.getLast4HourSignal(symbol, when);

    if (!signal) {
      return null;
    }

    // Решение об открытии позиции принимает LLM. Эмпирические правила
    // (sleeping coin SHORT, knife-catching LONG) живут в outline-промпте.
    // Здесь стратегия только следует вердикту.
    if (signal.riskAction === "skip") {
      return null;
    }

    const closePrice = await getClosePrice(symbol, "1m");
    if (closePrice < signal.entryFrom || closePrice > signal.entryTo) {
      return null;
    }

    const info = {
      publishedAt: signal.publishedAt,
      data: {
        direction: signal.direction,
        entryFrom: signal.entryFrom,
        entryTo: signal.entryTo,
        targets: signal.targets,
        stoploss: signal.stoploss,
      },
      risk: {
        action: signal.riskAction,
        sureLevel: signal.riskSureLevel,
        confidence: signal.riskConfidence,
        description: signal.riskDescription,
        reasoning: signal.riskReasoning,
      },
      parsed: signal.note,
    };

    return {
      id: signal.id,
      position: signal.direction,
      priceStopLoss: signal.stoploss,
      priceTakeProfit: signal.targets[2],
      minuteEstimatedTime: Infinity,
      note: JSON.stringify(info, null, 2),
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

