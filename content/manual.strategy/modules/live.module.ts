// Live-модуль jan_2026 (spot) — ФИНАЛЬНЫЙ вариант Петра (23.07.2026) +
// расширенные хуки по его же правилам (№117в).
//
// Ядро (open/close + все хелперы) — дословно файл Петра из телеги 16:38
// («live.module.ts», разбор баги — FIXME.md; сам он его не гонял — ревью наше).
// Методология tools/wallet-manager:
//   - вход = commit_buy: лимитка + полл, по таймауту cancel и market-добивка
//     остатка → вход ГАРАНТИРОВАН, ордер на бирже не остаётся;
//   - брекеты = commit_trade: TP+SL одним OCO — одна заморозка средств
//     (два независимых sell на один объём на споте невозможны — корень каскада №114);
//   - закрытие = commit_cancel: снять ВСЕ ордера по символу с верификацией
//     чистого стакана, затем продать ВЕСЬ свободный баланс монеты в кеш.
//
// Partial/trailing/breakeven/averageBuy-хуки (нужны jan_2026: сигналы канала с
// таргетами) — по указанию Петра «обязаны следовать тем же правилам» реализованы
// ниже на ЕГО хелперах: cancel-sweep → verify → гарантированная продажа/покупка;
// OCO вместо пары sell; провал брекетов = раскрутка с типизацией исходной ошибки.
import {
  addExchangeSchema,
  roundTicks,
  setConfig,
  Broker,
  OrderTransientError,
  OrderRejectedError,
} from "backtest-kit";
import type {
  IBroker,
  BrokerOrderOpenPayload,
  BrokerOrderClosePayload,
  BrokerPartialProfitPayload,
  BrokerPartialLossPayload,
  BrokerTrailingStopPayload,
  BrokerTrailingTakePayload,
  BrokerBreakevenPayload,
  BrokerAverageBuyPayload,
} from "backtest-kit";
import { singleshot, sleep } from "functools-kit";
import ccxt from "ccxt";

type Binance = InstanceType<typeof ccxt.binance>;

// --- Данные: публичный spot-клиент ---

const getExchange = singleshot(async () => {
  const exchange = new ccxt.binance({
    options: {
      defaultType: "spot",
      adjustForTimeDifference: true,
      recvWindow: 60000,
    },
    enableRateLimit: true,
  });
  await exchange.loadMarkets();
  return exchange;
});

addExchangeSchema({
  exchangeName: "ccxt-exchange",
  getCandles: async (symbol, interval, since, limit) => {
    const exchange = await getExchange();
    const candles = await exchange.fetchOHLCV(
      symbol,
      interval,
      since.getTime(),
      limit,
    );
    return candles.map(([timestamp, open, high, low, close, volume]) => ({
      timestamp,
      open,
      high,
      low,
      close,
      volume,
    }));
  },
  getOrderBook: async (symbol, depth) => {
    const exchange = await getExchange();
    const bookData = await exchange.fetchOrderBook(symbol, depth);
    return {
      symbol,
      asks: bookData.asks.map(([price, quantity]) => ({
        price: String(price),
        quantity: String(quantity),
      })),
      bids: bookData.bids.map(([price, quantity]) => ({
        price: String(price),
        quantity: String(quantity),
      })),
    };
  },
  formatPrice: async (symbol, price) => {
    const exchange = await getExchange();
    const market = exchange.market(symbol);
    const tickSize = market.limits?.price?.min || market.precision?.price;
    if (tickSize !== undefined) {
      return roundTicks(price, tickSize);
    }
    return exchange.priceToPrecision(symbol, price);
  },
  formatQuantity: async (symbol, quantity) => {
    const exchange = await getExchange();
    const market = exchange.market(symbol);
    const stepSize = market.limits?.amount?.min || market.precision?.amount;
    if (stepSize !== undefined) {
      return roundTicks(quantity, stepSize);
    }
    return exchange.amountToPrecision(symbol, quantity);
  },
});

// --- Исполнение ---

