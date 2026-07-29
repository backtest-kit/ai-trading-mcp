import {
  addOutline,
  ask,
  dumpOutlineResult,
  IOutlineHistory,
} from 'agent-swarm-kit';
import { str } from 'functools-kit';
import { getCandles } from 'backtest-kit';
import { OutlineName } from '../../enum/OutlineName';
import { CompletionName } from '../../enum/CompletionName';
import { AdvisorName } from '../../enum/AdvisorName';
import { RiskOutlineContract, RiskOutlineFormat } from '../../contract/RiskOutline';
import { zodResponseFormat } from "openai/helpers/zod";

const PRE_CANDLES_LIMIT = 1440; // 24h 1m свечей для метрик
const SHORT_MIN_AVG_RANGE_PCT = 0.07;
const LONG_MIN_MOMENTUM_24H_PCT = -1;

const RISK_PROMPT = str.newline(
  'Ты — детектор скам-сигналов телеграм-каналов. Твоя единственная задача — ответить, можно ли торговать предложенный канал-сигнал. Ответ — поле action: "follow" (открыть позицию в направлении канала) или "skip" (пропустить).',
  '',
  'Решение принимай ТОЛЬКО на основе двух эмпирически выведенных правил. Никаких других соображений (тренд, новости, momentum коротких интервалов) тебя НЕ интересуют. Применяй правила буквально.',
  '',
  '**Доступные данные:**',
  ' - Pre-computed метрики (приходят отдельным user-сообщением): avgRangePct и momentum24hPct за 24 часа до публикации.',
  ' - 1m свечи за последние 4 часа и 15m свечи за последние 8 часов — для оценки sure_level и confidence (audit log).',
  ' - Draft сигнал канала: symbol, direction (LONG или SHORT), targets, stoploss.',
  '',
  '**Правила решения action:**',
  '',
  '**ПРАВИЛО 1 (sleeping coin SHORT):**',
  ` Если direction = SHORT И avgRangePct < ${SHORT_MIN_AVG_RANGE_PCT}% → action = "skip".`,
  ' Объяснение: "спящий" актив с тонкой ликвидностью (узкий диапазон 1m свечей) — идеальная мишень для stop-hunt. Канал зовёт в SHORT, market-maker одной крупной свечой выбьет стопы вверх.',
  '',
  '**ПРАВИЛО 2 (knife-catching LONG):**',
  ` Если direction = LONG И momentum24hPct < ${LONG_MIN_MOMENTUM_24H_PCT}% → action = "skip".`,
  ' Объяснение: канал зовёт в LONG на падающем рынке. Подписчики покупают на спуске, рынок продолжает идти вниз, стоп выбивает.',
  '',
  '**ПРАВИЛО 3 (default):**',
  ' Если ни одно правило skip не сработало → action = "follow".',
  '',
  '**ВАЖНО:** action НЕ ЗАВИСИТ от sure_level и confidence. Правила применяются строго по метрикам avgRangePct/momentum24hPct и direction. sure_level и confidence идут в audit log и нужны для пост-анализа.',
  '',
  '**Шаги для action:**',
  '  Шаг 1. Считай avgRangePct и momentum24hPct из метрик (они уже посчитаны и переданы тебе).',
  '  Шаг 2. Проверь ПРАВИЛО 1 (SHORT + низкая волатильность).',
  '  Шаг 3. Проверь ПРАВИЛО 2 (LONG + падающий рынок).',
  '  Шаг 4. Если ни одно правило не сработало → action = "follow".',
  '',
  '**Audit-поля (заполняй честно, но они НЕ влияют на action):**',
  '',
  '  **sure_level** — уверенность что в свечах есть следы накопления:',
  '  - low: структура объёма органична',
  '  - low_medium: одна свежая аномалия без смещения',
  '  - medium: одна аномалия давно или со смещением цены',
  '  - medium_high: повторяющееся накопление',
  '  - high: множественное накопление с явным смещением цены',
  '',
  '  **confidence** — надёжность данных:',
  '  - reliable: доступно >= 60 1m свечей, метрики однозначны',
  '  - not_reliable: данных мало или они противоречивы',
  '',
  '**Требуемый результат:**',
  '',
  '1. **action**: "skip" или "follow".',
  '2. **sure_level**: один из пяти уровней.',
  '3. **confidence**: reliable или not_reliable.',
  '4. **description**: 2-3 предложения. Назови применённое правило с конкретными числами. Пример:',
  '   "Action skip. SHORT на спящем активе (avgRangePct 0.045% < 0.07%) — stop-hunt мишень. Sure_level high, confidence reliable."',
  '5. **reasoning**: ОДНА СТРОКА (тип string). НЕ объект, НЕ словарь, НЕ массив. Шаги разделены переводами строк \\n.',
  '',
  '   Пример reasoning:',
  '   "Шаг 1: avgRangePct=0.045%, momentum24hPct=1.18%\\nШаг 2: direction=SHORT И avgRangePct < 0.07% → правило 1 сработало → action=skip\\nШаг 3: sure_level=high (множественное накопление), confidence=reliable (240 свечей доступны)"',
  '',
  '**Принципы:**',
  ' - Правила буквальные. Никакой "интуиции".',
  ' - Все числа из pre-computed метрик. Не пересчитывай.',
  ' - Если в метриках написано avgRangePct=0.069, это меньше 0.07 → правило 1 сработает для SHORT.',
  ' - reasoning — это плоская строка с \\n, НЕ JSON-объект.',
);

