import { inject } from "../../../lib/core/di";
import LoggerService from "../base/LoggerService";
import TYPES from "../../../lib/core/types";
import { IMCPContext, IMCPMessage, MCP } from "backtest-kit";
import { queued, TIMEOUT_SYMBOL } from "functools-kit";
import { getTelegram } from "../../../config/telegram";
import StatusMarkdownService from "../markdown/StatusMarkdownService";
import TelegramHistoryService from "../history/TelegramHistoryService";

type Message = IMCPMessage | typeof TIMEOUT_SYMBOL;

const RESTART_TELEGRAM_FN = async () => {
  const telegram = await getTelegram();
  await telegram.disconnect();
  getTelegram.clear();
};

const GET_STATUS_FN = queued(
  async (
    self: StatusControllerService,
    dto: { context: IMCPContext; when: Date; mcpName: string },
  ) => {
    let messages: Message[] = [];

    {
      messages = messages.concat(
        await MCP.getDefaultMessages(dto.context, dto.when, dto.mcpName),
      );
      messages = messages.concat(await MCP.getHistoryMessages(dto.when, dto.mcpName));
      messages = messages.concat(await MCP.getNotificationMessages(dto.when, dto.mcpName));
      messages = messages.concat(await MCP.getAgentMessages(dto.when, dto.mcpName));
      messages = messages.concat(
        await self.telegramHistoryService.getHistory(dto.context, dto.when, dto.mcpName),
      );
    }

    if (messages.includes(TIMEOUT_SYMBOL)) {
      await RESTART_TELEGRAM_FN();
    }

    if (messages.includes(TIMEOUT_SYMBOL)) {
      throw new Error(
        `StatusControllerService.getStatus: timeout fetching feed messages`,
      );
    }

    const result = <IMCPMessage[]>messages;

    await self.statusMarkdownService.dumpStatus(result, dto.context, dto.when);

    return result;
  },
);

export class StatusControllerService {
  readonly loggerService = inject<LoggerService>(TYPES.loggerService);
  readonly statusMarkdownService = inject<StatusMarkdownService>(
    TYPES.statusMarkdownService,
  );
  readonly telegramHistoryService = inject<TelegramHistoryService>(TYPES.telegramHistoryService);

  public getStatus = async (
    context: IMCPContext,
    when: Date,
    mcpName: string,
  ) => {
    this.loggerService.log("statusControllerService getStatus", {
      context,
      when,
      mcpName,
    });
    return <IMCPMessage[]>await GET_STATUS_FN(this, { context, when, mcpName });
  };
}

export default StatusControllerService;
