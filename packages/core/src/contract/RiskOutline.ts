import { str } from "functools-kit";
import { z } from "zod";

export const RiskOutlineFormat = z.object({
  action: z
    .enum(["skip", "follow"])
    .describe(
      str.newline(
        "Решение об открытии позиции:",
        "follow — открыть позицию в направлении канала (direction из draft signal)",
        "skip — пропустить сигнал, не открывать позицию",
      )
    ),
  sure_level: z
    .enum(["low", "low_medium", "medium", "medium_high", "high"])
    .describe(
      str.newline(
        "Уровень уверенности в наличии манипуляции в свечах (для audit log):",
        "low — следов нет, структура объёма органична",
        "low_medium — одна свежая аномалия без смещения",
        "medium — одна аномалия давно или со смещением цены",
        "medium_high — повторяющееся накопление",
        "high — множественное накопление с явным смещением цены",
      )
    ),
  confidence: z
    .enum(["reliable", "not_reliable"])
    .describe(
      str.newline(
        "Уверенность в оценке (для audit log):",
        "reliable — данные однозначны",
        "not_reliable — данные противоречивы, слабые или отсутствуют",
      )
    ),
  description: z
    .string()
    .describe(
      str.newline(
        "Краткое объяснение action для трейдера (2-3 предложения).",
        "Назови применённое правило и числа. Пример:",
        "'Action skip. SHORT на спящем активе (avgRangePct 0.045% < 0.07%) — stop-hunt мишень. Sure_level high, confidence reliable.'"
      )
    ),
  reasoning: z
    .string()
    .describe(
      str.newline(
        "Детальное обоснование (одна строка с переводами через \\n, НЕ объект, НЕ массив):",
        "Шаг 1: avgRangePct=X%, momentum24hPct=Y% (из метрик)",
        "Шаг 2: применённое правило → action",
        "Шаг 3: sure_level и confidence",
      )
    ),
});

export type RiskOutlineContract = z.infer<typeof RiskOutlineFormat>;
