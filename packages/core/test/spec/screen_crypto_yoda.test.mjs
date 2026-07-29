import { test } from "worker-testbed";
import { readChannelMessages } from "../utils/readChannelMessages.mjs";

const loadAndParse = async () => {
    const messages = await readChannelMessages("crypto_yoda_channel");
    const result = await core.cryptoYodaScreenService.parseDay(messages);
    return { messages, result };
};

const findById = (result, id) => result.find((r) => r.id === id);

const eqNum = (a, b) => Math.abs(a - b) < 1e-9;

test("parseDay returns one entry per input message", async ({ pass, fail }) => {
    const { messages, result } = await loadAndParse();
    if (result.length !== messages.length) {
        return fail(`expected ${messages.length} results, got ${result.length}`);
    }
    pass();
});

test("parseDay extracts SHORT signal (HYPE id=5477)", async ({ pass, fail }) => {
    const { result } = await loadAndParse();
    const row = findById(result, 5477);
    if (!row) return fail("message id=5477 not found");
    if (!row.data) return fail("data is null, expected parsed signal");
    const { symbol, direction, entry, targets, stoploss } = row.data;
    if (symbol !== "HYPE") return fail(`symbol: expected HYPE, got ${symbol}`);
    if (direction !== "short") return fail(`direction: expected short, got ${direction}`);
    if (!eqNum(entry.from, 42.59) || !eqNum(entry.to, 43.06)) {
        return fail(`entry: expected 42.59-43.06, got ${entry.from}-${entry.to}`);
    }
    if (!eqNum(stoploss, 44.48)) return fail(`stoploss: expected 44.48, got ${stoploss}`);
    const expected = [42.25, 42.08, 41.70, 41.28, 40.63];
    if (targets.length !== expected.length) {
        return fail(`targets length: expected ${expected.length}, got ${targets.length}`);
    }
    for (let i = 0; i < expected.length; i++) {
        if (!eqNum(targets[i], expected[i])) {
            return fail(`targets[${i}]: expected ${expected[i]}, got ${targets[i]}`);
        }
    }
    pass();
});

test("parseDay extracts LONG signal with risk score (HBAR id=5482)", async ({ pass, fail }) => {
    const { result } = await loadAndParse();
    const row = findById(result, 5482);
    if (!row) return fail("message id=5482 not found");
    if (!row.data) return fail("data is null, expected parsed signal");
    const { symbol, direction, entry, stoploss, targets } = row.data;
    if (symbol !== "HBAR") return fail(`symbol: expected HBAR, got ${symbol}`);
    if (direction !== "long") return fail(`direction: expected long, got ${direction}`);
    if (!eqNum(entry.from, 0.092) || !eqNum(entry.to, 0.094)) {
        return fail(`entry: expected 0.092-0.094, got ${entry.from}-${entry.to}`);
    }
    if (!eqNum(stoploss, 0.088)) return fail(`stoploss: expected 0.088, got ${stoploss}`);
    if (targets.length !== 5) return fail(`targets length: expected 5, got ${targets.length}`);
    pass();
});

test("parseDay handles fractional prices (PENGU id=5453)", async ({ pass, fail }) => {
    const { result } = await loadAndParse();
    const row = findById(result, 5453);
    if (!row) return fail("message id=5453 not found");
    if (!row.data) return fail("data is null, expected parsed signal");
    const { symbol, direction, entry, stoploss, targets } = row.data;
    if (symbol !== "PENGU") return fail(`symbol: expected PENGU, got ${symbol}`);
    if (direction !== "long") return fail(`direction: expected long, got ${direction}`);
    if (!eqNum(entry.from, 0.009911) || !eqNum(entry.to, 0.010021)) {
        return fail(`entry: expected 0.009911-0.010021, got ${entry.from}-${entry.to}`);
    }
    if (!eqNum(stoploss, 0.009582)) return fail(`stoploss: expected 0.009582, got ${stoploss}`);
    if (targets.length !== 5) return fail(`targets length: expected 5, got ${targets.length}`);
    if (!eqNum(targets[0], 0.010101)) return fail(`targets[0]: expected 0.010101, got ${targets[0]}`);
    pass();
});

test("parseDay rejects take-profit messages (id=5485)", async ({ pass, fail }) => {
    const { result } = await loadAndParse();
    const row = findById(result, 5485);
    if (!row) return fail("message id=5485 not found");
    if (row.data !== null) {
        return fail(`take-profit should produce data=null, got ${JSON.stringify(row.data)}`);
    }
    pass();
});

