import { singleshot } from "functools-kit";
import { parseArgs } from "util";

export const getArgs = singleshot(() => {
  const { values } = parseArgs({
    args: process.argv,
    options: {
      entry: {
        type: "boolean",
        default: false,
      },
      backtest: {
        type: "boolean",
        default: false,
      },
      live: {
        type: "boolean",
        default: false,
      },
      paper: {
        type: "boolean",
        default: false,
      },
      session: {
        type: "boolean",
        default: false,
      },
      cache: {
        type: "boolean",
        default: false,
      },
    },
    strict: false,
    allowPositionals: true,
  });
  return { values };
});