const FILL_POLL_INTERVAL_MS = 10_000;   // полл филла: 10 проверок ...
const FILL_POLL_ATTEMPTS = 10;          // ... раз в 10 секунд = до ~100с ожидания
const CANCEL_SETTLE_MS = 2_000;         // пауза после cancel перед перечитыванием
const CANCEL_ROUNDS = 10;               // заходы cancel-sweep при закрытии
const STOP_LIMIT_SLIPPAGE = 0.995;      // stop-limit цена чуть ниже триггера SL
const TRADE_SELL_LOWER_PERCENT = 0.999; // лимит-цена выхода чуть ниже рынка

// Сетевой класс ccxt (RequestTimeout, ExchangeNotAvailable, DDoSProtection...)
// → transient (bounded retry движка с тем же signalId); всё остальное от биржи
// (InsufficientFunds, InvalidOrder, min-notional...) → постоянный отказ.
function toTypedError(e: unknown): Error {
  if (e instanceof ccxt.NetworkError) {
    return OrderTransientError.fromError(e as object);
  }
  if (e instanceof ccxt.ExchangeError) {
    return OrderRejectedError.fromError(e as object);
  }
  return e as Error;
}

// Binance: -2013 "Order does not exist" при запросе по origClientOrderId
function isOrderNotFound(e: unknown): boolean {
  return String((e as Error)?.message ?? "").includes("-2013");
}

// Сверка входа по clientOrderId = signalId: был ли прошлый POST исполнен.
// null = ордера с таким id нет (слать заново); иначе — статус и исполненный объём.
async function fetchEntryByClientId(
  exchange: Binance,
  symbol: string,
  signalId: string,
): Promise<{ orderId: string; status: string; executedQty: number } | null> {
  const market = exchange.market(symbol);
  try {
    const raw = await (exchange as any).privateGetOrder({
      symbol: market.id,
      origClientOrderId: signalId,
    });
    return {
      orderId: String(raw.orderId),
      status: String(raw.status),
      executedQty: parseFloat(raw.executedQty ?? "0"),
    };
  } catch (e) {
    if (isOrderNotFound(e)) return null;
    throw toTypedError(e);
  }
}

const getSpotExchange = singleshot(async () => {
  const exchange = new ccxt.binance({
    apiKey: process.env.BINANCE_API_KEY,
    secret: process.env.BINANCE_API_SECRET,
    options: {
      defaultType: "spot",
      adjustForTimeDifference: true,
      recvWindow: 60000,
    },
    enableRateLimit: true,
  });
  await exchange.loadMarkets();
  return exchange;
});

function getBase(exchange: Binance, symbol: string): string {
  return exchange.market(symbol).base;
}

function truncateQty(exchange: Binance, symbol: string, qty: number): number {
  return parseFloat(exchange.amountToPrecision(symbol, qty));
}

async function fetchFreeQty(exchange: Binance, symbol: string): Promise<number> {
  const balance = await exchange.fetchBalance();
  const base = getBase(exchange, symbol);
  return parseFloat(String(balance?.free?.[base] ?? 0));
}

// Отмена с обработкой гонки «филл против cancel»: ордер мог исполниться между
// последним поллом и cancel — тогда cancel падает (-2011), и это ФИЛЛ, не отказ
// (исходная версия превращала его в терминальный дроп реально купленного входа).
async function cancelOrderSafe(
  exchange: Binance,
  orderId: string,
  symbol: string,
): Promise<"canceled" | "filled"> {
  try {
    await exchange.cancelOrder(orderId, symbol);
    return "canceled";
  } catch (cancelErr) {
    const status = await exchange.fetchOrder(orderId, symbol);
    if (status.status === "closed") return "filled";
    throw toTypedError(cancelErr);
  }
}

// commit_cancel: снятие ВСЕХ ордеров по символу с ретраями и ВЕРИФИКАЦИЕЙ, что
// стакан чист. Продавать можно только незамороженные средства — продажа поверх
// живого sell-ордера падает insufficient balance (типовая ошибка адаптеров).
async function cancelSweepAndVerify(exchange: Binance, symbol: string): Promise<void> {
  {
    let error: unknown = null;
    for (let i = 0; i !== CANCEL_ROUNDS; i++) {
      let isOk = true;
      const orders = await exchange.fetchOpenOrders(symbol);
      for (const order of orders) {
        try {
          await sleep(1_000);
          await exchange.cancelOrder(order.id, symbol);
          error = null;
        } catch (e) {
          isOk = false;
          error = e;
          continue;
        }
      }
      if (!orders.length) {
        error = null;
        break;
      }
      if (isOk) {
        break;
      }
    }
    if (error) {
      throw toTypedError(error);
    }
  }
  {
    let error: unknown = null;
    for (let i = 0; i !== CANCEL_ROUNDS; i++) {
      try {
        await sleep(1_000);
        const { length: hasOrders } = await exchange.fetchOpenOrders(symbol);
        if (hasOrders) {
          error = new Error(`Orders still open for ${symbol} after cancel sweep`);
        } else {
          error = null;
          break;
        }
      } catch (e) {
        error = e;
      }
    }
    if (error) {
      throw toTypedError(error);
    }
  }
}

