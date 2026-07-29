import { CC_SYMBOL_LIST } from "../config/params";
import { getArgs } from "../helpers/getArgs";
import { listExchangeSchema, listStrategySchema, Live, waitForReady } from "backtest-kit";

const main = async () => {

  const { values } = getArgs();

  if (!values.entry) {
    return;
  }

  if (!values.live) {
    return;
  }

  await waitForReady(false);

  const [strategySchema] = await listStrategySchema();

  if (!strategySchema) {
    throw new Error("Strategy not specified")
  }

  const [exchangeSchema] = await listExchangeSchema();

  if (!exchangeSchema) {
    throw new Error("Exchange not specified");
  }

  for (const symbol of CC_SYMBOL_LIST) {
    Live.background(symbol, {
      exchangeName: exchangeSchema.exchangeName,
      strategyName: strategySchema.strategyName,
    });
  }
};

main();
