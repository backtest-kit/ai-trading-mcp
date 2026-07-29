import { addStrategySchema } from "backtest-kit";

addStrategySchema({
  strategyName: "main_strategy",
  callbacks: {
    onOpen(
      symbol,
      { priceOpen, priceStopLoss, priceTakeProfit, position },
      currentPrice,
    ) {
      console.log("Position opened", {
        symbol,
        position,
        priceOpen,
        priceTakeProfit,
        priceStopLoss,
        currentPrice,
      });
    },
    onClose(
      symbol,
      { priceOpen, priceStopLoss, priceTakeProfit, position },
      currentPrice,
    ) {
      console.log("Position closed", {
        symbol,
        position,
        priceOpen,
        priceTakeProfit,
        priceStopLoss,
        currentPrice,
      });
    },
    onActivePing(
      symbol,
      { priceOpen, priceStopLoss, priceTakeProfit, position },
      currentPrice,
    ) {
      console.log("Position active", {
        symbol,
        position,
        priceOpen,
        priceTakeProfit,
        priceStopLoss,
        currentPrice,
      });
    },
  },
});
