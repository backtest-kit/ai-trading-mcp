declare function parseInt(value: unknown): number;

export const CC_TELEGRAM_API_ID = parseInt(process.env.CC_TELEGRAM_API_ID) || 31861455;
export const CC_TELEGRAM_API_HASH = process.env.CC_TELEGRAM_API_HASH || "ca60446c67ce250ee4e789c730163449";
export const CC_TELEGRAM_CHANNEL = process.env.CC_TELEGRAM_CHANNEL || "-1002833393903";
