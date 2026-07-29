import { CC_SYMBOL_LIST } from "../config/params";
import { getArgs } from "../helpers/getArgs";
import { Backtest, waitForReady, listStrategySchema, listExchangeSchema, listFrameSchema, cacheCandles } from "backtest-kit";

const CACHE_CANDLES_FN = async () => {
  const [exchangeSchema] = await listExchangeSchema();
  const [frameSchema] = await listFrameSchema();
  for (const symbol of CC_SYMBOL_LIST) {
    await cacheCandles({
      exchangeName: exchangeSchema.exchangeName,
      from: frameSchema.startDate,
      to: frameSchema.endDate,
      interval: "1m",
      symbol,
    })
  }
};

const main = async () => {

  const { values } = getArgs();

  if (!values.entry) {
    return;
  }

  if (!values.backtest) {
    return;
  }

  await waitForReady(true);

  const [strategySchema] = await listStrategySchema();

  if (!strategySchema) {
    throw new Error("Strategy not specified")
  }

  const [exchangeSchema] = await listExchangeSchema();

  if (!exchangeSchema) {
    throw new Error("Exchange not specified");
  }

  const [frameSchema] = await listFrameSchema();

  if (!frameSchema) {
    throw new Error("Frame not specified");
  }

  if (values.cache) {
    await CACHE_CANDLES_FN();
  }

  for (const symbol of CC_SYMBOL_LIST) {
    Backtest.background(symbol, {
      exchangeName: exchangeSchema.exchangeName,
      strategyName: strategySchema.strategyName,
      frameName: frameSchema.frameName,
    });
  }
};

main();