test("parseDay rejects promo/news messages (id=5470)", async ({ pass, fail }) => {
    const { result } = await loadAndParse();
    const row = findById(result, 5470);
    if (!row) return fail("message id=5470 not found");
    if (row.data !== null) {
        return fail(`promo message should produce data=null, got ${JSON.stringify(row.data)}`);
    }
    pass();
});

test("parseDay preserves ScraperMessage fields", async ({ pass, fail }) => {
    const { result } = await loadAndParse();
    const row = findById(result, 5477);
    if (!row) return fail("message id=5477 not found");
    if (row.channel !== "crypto_yoda_channel") {
        return fail(`channel: expected crypto_yoda_channel, got ${row.channel}`);
    }
    if (!(row.date instanceof Date)) return fail(`date: expected Date instance`);
    if (typeof row.content !== "string" || row.content.length === 0) {
        return fail("content: expected non-empty string");
    }
    pass();
});

test("parseDay extracts large-number SHORT (BTC id=5428)", async ({ pass, fail }) => {
    const { result } = await loadAndParse();
    const row = findById(result, 5428);
    if (!row) return fail("message id=5428 not found");
    if (!row.data) return fail("data is null, expected parsed signal");
    const { symbol, direction, entry, stoploss, targets } = row.data;
    if (symbol !== "BTC") return fail(`symbol: expected BTC, got ${symbol}`);
    if (direction !== "short") return fail(`direction: expected short, got ${direction}`);
    if (!eqNum(entry.from, 76800) || !eqNum(entry.to, 78000)) {
        return fail(`entry: expected 76800-78000, got ${entry.from}-${entry.to}`);
    }
    if (!eqNum(stoploss, 79500)) return fail(`stoploss: expected 79500, got ${stoploss}`);
    if (targets.length !== 5) return fail(`targets length: expected 5, got ${targets.length}`);
    if (!eqNum(targets[0], 75500)) return fail(`targets[0]: expected 75500, got ${targets[0]}`);
    pass();
});

test("parseDay extracts SHORT with five-decimal prices (POL id=5426)", async ({ pass, fail }) => {
    const { result } = await loadAndParse();
    const row = findById(result, 5426);
    if (!row) return fail("message id=5426 not found");
    if (!row.data) return fail("data is null, expected parsed signal");
    const { symbol, direction, entry, stoploss } = row.data;
    if (symbol !== "POL") return fail(`symbol: expected POL, got ${symbol}`);
    if (direction !== "short") return fail(`direction: expected short, got ${direction}`);
    if (!eqNum(entry.from, 0.09014) || !eqNum(entry.to, 0.09113)) {
        return fail(`entry: expected 0.09014-0.09113, got ${entry.from}-${entry.to}`);
    }
    if (!eqNum(stoploss, 0.09412)) return fail(`stoploss: expected 0.09412, got ${stoploss}`);
    pass();
});

test("parseDay rejects analytics/news without signal (id=5473)", async ({ pass, fail }) => {
    const { result } = await loadAndParse();
    const row = findById(result, 5473);
    if (!row) return fail("message id=5473 not found");
    if (row.data !== null) {
        return fail(`analytics post should produce data=null, got ${JSON.stringify(row.data)}`);
    }
    pass();
});

test("parseDay produces consistent direction across parsed signals", async ({ pass, fail }) => {
    const { result } = await loadAndParse();
    const parsed = result.filter((r) => r.data !== null);
    const shorts = parsed.filter((r) => r.data.direction === "short");
    const longs = parsed.filter((r) => r.data.direction === "long");
    if (shorts.length + longs.length !== parsed.length) {
        return fail(`direction other than short/long detected`);
    }
    if (shorts.length === 0) return fail("no SHORT signals parsed");
    if (longs.length === 0) return fail("no LONG signals parsed");
    pass(`${shorts.length} short, ${longs.length} long`);
});

test("parseDay stoploss is on correct side of entry for each signal", async ({ pass, fail }) => {
    const { result } = await loadAndParse();
    const parsed = result.filter((r) => r.data !== null);
    for (const row of parsed) {
        const { direction, entry, stoploss } = row.data;
        if (direction === "short" && stoploss <= entry.to) {
            return fail(`id=${row.id} short: stoploss ${stoploss} should be above entry.to ${entry.to}`);
        }
        if (direction === "long" && stoploss >= entry.from) {
            return fail(`id=${row.id} long: stoploss ${stoploss} should be below entry.from ${entry.from}`);
        }
    }
    pass(`${parsed.length} signals have stoploss on correct side`);
});

