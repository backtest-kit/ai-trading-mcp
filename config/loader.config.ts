import { waitForInit } from "@backtest-kit/mongo";

import "@pro/agent";
import "@pro/main";

export default async () => {
    await waitForInit();
}
