import { inject } from "../../../lib/core/di";
import LoggerService from "../base/LoggerService";
import ScraperService from "../base/ScraperService";
import TYPES from "../../../lib/core/types";
import { IMCPContext, IMCPMessage, MCP } from "backtest-kit";
import { CC_TELEGRAM_CHANNEL } from "../../../config/params";
import { queued, randomString, timeout, TIMEOUT_SYMBOL } from "functools-kit";
import { getTelegram } from "../../../config/telegram";
import StatusMarkdownService from "../markdown/StatusMarkdownService";

const FEED_MESSAGES_LIMIT = 15;
const FEED_FETCH_TIMEOUT = 90_000;

type Message = IMCPMessage | typeof TIMEOUT_SYMBOL;

const FETCH_TELEGRAM_HISTORY_FN = timeout(
  async (self: StatusControllerService, when: Date): Promise<IMCPMessage[]> => {
    const messages: IMCPMessage[] = [];
    if (!CC_TELEGRAM_CHANNEL) {
      console.error("Telegram feed: CC_TELEGRAM_CHANNEL is not configured.");
      return [];
    }
    const feed = await self.scraperService.scrapeLast({
      channel: CC_TELEGRAM_CHANNEL,
      limit: FEED_MESSAGES_LIMIT,
      when,
      offset: 0,
    });
    if (!feed.length) {
      console.warn(`Telegram feed ${CC_TELEGRAM_CHANNEL}: no messages found.`);
      return [];
    }
    messages.push({
      id: randomString(),
      type: "text",
      text: `Telegram feed ${CC_TELEGRAM_CHANNEL} (last ${feed.length} message${feed.length === 1 ? "" : "s"}, newest first):`,
    });
    for (const post of feed) {
      const caption = post.content
        ? `\n${post.content}`
        : "\n(photo post, image attached below)";
      messages.push({
        id: post.id,
        type: "text",
        text: `[${post.date.toISOString()}]${caption}`,
      });
      if (post.photo) {
        messages.push({
          id: `${post.id}-photo`,
          type: "image",
          mimeType: "image/jpeg",
          data: post.photo,
        });
      }
    }
    return messages;
  },
  FEED_FETCH_TIMEOUT,
);

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
      messages = messages.concat(await MCP.getHistoryMessages(dto.mcpName));
      messages = messages.concat(await MCP.getNotificationMessages(dto.context, dto.when, dto.mcpName));
      messages = messages.concat(
        await FETCH_TELEGRAM_HISTORY_FN(self, dto.when),
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
  readonly scraperService = inject<ScraperService>(TYPES.scraperService);
  readonly statusMarkdownService = inject<StatusMarkdownService>(
    TYPES.statusMarkdownService,
  );

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