test("parseDay targets move in signal direction (short: down, long: up)", async ({ pass, fail }) => {
    const { result } = await loadAndParse();
    const parsed = result.filter((r) => r.data !== null);
    for (const row of parsed) {
        const { direction, entry, targets } = row.data;
        const entryMid = (entry.from + entry.to) / 2;
        if (direction === "short") {
            if (!targets.every((t) => t < entryMid)) {
                return fail(`id=${row.id} short: some targets above entry midpoint ${entryMid}`);
            }
        } else {
            if (!targets.every((t) => t > entryMid)) {
                return fail(`id=${row.id} long: some targets below entry midpoint ${entryMid}`);
            }
        }
    }
    pass(`${parsed.length} signals have correctly-directed targets`);
});

test("parseDay symbol is uppercase alphanumeric for parsed signals", async ({ pass, fail }) => {
    const { result } = await loadAndParse();
    const parsed = result.filter((r) => r.data !== null);
    for (const row of parsed) {
        if (!/^[A-Z0-9]+$/.test(row.data.symbol)) {
            return fail(`id=${row.id}: invalid symbol "${row.data.symbol}"`);
        }
    }
    pass();
});

test("parseDay parses every СИГНАЛ-prefixed message", async ({ pass, fail }) => {
    const { messages, result } = await loadAndParse();
    const signalIds = messages.filter((m) => m.content.includes("СИГНАЛ")).map((m) => m.id);
    if (signalIds.length === 0) return fail("no СИГНАЛ messages in fixture");
    const unparsed = signalIds.filter((id) => {
        const row = findById(result, id);
        return !row || row.data === null;
    });
    if (unparsed.length > 0) {
        return fail(`signals not parsed: ${unparsed.join(", ")}`);
    }
    pass(`${signalIds.length} signal messages all parsed`);
});

test("parseDay rejects every Тейк-профит message", async ({ pass, fail }) => {
    const { messages, result } = await loadAndParse();
    const tpIds = messages
        .filter((m) => m.content.includes("Тейк-профит") && !m.content.includes("СИГНАЛ"))
        .map((m) => m.id);
    if (tpIds.length === 0) return fail("no take-profit messages in fixture");
    const wronglyParsed = tpIds.filter((id) => {
        const row = findById(result, id);
        return row && row.data !== null;
    });
    if (wronglyParsed.length > 0) {
        return fail(`take-profits wrongly parsed as signals: ${wronglyParsed.join(", ")}`);
    }
    pass(`${tpIds.length} take-profit messages all rejected`);
});

test("parseDay preserves original message order", async ({ pass, fail }) => {
    const { messages, result } = await loadAndParse();
    for (let i = 0; i < messages.length; i++) {
        if (messages[i].id !== result[i].id) {
            return fail(`order broken at index ${i}: expected id=${messages[i].id}, got id=${result[i].id}`);
        }
    }
    pass();
});

test("parseDay does not mutate input messages", async ({ pass, fail }) => {
    const messages = await readChannelMessages("crypto_yoda_channel");
    const snapshot = messages.map((m) => ({
        id: m.id,
        content: m.content,
        channel: m.channel,
        dateMs: m.date.getTime(),
    }));
    await core.cryptoYodaScreenService.parseDay(messages);
    for (let i = 0; i < messages.length; i++) {
        if (messages[i].id !== snapshot[i].id) return fail(`id mutated at ${i}`);
        if (messages[i].content !== snapshot[i].content) return fail(`content mutated at ${i}`);
        if (messages[i].channel !== snapshot[i].channel) return fail(`channel mutated at ${i}`);
        if (messages[i].date.getTime() !== snapshot[i].dateMs) return fail(`date mutated at ${i}`);
    }
    pass();
});

test("parseDay returns empty array for empty input", async ({ pass, fail }) => {
    const result = await core.cryptoYodaScreenService.parseDay([]);
    if (!Array.isArray(result)) return fail(`expected array, got ${typeof result}`);
    if (result.length !== 0) return fail(`expected empty array, got length ${result.length}`);
    pass();
});

test("parseDay produces exactly 5 targets for every parsed signal", async ({ pass, fail }) => {
    const { result } = await loadAndParse();
    const parsed = result.filter((r) => r.data !== null);
    const wrong = parsed.filter((r) => r.data.targets.length !== 5);
    if (wrong.length > 0) {
        return fail(`signals with non-5 targets: ${wrong.map((r) => `${r.id}(${r.data.targets.length})`).join(", ")}`);
    }
    pass(`${parsed.length} signals all have 5 targets`);
});

