import { inject } from "src/lib/core/di";
import LoggerService from "../base/LoggerService";
import ScraperService from "../base/ScraperService";
import TYPES from "src/lib/core/types";
import { IMCPContext, IMCPMessage, MCP } from "backtest-kit";
import { CC_TELEGRAM_CHANNEL } from "src/config/params";

const FEED_MESSAGES_LIMIT = 15;

const FETCH_TELEGRAM_HISTORY_FN = async (
  self: StatusControllerService,
  when: Date,
): Promise<IMCPMessage[]> => {
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
};

export class StatusControllerService {
  readonly loggerService = inject<LoggerService>(TYPES.loggerService);
  readonly scraperService = inject<ScraperService>(TYPES.scraperService);

  public getStatus = async (
    context: IMCPContext,
    when: Date,
    mcpName: string,
  ): Promise<IMCPMessage[]> => {
    this.loggerService.log("statusControllerService getStatus");
    let messages: IMCPMessage[] = [];

    {
      messages = messages.concat(
        await MCP.getDefaultMessages(context, when, mcpName),
      );
      messages = messages.concat(await MCP.getHistoryMessages(mcpName));
      messages = messages.concat(await FETCH_TELEGRAM_HISTORY_FN(this, when));
    }

    return messages;
  };
}

export default StatusControllerService;