// commit_trade: TP+SL одним OCO — одна заморозка средств, оба уровня встают
// атомарно. Исходная пара «limit sell + stop_loss_limit sell» на один объём
// невозможна на споте: TP замораживал монеты, SL падал InsufficientFunds.
async function placeBracketsOco(
  exchange: Binance,
  symbol: string,
  qty: number,
  tpPrice: number,
  slPrice: number,
): Promise<void> {
  const market = exchange.market(symbol);
  await (exchange as any).privatePostOrderOco({
    symbol: market.id,
    side: "SELL",
    quantity: exchange.amountToPrecision(symbol, qty),
    price: exchange.priceToPrecision(symbol, tpPrice),        // TP limit
    stopPrice: exchange.priceToPrecision(symbol, slPrice),    // SL триггер
    stopLimitPrice: exchange.priceToPrecision(symbol, slPrice * STOP_LIMIT_SLIPPAGE),
    stopLimitTimeInForce: "GTC",
  });
}

// SL-одиночка (фолбэк, когда второй ноги для OCO нет — напр. после trailingTake
// без стопа); используется и хуками breakeven/trailingStop при отсутствии TP.
async function createStopLossOrder(
  exchange: Binance,
  symbol: string,
  qty: number,
  stopPrice: number,
): Promise<void> {
  const limitPrice = parseFloat(exchange.priceToPrecision(symbol, stopPrice * STOP_LIMIT_SLIPPAGE));
  await exchange.createOrder(symbol, "stop_loss_limit", "sell", qty, limitPrice, { stopPrice });
}

// Аварийная раскрутка: СНАЧАЛА разморозить (cancel-sweep + верификация), потом
// market-sell свободного остатка. Исходная версия продавала то, что сама же
// заморозила TP-ордером, — раскрутка падала, а сырая ошибка демотировала
// постоянный отказ биржи до вечного транзиента. Исходная ошибка ВСЕГДА доходит
// до движка типизированной.
async function unwindPosition(
  exchange: Binance,
  symbol: string,
  originalErr: unknown,
): Promise<never> {
  try {
    await cancelSweepAndVerify(exchange, symbol);
    const freeQty = truncateQty(exchange, symbol, await fetchFreeQty(exchange, symbol));
    if (freeQty > 0) {
      await exchange.createOrder(symbol, "market", "sell", freeQty);
    }
  } catch {
    // раскрутка не удалась — позицию выводит оператор; важнее исходная ошибка
  }
  throw toTypedError(originalErr);
}

// commit_buy: лимитка + полл (await + sleep), по таймауту cancel (гонка учтена)
// и market-добивка остатка → вход гарантирован, ордер на бирже не остаётся.
async function buyLimitGuaranteed(
  exchange: Binance,
  symbol: string,
  qty: number,
  price: number,
  clientOrderId?: string,
): Promise<void> {
  const order = await exchange.createOrder(symbol, "limit", "buy", qty, price,
    clientOrderId ? { clientOrderId } : {});

  let last = order;
  if (last.status !== "closed") {
    let filled = false;
    for (let i = 0; i !== FILL_POLL_ATTEMPTS; i++) {
      await sleep(FILL_POLL_INTERVAL_MS);
      last = await exchange.fetchOrder(order.id, symbol);
      if (last.status === "closed") {
        filled = true;
        break;
      }
    }
    if (!filled) {
      if ((await cancelOrderSafe(exchange, order.id, symbol)) === "filled") {
        return; // исполнился на флажке — это филл
      }
      await sleep(CANCEL_SETTLE_MS);
      const final = await exchange.fetchOrder(order.id, symbol);
      const remainder = truncateQty(exchange, symbol, qty - (final.filled ?? 0));
      if (remainder > 0) {
        await exchange.createOrder(symbol, "market", "buy", remainder);
      }
    }
  }
}