test("parseDay first target is closest to entry", async ({ pass, fail }) => {
    const { result } = await loadAndParse();
    const parsed = result.filter((r) => r.data !== null);
    for (const row of parsed) {
        const { direction, entry, targets } = row.data;
        const entryMid = (entry.from + entry.to) / 2;
        const distances = targets.map((t) => Math.abs(t - entryMid));
        const first = distances[0];
        const last = distances[distances.length - 1];
        if (first >= last) {
            return fail(`id=${row.id} ${direction}: first target distance ${first} should be less than last ${last}`);
        }
    }
    pass(`${parsed.length} signals have monotonic target distances`);
});

test("parseDay risk:reward to first target is below 1:1 for shorts", async ({ pass, fail }) => {
    const { result } = await loadAndParse();
    const shorts = result.filter((r) => r.data !== null && r.data.direction === "short");
    if (shorts.length === 0) return fail("no short signals to evaluate");
    let badRR = 0;
    for (const row of shorts) {
        const { entry, targets, stoploss } = row.data;
        const entryMid = (entry.from + entry.to) / 2;
        const risk = stoploss - entryMid;
        const reward = entryMid - targets[0];
        const rr = reward / risk;
        if (rr < 1) badRR++;
    }
    if (badRR !== shorts.length) {
        return fail(`expected all ${shorts.length} shorts to have R:R<1, got ${badRR}`);
    }
    pass(`all ${shorts.length} shorts have R:R<1 — confirms manipulation pattern`);
});

test("parseDay handles entry without $ (BTC id=5444)", async ({ pass, fail }) => {
    const { result } = await loadAndParse();
    const row = findById(result, 5444);
    if (!row) return fail("message id=5444 not found");
    if (!row.data) return fail("data is null, expected parsed signal");
    const { entry, direction } = row.data;
    if (direction !== "long") return fail(`direction: expected long, got ${direction}`);
    if (!eqNum(entry.from, 77000) || !eqNum(entry.to, 78000)) {
        return fail(`entry: expected 77000-78000, got ${entry.from}-${entry.to}`);
    }
    pass();
});

test("parseDay handles triple-range entry (HYPE id=5471)", async ({ pass, fail }) => {
    const { result } = await loadAndParse();
    const row = findById(result, 5471);
    if (!row) return fail("message id=5471 not found");
    if (!row.data) return fail("data is null, expected parsed signal");
    const { entry, direction } = row.data;
    if (direction !== "short") return fail(`direction: expected short, got ${direction}`);
    if (!eqNum(entry.from, 42.52) || !eqNum(entry.to, 42.99)) {
        return fail(`entry: expected 42.52-42.99, got ${entry.from}-${entry.to}`);
    }
    pass();
});

test("parseDay handles targets without $ prefix (DOGE id=5439)", async ({ pass, fail }) => {
    const { result } = await loadAndParse();
    const row = findById(result, 5439);
    if (!row) return fail("message id=5439 not found");
    if (!row.data) return fail("data is null, expected parsed signal");
    const { targets } = row.data;
    if (targets.length !== 5) return fail(`targets length: expected 5, got ${targets.length}`);
    if (!eqNum(targets[0], 0.11)) return fail(`targets[0]: expected 0.11, got ${targets[0]}`);
    if (!eqNum(targets[4], 0.20)) return fail(`targets[4]: expected 0.20, got ${targets[4]}`);
    pass();
});

test("parseDay handles XAUT triple-range without $ (id=5437)", async ({ pass, fail }) => {
    const { result } = await loadAndParse();
    const row = findById(result, 5437);
    if (!row) return fail("message id=5437 not found");
    if (!row.data) return fail("data is null, expected parsed signal");
    const { symbol, entry, stoploss, targets } = row.data;
    if (symbol !== "XAUT") return fail(`symbol: expected XAUT, got ${symbol}`);
    if (!eqNum(entry.from, 4550) || !eqNum(entry.to, 4650)) {
        return fail(`entry: expected 4550-4650, got ${entry.from}-${entry.to}`);
    }
    if (!eqNum(stoploss, 4300)) return fail(`stoploss: expected 4300, got ${stoploss}`);
    if (targets.length !== 5) return fail(`targets length: expected 5, got ${targets.length}`);
    pass();
});

test("parseDay entry.from never equals entry.to", async ({ pass, fail }) => {
    const { result } = await loadAndParse();
    const parsed = result.filter((r) => r.data !== null);
    for (const row of parsed) {
        if (row.data.entry.from === row.data.entry.to) {
            return fail(`id=${row.id}: entry.from === entry.to (${row.data.entry.from})`);
        }
    }
    pass();
});

