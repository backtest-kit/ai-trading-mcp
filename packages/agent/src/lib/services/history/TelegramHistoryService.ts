import { inject } from "../../core/di";
import LoggerService from "../base/LoggerService";
import { CC_TELEGRAM_CHANNEL } from "../../../config/params";
import { randomString, str, timeout } from "functools-kit";
import TYPES from "../../core/types";
import { IMCPContext, IMCPMessage } from "backtest-kit";
import ScraperService from "../base/ScraperService";

const FEED_MESSAGES_LIMIT = 15;
const FEED_FETCH_TIMEOUT = 90_000;

/**
 * Builds a t.me permalink for a channel post.
 *
 * Private channels (numeric ids prefixed with -100) are only addressable via
 * the /c/ form, where the prefix is stripped: -1002833393903 becomes
 * t.me/c/2833393903/<messageId>. Public channels are addressed by @username,
 * which needs no transformation beyond dropping the leading @.
 *
 * The link is the only way back from a quoted signal to its source message —
 * without it a description citing "the author's post at 14:36" cannot be
 * verified against the channel later.
 *
 * @param channel - Channel id (-100…) or @username from CC_TELEGRAM_CHANNEL
 * @param messageId - Telegram message id of the post
 * @returns Permalink to the post
 */
const GET_POST_LINK_FN = (channel: string, messageId: string | number) => {
  const handle = channel.startsWith("@") ? channel.slice(1) : channel;
  if (/^-100\d+$/.test(handle)) {
    return `https://t.me/c/${handle.slice(4)}/${messageId}`;
  }
  return `https://t.me/${handle}/${messageId}`;
};

const FETCH_TELEGRAM_HISTORY_FN = timeout(
  async (self: TelegramHistoryService, when: Date): Promise<IMCPMessage[]> => {
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
      text: str.newline(
        `Telegram feed ${CC_TELEGRAM_CHANNEL}`,
        `(last ${feed.length} message${feed.length === 1 ? "" : "s"}, newest first).`,
      ),
    });
    for (const post of feed) {
      const caption = post.content
        ? `${post.content}`
        : "(photo post, image attached below)";
      const link = GET_POST_LINK_FN(CC_TELEGRAM_CHANNEL, post.id);
      messages.push({
        id: `telegram-${post.id}`,
        type: "text",
        text: str.newline(
          `[${post.date.toISOString()}]: ${link}`,
          `${caption}`,
        ),
      });
      if (post.photo) {
        messages.push({
          id: `telegram-${post.id}-photo`,
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

export class TelegramHistoryService {
  readonly loggerService = inject<LoggerService>(TYPES.loggerService);
  readonly scraperService = inject<ScraperService>(TYPES.scraperService);

  public getHistory = async (
    context: IMCPContext,
    when: Date,
    mcpName: string,
  ) => {
    this.loggerService.log("telegramHistoryService getHistory", {
      context,
      when,
      mcpName,
    });
    return FETCH_TELEGRAM_HISTORY_FN(this, when);
  };
}

export default TelegramHistoryService;
