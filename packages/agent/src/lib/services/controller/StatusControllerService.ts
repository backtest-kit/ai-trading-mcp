import { inject } from "src/lib/core/di";
import LoggerService from "../base/LoggerService";
import ScraperService from "../base/ScraperService";
import TYPES from "src/lib/core/types";
import { IMCPContext, IMCPMessage, MCP } from "backtest-kit";
import { CC_TELEGRAM_CHANNEL } from "src/config/params";
import { queued, timeout, TIMEOUT_SYMBOL } from "functools-kit";
import { getTelegram } from "src/config/telegram";

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
      date: when,
      offset: 0,
    });
    if (!feed.length) {
      console.warn(`Telegram feed ${CC_TELEGRAM_CHANNEL}: no messages found.`);
      return [];
    }
    messages.push({
      type: "text",
      text: `Telegram feed ${CC_TELEGRAM_CHANNEL} (last ${feed.length} message${feed.length === 1 ? "" : "s"}, newest first):`,
    });
    for (const post of feed) {
      const caption = post.content
        ? `\n${post.content}`
        : "\n(photo post, image attached below)";
      messages.push({
        type: "text",
        text: `[${post.date.toISOString()}]${caption}`,
      });
      if (post.photo) {
        messages.push({
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

export class StatusControllerService {
  readonly loggerService = inject<LoggerService>(TYPES.loggerService);
  readonly scraperService = inject<ScraperService>(TYPES.scraperService);

  public getStatus = queued(
    async (
      context: IMCPContext,
      when: Date,
      mcpName: string,
    ): Promise<IMCPMessage[]> => {
      this.loggerService.log("statusControllerService getStatus");
      let messages: Message[] = [];

      {
        messages = messages.concat(
          await MCP.getDefaultMessages(context, when, mcpName),
        );
        messages = messages.concat(await MCP.getHistoryMessages(mcpName));
        messages = messages.concat(await FETCH_TELEGRAM_HISTORY_FN(this, when));
      }

      if (messages.includes(TIMEOUT_SYMBOL)) {
        await RESTART_TELEGRAM_FN();
      }

      if (messages.includes(TIMEOUT_SYMBOL)) {
        throw new Error(
          `StatusControllerService.getStatus: timeout fetching feed messages`,
        );
      }

      return <IMCPMessage[]>messages;
    },
  );
}

export default StatusControllerService;