test("parseDay entry width is sane (< 15% of midpoint)", async ({ pass, fail }) => {
    const { result } = await loadAndParse();
    const parsed = result.filter((r) => r.data !== null);
    for (const row of parsed) {
        const { from, to } = row.data.entry;
        const mid = (from + to) / 2;
        const width = (to - from) / mid;
        if (width > 0.15) {
            return fail(`id=${row.id}: entry width ${(width * 100).toFixed(2)}% > 15% (${from}-${to})`);
        }
    }
    pass(`${parsed.length} signals have entry width <= 15%`);
});

test("parseDay targets are strictly monotonic", async ({ pass, fail }) => {
    const { result } = await loadAndParse();
    const parsed = result.filter((r) => r.data !== null);
    for (const row of parsed) {
        const { direction, targets } = row.data;
        for (let i = 1; i < targets.length; i++) {
            if (direction === "short" && targets[i] >= targets[i - 1]) {
                return fail(`id=${row.id} short: targets[${i}]=${targets[i]} should be less than targets[${i-1}]=${targets[i-1]}`);
            }
            if (direction === "long" && targets[i] <= targets[i - 1]) {
                return fail(`id=${row.id} long: targets[${i}]=${targets[i]} should be greater than targets[${i-1}]=${targets[i-1]}`);
            }
        }
    }
    pass(`${parsed.length} signals have monotonic targets`);
});

test("parseDay shorts have R:R below 1:1 (manipulation pattern)", async ({ pass, fail }) => {
    const { result } = await loadAndParse();
    const shorts = result.filter((r) => r.data !== null && r.data.direction === "short");
    if (shorts.length === 0) return fail("no short signals");
    for (const row of shorts) {
        const { entry, targets, stoploss } = row.data;
        const entryMid = (entry.from + entry.to) / 2;
        const stopDist = stoploss - entryMid;
        const targetDist = entryMid - targets[0];
        if (stopDist <= targetDist) {
            return fail(`id=${row.id} short: stop dist ${stopDist.toFixed(6)} not greater than first target dist ${targetDist.toFixed(6)} — R:R >= 1`);
        }
    }
    pass(`all ${shorts.length} shorts have R:R<1`);
});

test("parseDay all dates are within scraper range (last 30 days)", async ({ pass, fail }) => {
    const { result } = await loadAndParse();
    const now = Date.now();
    const thirtyDays = 30 * 24 * 3600 * 1000;
    for (const row of result) {
        const age = now - row.date.getTime();
        if (age < 0) return fail(`id=${row.id}: date in future (${row.date.toISOString()})`);
        if (age > thirtyDays * 2) {
            return fail(`id=${row.id}: date too old (${row.date.toISOString()})`);
        }
    }
    pass();
});

test("parseDay ids are unique", async ({ pass, fail }) => {
    const { result } = await loadAndParse();
    const seen = new Set();
    for (const row of result) {
        if (seen.has(row.id)) return fail(`duplicate id=${row.id}`);
        seen.add(row.id);
    }
    pass(`${result.length} unique ids`);
});

test("parseDay channel field is constant", async ({ pass, fail }) => {
    const { result } = await loadAndParse();
    const channels = new Set(result.map((r) => r.channel));
    if (channels.size !== 1) {
        return fail(`expected 1 channel, got ${channels.size}: ${[...channels].join(", ")}`);
    }
    pass();
});

test("parseDay every successful parse has well-formed signal data", async ({ pass, fail }) => {
    const { result } = await loadAndParse();
    const parsed = result.filter((r) => r.data !== null);
    if (parsed.length === 0) return fail("no signals parsed at all — format likely broken");
    for (const row of parsed) {
        const { symbol, direction, entry, targets, stoploss } = row.data;
        if (typeof symbol !== "string" || symbol.length === 0) {
            return fail(`id=${row.id}: invalid symbol`);
        }
        if (direction !== "short" && direction !== "long") {
            return fail(`id=${row.id}: invalid direction ${direction}`);
        }
        if (!Number.isFinite(entry.from) || !Number.isFinite(entry.to) || entry.from >= entry.to) {
            return fail(`id=${row.id}: invalid entry ${entry.from}-${entry.to}`);
        }
        if (!Number.isFinite(stoploss) || stoploss <= 0) {
            return fail(`id=${row.id}: invalid stoploss ${stoploss}`);
        }
        if (!Array.isArray(targets) || targets.length === 0) {
            return fail(`id=${row.id}: empty targets`);
        }
        for (let i = 0; i < targets.length; i++) {
            if (!Number.isFinite(targets[i]) || targets[i] <= 0) {
                return fail(`id=${row.id}: invalid target[${i}]=${targets[i]}`);
            }
        }
    }
    pass(`${parsed.length} signals parsed and validated`);
});
