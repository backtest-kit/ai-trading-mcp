import { addMCPSchema } from "backtest-kit";
import ioc from "../lib";

addMCPSchema({
  mcpName: "manual_mcp",
  async getMessages(context, when, mcpName) {
    return await ioc.statusControllerService.getStatus(context, when, mcpName);
  },
  permissions: [
    "commitPositionClose",
    "commitPositionOpen",
    "commitSignalNotify",
    "commitAverageBuy",
    "getStatus",
  ]
});
