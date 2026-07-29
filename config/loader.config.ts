import { waitForInit } from "@backtest-kit/mongo";

import "@pro/core";
import "@pro/main";

export default async () => {
    await waitForInit();
}
