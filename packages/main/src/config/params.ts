declare function parseInt(value: unknown): number;

export const CC_TELEGRAM_API_ID = parseInt(process.env.CC_TELEGRAM_API_ID) || 31861455;
export const CC_TELEGRAM_API_HASH = process.env.CC_TELEGRAM_API_HASH || "ca60446c67ce250ee4e789c730163449";

function parseSymbolList(envVar: string, fallback: string) {
  const originList = process.env[envVar] || fallback;
  return originList
    .split(",")
    .map((s) => s.trim());
}

export const CC_SYMBOL_LIST = parseSymbolList(
    "CC_SYMBOL_LIST",
    "BTCUSDT,POLUSDT,ZECUSDT,HYPEUSDT,DOGEUSDT,SOLUSDT,PENGUUSDT,TRXUSDT,HBARUSDT,NEARUSDT,FARTCOINUSDT,ETHUSDT,PUMPUSDT"
);
