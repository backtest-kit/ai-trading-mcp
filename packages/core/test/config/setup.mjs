/// <reference types="../../types.d.ts" />

import { createRequire } from "module";
import { singleshot } from "functools-kit";
import ccxt from "ccxt";

{
    const require = createRequire(import.meta.url);
    require("../../build/index.cjs");
}

const getExchange = singleshot(async () => {
  const exchange = new ccxt.binance({
    options: {
      defaultType: "spot",
      adjustForTimeDifference: true,
      recvWindow: 60000,
    },
    enableRateLimit: true,
  });
  await exchange.loadMarkets();
  return exchange;
});

addExchangeSchema({
  exchangeName: "ccxt-exchange",
  getCandles: async (symbol, interval, since, limit) => {
    const exchange = await getExchange();
    const candles = await exchange.fetchOHLCV(
      symbol,
      interval,
      since.getTime(),
      limit,
    );
    return candles.map(([timestamp, open, high, low, close, volume]) => ({
      timestamp,
      open,
      high,
      low,
      close,
      volume,
    }));
  },
});