// Зеркало buyLimitGuaranteed для выхода: лимитка чуть ниже рынка + полл, по
// таймауту cancel (гонка учтена) и market-добивка остатка → выход в кеш
// гарантирован. Используется close- и partial-хуками.
async function sellLimitGuaranteed(
  exchange: Binance,
  symbol: string,
  qty: number,
  currentPrice: number,
): Promise<void> {
  const sellPrice = parseFloat(
    exchange.priceToPrecision(symbol, currentPrice * TRADE_SELL_LOWER_PERCENT),
  );
  const order = await exchange.createOrder(symbol, "limit", "sell", qty, sellPrice);

  let last = order;
  if (last.status !== "closed") {
    let filled = false;
    for (let i = 0; i !== FILL_POLL_ATTEMPTS; i++) {
      await sleep(FILL_POLL_INTERVAL_MS);
      last = await exchange.fetchOrder(order.id, symbol);
      if (last.status === "closed") {
        filled = true;
        break;
      }
    }
    if (!filled) {
      if ((await cancelOrderSafe(exchange, order.id, symbol)) !== "filled") {
        await sleep(CANCEL_SETTLE_MS);
        const final = await exchange.fetchOrder(order.id, symbol);
        const remainder = truncateQty(exchange, symbol, qty - (final.filled ?? 0));
        if (remainder > 0) {
          await exchange.createOrder(symbol, "market", "sell", remainder);
        }
      }
    }
  }
}