const commitOneMinuteHistory = async (
  symbol: string,
  history: IOutlineHistory,
) => {
  const report = await ask(
    symbol,
    AdvisorName.StockData1mAdvisor,
  );
  if (!report) {
    throw new Error("StockData1mAdvisor failed");
  }
  await history.push(
    {
      role: "user",
      content: str.newline(
        "Прочитай последние минутные свечи и скажи OK",
        "",
        report,
      ),
    },
    {
      role: "assistant",
      content: "OK",
    },
  );
};

const commitFifteenMinuteHistory = async (
  symbol: string,
  history: IOutlineHistory,
) => {
  const report = await ask(
    symbol,
    AdvisorName.StockData15mAdvisor,
  );
  if (!report) {
    throw new Error("StockData15mAdvisor failed");
  }
  await history.push(
    {
      role: "user",
      content: str.newline(
        "Прочитай последние свечи пятнадцать минут и скажи OK",
        "",
        report,
      ),
    },
    {
      role: "assistant",
      content: "OK",
    },
  );
};

const commitMetricsHistory = async (
  symbol: string,
  history: IOutlineHistory,
) => {
  const candles = await getCandles(symbol, "1m", PRE_CANDLES_LIMIT);
  if (candles.length === 0) {
    throw new Error("commitMetricsHistory: no candles returned");
  }
  const avgRangePct =
    candles.reduce((acc, c) => acc + ((c.high - c.low) / c.close) * 100, 0) /
    candles.length;
  const momentum24hPct =
    ((candles[candles.length - 1].close - candles[0].open) /
      candles[0].open) *
    100;
  await history.push(
    {
      role: "user",
      content: str.newline(
        "Прочитай pre-computed метрики за 24 часа до публикации сигнала и скажи OK",
        "",
        `avgRangePct: ${avgRangePct.toFixed(4)}%`,
        `momentum24hPct: ${momentum24hPct.toFixed(2)}%`,
        `candlesCount: ${candles.length}`,
      ),
    },
    {
      role: "assistant",
      content: "OK",
    },
  );
};

const commitDraftSignal = async (
  draftSignal: {
    symbol: string,
    direction: "short" | "long",
    targets: number[],
    stoploss: number,
  },
  history: IOutlineHistory
) => {
  await history.push([
    {
      role: "user",
      content: str.newline(
        "Прочитай DRAFT СИГНАЛ ДЛЯ ПРОВЕРКИ",
        "",
        `Символ: ${draftSignal.symbol}`,
        `Позиция: ${draftSignal.direction.toUpperCase()}`,
        `Targets: ${draftSignal.targets.map((value) => `${value.toFixed(6)} USD`).join(", ")}`,
        `Hard Stop: ${draftSignal.stoploss.toFixed(6)} USD`,
      ),
    },
    {
      role: "assistant",
      content: "Draft сигнал получен.",
    },
  ]);
};

addOutline<RiskOutlineContract>({
  outlineName: OutlineName.RiskOutline,
  completion: CompletionName.OllamaOutlineToolCompletion,
  format: zodResponseFormat(RiskOutlineFormat, "risk_assessment"),
  getOutlineHistory: async (
    { history },
    symbol: string,
    direction: "short" | "long",
    targets: number[],
    stoploss: number,
  ) => {

    await history.push({ role: 'system', content: RISK_PROMPT });

    await commitOneMinuteHistory(
      symbol,
      history,
    );

    await commitFifteenMinuteHistory(
      symbol,
      history,
    );

    await commitMetricsHistory(
      symbol,
      history,
    );

    await commitDraftSignal(
      { symbol, direction, stoploss, targets },
      history,
    );

    await history.push({
      role: 'user',
      content: str.newline(
        "Применяй правила из system prompt буквально по pre-computed метрикам.",
        "Верни action, sure_level, confidence, description, reasoning."
      )
    });
  },
  validations: [
    {
      validate: ({ data }) => {
        const ACTIONS = ["skip", "follow"];
        if (!ACTIONS.includes(data.action)) {
          throw new Error(`action "${data.action}" вне допустимого набора ${ACTIONS.join(", ")}`);
        }
      },
      docDescription: "Проверяет, что action — skip или follow.",
    },
    {
      validate: ({ data }) => {
        const SURE_LEVELS = ["low", "low_medium", "medium", "medium_high", "high"];
        if (!SURE_LEVELS.includes(data.sure_level)) {
          throw new Error(`sure_level "${data.sure_level}" вне допустимого набора ${SURE_LEVELS.join(", ")}`);
        }
      },
      docDescription: "Проверяет, что sure_level — один из пяти допустимых уровней.",
    },
    {
      validate: ({ data }) => {
        if (data.confidence !== "reliable" && data.confidence !== "not_reliable") {
          throw new Error(`confidence "${data.confidence}" должен быть reliable или not_reliable`);
        }
      },
      docDescription: "Проверяет, что confidence — reliable или not_reliable.",
    },
    {
      validate: ({ data }) => {
        if (typeof data.description !== "string" || data.description.trim().length < 30) {
          throw new Error(`description слишком короткий (${data.description?.length ?? 0} симв.), нужен полноценный вердикт`);
        }
      },
      docDescription: "Проверяет, что description содержит полноценный вердикт (>= 30 символов).",
    },
    {
      validate: ({ data }) => {
        if (typeof data.reasoning !== "string" || data.reasoning.trim().length < 80) {
          throw new Error(`reasoning слишком короткий (${data.reasoning?.length ?? 0} симв.), ожидается пошаговое обоснование`);
        }
      },
      docDescription: "Проверяет, что reasoning содержит обоснование шагов (>= 80 символов).",
    },
  ],
  callbacks: {
    async onValidDocument(result) {
      if (!result.data) {
        return;
      }
      await dumpOutlineResult(result, './dump/outline/risk');
    },
  },
});
