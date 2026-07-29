import { json } from "agent-swarm-kit";
import { alignToInterval, runInMockContext } from "backtest-kit";
import { RiskOutlineContract } from "src/contract/RiskOutline";
import OutlineName from "src/enum/OutlineName";

interface RiskOutlineParams {
  symbol: string;
  publishedAt: Date;
  exchangeName: string;
  direction: "short" | "long";
  targets: number[];
  stoploss: number;
}

function runRiskOutlineFn({
  symbol,
  direction,
  targets,
  stoploss,
  publishedAt,
  exchangeName,
}: RiskOutlineParams) {
  const when = alignToInterval(publishedAt, "1m");
  return runInMockContext(
    async () => {
      const { data, error, isValid } = await json<RiskOutlineContract>(
        OutlineName.RiskOutline,
        symbol,
        direction,
        targets,
        stoploss,
      );
      if (!isValid) {
        throw new Error(error);
      }
      return data;
    },
    {
      symbol,
      exchangeName,
      when,
      strategyName: "mock-strategy",
      frameName: "mock-frame",
      backtest: true,
    },
  );
}

declare global {
  var runRiskOutline: typeof runRiskOutlineFn;
}

Object.assign(globalThis, {
  runRiskOutline: runRiskOutlineFn,
});