Broker.useBrokerAdapter(
  class implements Partial<IBroker> {
    async waitForInit(): Promise<void> {
      await getSpotExchange();
    }

    async onOrderOpenCommit(payload: BrokerOrderOpenPayload): Promise<void> {
      if (payload.backtest) return;
      if (payload.type === "schedule") return; // отложенный вход отслеживает движок
      const { symbol, signalId, cost, priceOpen, priceTakeProfit, priceStopLoss, position } = payload;

      if (position === "short") {
        // бизнес-отказ навсегда: спот шортов не знает — дроп без ретраев
        throw new OrderRejectedError(
          `SpotBrokerAdapter: short position is not supported on spot (symbol=${symbol})`,
        );
      }

      const exchange = await getSpotExchange();

      const openPrice = parseFloat(exchange.priceToPrecision(symbol, priceOpen));
      const tpPrice = parseFloat(exchange.priceToPrecision(symbol, priceTakeProfit));
      const slPrice = parseFloat(exchange.priceToPrecision(symbol, priceStopLoss));
      const minNotional = exchange.market(symbol)?.limits?.cost?.min ?? 5;

      // Брекеты на фактический свободный остаток; провал брекетов = провал
      // входа целиком: раскрутка (cancel first → market sell) + типизированный
      // вердикт движку.
      const confirmWithBrackets = async (): Promise<void> => {
        const bracketQty = truncateQty(exchange, symbol, await fetchFreeQty(exchange, symbol));
        if (bracketQty <= 0) return;
        try {
          await placeBracketsOco(exchange, symbol, bracketQty, tpPrice, slPrice);
        } catch (err) {
          await unwindPosition(exchange, symbol, err);
        }
      };

      try {
        // Сверка по clientOrderId = signalId БЕЗУСЛОВНА, не только при attempt > 0:
        // свежая строка того же id (после дропа ретрай-слота ревалидацией движка)
        // приходит с attempt = 0 — гард по attempt пропускал её и покупал повторно.
        // Для нового id сверка стоит один вызов (-2013 → null → слать заново).
        const prior = await fetchEntryByClientId(exchange, symbol, signalId);

        if (prior && prior.executedQty > 0) {
          // Прошлый POST исполнился (потерянный ответ / крэш до брекетов).
          // ⚠️ Найдено ручным brokerdebug (№118а): монеты могут быть уже
          // ЗАМОРОЖЕНЫ в OCO — free=0, но это НЕ «раскручено». Смотрим
          // СУММАРНЫЙ баланс монеты; брекеты добрасываем только если живых
          // ордеров нет (иначе исходная ветка задваивала позицию).
          const balance = await exchange.fetchBalance();
          const base = getBase(exchange, symbol);
          const totalBase = parseFloat(String(balance?.total?.[base] ?? 0));
          if (totalBase * openPrice >= minNotional) {
            const open = await exchange.fetchOpenOrders(symbol);
            if (open.length === 0) {
              await confirmWithBrackets(); // монеты есть, брекетов нет — добросить
            }
            return; // вход подтверждён по clientOrderId — покупку НЕ повторяем
          }
          // монет нет — прошлый вход реально раскручен (unwind), покупаем заново
        } else if (prior && (prior.status === "NEW" || prior.status === "PARTIALLY_FILLED")) {
          // Живой ордер прошлой попытки: СНАЧАЛА снять (clientOrderId
          // освобождается — не будет -2010 duplicate), потом открывать заново.
          // Исходная версия постила дубль поверх живого NEW → -2010 →
          // терминальный дроп при живом собственном ордере на бирже.
          if ((await cancelOrderSafe(exchange, prior.orderId, symbol)) === "filled") {
            await confirmWithBrackets();
            return; // исполнился на флажке — это филл прошлой попытки
          }
          await sleep(CANCEL_SETTLE_MS);
        }

        // СПОТ-САЙЗИНГ ПО КЭШУ: на споте купить можно только на живой USDT.
        // min(номинал, 98% свободного USDT) — запас 2% на комиссию/округление.
        const freeUsdt = parseFloat(String((await exchange.fetchBalance())?.free?.["USDT"] ?? 0));
        const effectiveCost = Math.min(cost, freeUsdt * 0.98);
        if (effectiveCost < minNotional) {
          // кэша меньше минимального нотионала — торговать нечем; постоянный
          // дроп без ретраев, чтобы не спамить каждую минуту
          throw new OrderRejectedError(
            `SpotBrokerAdapter: free USDT ${freeUsdt.toFixed(2)} → cost ${effectiveCost.toFixed(2)} < minNotional ${minNotional} (${symbol}) — вход пропущен`,
          );
        }
        const qty = truncateQty(exchange, symbol, effectiveCost / priceOpen);
        if (qty <= 0) {
          throw new OrderRejectedError(
            `Computed qty is zero for ${symbol} — cost=${effectiveCost}, price=${priceOpen}`,
          );
        }

        await buyLimitGuaranteed(exchange, symbol, qty, openPrice, signalId);
      } catch (err) {
        throw toTypedError(err);
      }

      await confirmWithBrackets();
    }

    async onOrderCloseCommit(payload: BrokerOrderClosePayload): Promise<void> {
      if (payload.backtest) return;
      const { symbol, currentPrice } = payload;
      const exchange = await getSpotExchange();

      try {
        // Шаги 1-2 (commit_cancel): разморозить средства и УБЕДИТЬСЯ, что по
        // символу не осталось ни одного живого ордера — только после этого
        // весь баланс монеты доступен к продаже.
        await cancelSweepAndVerify(exchange, symbol);

        // Шаг 3: выйти в кеш — продать ВЕСЬ свободный баланс монеты (не только
        // объём позиции движка: заодно подметаются транши-сироты).
        const freeQty = truncateQty(exchange, symbol, await fetchFreeQty(exchange, symbol));
        const minNotional = exchange.market(symbol)?.limits?.cost?.min ?? 5;
        if (freeQty * currentPrice < minNotional) {
          return; // пыль — позиция уже пуста, закрытие подтверждаем
        }

        await sellLimitGuaranteed(exchange, symbol, freeQty, currentPrice);
      } catch (err) {
        // сеть → transient: движок держит позицию и ретраит close следующим
        // тиком (bounded CC_ORDER_CLOSE_RETRY_ATTEMPTS, затем force-close —
        // реальную позицию выводит оператор); отказ биржи → rejected.
        // Брекеты при этом уже сняты — до успешного close позицию сторожит
        // софт-SL движка, повторный заход начнётся с cancel-sweep (идемпотентно).
        throw toTypedError(err);
      }
    }

    // ==== Хуки ниже — вне файла Петра, по его правилу «те же принципы»:
    // ==== cancel-sweep → verify → гарантированная продажа/покупка; OCO вместо
    // ==== пары sell; провал брекетов = раскрутка + типизированный вердикт.

    async onPartialProfitCommit(payload: BrokerPartialProfitPayload): Promise<void> {
      if (payload.backtest) return;
      const { symbol, percentToClose, currentPrice, priceTakeProfit, priceStopLoss } = payload;
      const exchange = await getSpotExchange();

      await cancelSweepAndVerify(exchange, symbol);

      const totalQty = await fetchFreeQty(exchange, symbol);
      if (totalQty === 0) {
        throw new Error(`PartialProfit skipped: no open position for ${symbol}`);
      }

      const qty          = truncateQty(exchange, symbol, totalQty * (percentToClose / 100));
      const remainingQty = truncateQty(exchange, symbol, totalQty - qty);
      const tpPrice      = parseFloat(exchange.priceToPrecision(symbol, priceTakeProfit));
      const slPrice      = parseFloat(exchange.priceToPrecision(symbol, priceStopLoss));

      await sellLimitGuaranteed(exchange, symbol, qty, currentPrice);

      if (remainingQty > 0) {
        try {
          await placeBracketsOco(exchange, symbol, remainingQty, tpPrice, slPrice);
        } catch (err) {
          await unwindPosition(exchange, symbol, err);
        }
      }
    }

    async onPartialLossCommit(payload: BrokerPartialLossPayload): Promise<void> {
      if (payload.backtest) return;
      const { symbol, percentToClose, currentPrice, priceTakeProfit, priceStopLoss } = payload;
      const exchange = await getSpotExchange();

      await cancelSweepAndVerify(exchange, symbol);

      const totalQty = await fetchFreeQty(exchange, symbol);
      if (totalQty === 0) {
        throw new Error(`PartialLoss skipped: no open position for ${symbol}`);
      }

      const qty          = truncateQty(exchange, symbol, totalQty * (percentToClose / 100));
      const remainingQty = truncateQty(exchange, symbol, totalQty - qty);
      const tpPrice      = parseFloat(exchange.priceToPrecision(symbol, priceTakeProfit));
      const slPrice      = parseFloat(exchange.priceToPrecision(symbol, priceStopLoss));

      await sellLimitGuaranteed(exchange, symbol, qty, currentPrice);

      if (remainingQty > 0) {
        try {
          await placeBracketsOco(exchange, symbol, remainingQty, tpPrice, slPrice);
        } catch (err) {
          await unwindPosition(exchange, symbol, err);
        }
      }
    }

    async onTrailingStopCommit(payload: BrokerTrailingStopPayload): Promise<void> {
      if (payload.backtest) return;
      const { symbol, newStopLossPrice } = payload;
      const exchange = await getSpotExchange();

      // Брекеты = OCO: снятие одной ноги гасит обе → запоминаем цену TP-ноги,
      // сносим всё верифицированно и пересобираем пару с новым SL.
      const orders = await exchange.fetchOpenOrders(symbol);
      const tpLeg  = orders.find((o) => o.side === "sell" && ["limit", "LIMIT"].includes(o.type ?? "")) ?? null;
      await cancelSweepAndVerify(exchange, symbol);

      const qty = truncateQty(exchange, symbol, await fetchFreeQty(exchange, symbol));
      if (qty === 0) {
        throw new Error(`TrailingStop skipped: no open position for ${symbol}`);
      }

      const slPrice = parseFloat(exchange.priceToPrecision(symbol, newStopLossPrice));
      try {
        if (tpLeg?.price) {
          await placeBracketsOco(exchange, symbol, qty, Number(tpLeg.price), slPrice);
        } else {
          await createStopLossOrder(exchange, symbol, qty, slPrice);
        }
      } catch (err) {
        await unwindPosition(exchange, symbol, err);
      }
    }

    async onTrailingTakeCommit(payload: BrokerTrailingTakePayload): Promise<void> {
      if (payload.backtest) return;
      const { symbol, newTakeProfitPrice } = payload;
      const exchange = await getSpotExchange();

      // Симметрично trailingStop: запоминаем стоп-ногу, пересобираем OCO с новым TP.
      const orders = await exchange.fetchOpenOrders(symbol);
      const slLeg  = orders.find((o) =>
        o.side === "sell" &&
        ["stop_loss_limit", "stop", "STOP_LOSS_LIMIT"].includes(o.type ?? "")
      ) ?? null;
      const slTrigger = Number((slLeg as any)?.stopPrice ?? (slLeg as any)?.triggerPrice ?? 0);
      await cancelSweepAndVerify(exchange, symbol);

      const qty = truncateQty(exchange, symbol, await fetchFreeQty(exchange, symbol));
      if (qty === 0) {
        throw new Error(`TrailingTake skipped: no open position for ${symbol}`);
      }

      const tpPrice = parseFloat(exchange.priceToPrecision(symbol, newTakeProfitPrice));
      try {
        if (slTrigger > 0) {
          await placeBracketsOco(exchange, symbol, qty, tpPrice, slTrigger);
        } else {
          await exchange.createOrder(symbol, "limit", "sell", qty, tpPrice);
        }
      } catch (err) {
        await unwindPosition(exchange, symbol, err);
      }
    }

    async onBreakevenCommit(payload: BrokerBreakevenPayload): Promise<void> {
      if (payload.backtest) return;
      const { symbol, newStopLossPrice } = payload;
      const exchange = await getSpotExchange();

      // OCO-пересборка (см. onTrailingStopCommit).
      const orders = await exchange.fetchOpenOrders(symbol);
      const tpLeg  = orders.find((o) => o.side === "sell" && ["limit", "LIMIT"].includes(o.type ?? "")) ?? null;
      await cancelSweepAndVerify(exchange, symbol);

      const qty = truncateQty(exchange, symbol, await fetchFreeQty(exchange, symbol));
      if (qty === 0) {
        throw new Error(`Breakeven skipped: no open position for ${symbol}`);
      }

      const slPrice = parseFloat(exchange.priceToPrecision(symbol, newStopLossPrice));
      try {
        if (tpLeg?.price) {
          await placeBracketsOco(exchange, symbol, qty, Number(tpLeg.price), slPrice);
        } else {
          await createStopLossOrder(exchange, symbol, qty, slPrice);
        }
      } catch (err) {
        await unwindPosition(exchange, symbol, err);
      }
    }

    async onAverageBuyCommit(payload: BrokerAverageBuyPayload): Promise<void> {
      if (payload.backtest) return;
      const { symbol, currentPrice, cost, priceTakeProfit, priceStopLoss } = payload;
      const exchange = await getSpotExchange();

      await cancelSweepAndVerify(exchange, symbol);

      const existing    = await fetchFreeQty(exchange, symbol);
      const minNotional = exchange.market(symbol)?.limits?.cost?.min ?? 5;
      if (existing * currentPrice < minNotional) {
        throw new Error(`AverageBuy skipped: no open position for ${symbol}`);
      }

      // Сайзинг DCA — по кэшу, как у входа (min(номинал, 98% свободного USDT)).
      const freeUsdt = parseFloat(String((await exchange.fetchBalance())?.free?.["USDT"] ?? 0));
      const effectiveCost = Math.min(cost, freeUsdt * 0.98);
      if (effectiveCost < minNotional) {
        throw new OrderRejectedError(
          `AverageBuy: free USDT ${freeUsdt.toFixed(2)} < minNotional ${minNotional} (${symbol}) — DCA пропущен`,
        );
      }
      const qty = truncateQty(exchange, symbol, effectiveCost / currentPrice);
      if (qty <= 0) {
        throw new Error(`Computed qty is zero for ${symbol} — cost=${effectiveCost}, price=${currentPrice}`);
      }

      const entryPrice = parseFloat(exchange.priceToPrecision(symbol, currentPrice));
      const tpPrice    = parseFloat(exchange.priceToPrecision(symbol, priceTakeProfit));
      const slPrice    = parseFloat(exchange.priceToPrecision(symbol, priceStopLoss));

      await buyLimitGuaranteed(exchange, symbol, qty, entryPrice);

      const totalQty = truncateQty(exchange, symbol, await fetchFreeQty(exchange, symbol));
      try {
        await placeBracketsOco(exchange, symbol, totalQty, tpPrice, slPrice);
      } catch (err) {
        await unwindPosition(exchange, symbol, err);
      }
    }
  },
);

Broker.enable();
// listenExit НЕ вайрим: @backtest-kit/cli сам дропает процесс на exitEmitter —
// systemd перезапустит.
