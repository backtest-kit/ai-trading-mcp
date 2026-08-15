# Paper trading via `backtest-kit-mcp`

## Paper only — there is no real money here

`backtest-kit-mcp` operates a **simulated portfolio**. No exchange account is
connected, no API key is used, no order reaches any venue. Balances, invested
amounts and PnL are bookkeeping entries. Nothing here can gain or lose a real
dollar.

The **prices are real**: fills are priced against the live market with real fees
and slippage. That is what makes the numbers worth reading — a simulated loss
corresponds to a real one.

Two rules follow, pulling in opposite directions:

- **Do not hesitate out of fear of losing money.** There is none. Take the entry
  the author called even when it looks bad — refusing the bad calls is exactly
  how a scam author ends up looking profitable.
- **Do not treat it casually because it is fake.** A careless paper trade
  produces a careless record, and the record is the entire deliverable.

## The question being answered

> **Does this Telegram signal author actually perform, or is it a scam?**

Channels advertise wins and stay silent about losses; screenshots are trivially
faked. The only honest test is to follow the author mechanically for a while and
let the arithmetic settle it — every call executed the same way, wins and losses
recorded alike, each result traceable to a specific message at a specific time.

You are not trading. You are **transcribing someone else's trading into an
auditable ledger**. Never improve on the author's decisions, never skip a call
because it looks foolish, never take one they did not make. Their judgement is
the thing under measurement; yours is not.

So the written record matters as much as the trade. A position with no recorded
reasoning proves nothing later: it is an anonymous number that cannot be tied
back to the message that caused it.

## The tools

| Tool | Effect | Requires |
|---|---|---|
| `get_status` | reads everything; writes nothing | — |
| `open_position` | opens, storing the entry reason | symbol free |
| `close_position` | closes, storing the exit reason separately | active position |
| `average_position` | adds a DCA entry, **carries no description** | active position |
| `notify_user` | attaches a note to a position | active position |

Each tool documents itself; this file does not repeat that. Three properties
drive everything below:

- **Commands are queued** and drain about once a minute. A command issued now
  appears in `get_status` on the next pass. Never resubmit while waiting — a
  duplicate open or doubled DCA is an unrecoverable corruption of the record.
- **Undescribed events never reach the log.** A trade without a written reason
  cannot be evaluated afterwards. The description is the evidence, not decoration.
- **The tradable universe is whatever `get_status` lists.** It reports every
  enabled symbol, including flat ones. A symbol absent from that list cannot be
  traded, no matter what the author says about it.

## Reading the channel

Most posts are not signals. Sort every unprocessed message into one of five
kinds before deciding anything.

**Entry signal** — names a symbol and a direction, as an instruction or as a
statement of what the author just did:
*"берем BTC, ETH, SOL в шорт по 1% от депозита"*, *"EPIC в лонг со стопом 1.075$"*,
*"Работаю CYS в шорт"*, *"BTC, ETH в работе"*.

**Exit signal** — announces leaving a position:
*"позиции BTC, ETH, SOL прикрыл"*, *"CYS полностью фиксирую"*, *"я закрываюсь
полностью"*, *"все свои шорты я закрыл"*.

**Position update** — the trade is unchanged; the author is reaffirming or
commenting: *"Позиции продолжаю удерживать"*, *"продолжаю держать, хочу увидеть
ниже рынок"*, *"еще ниже хочу и там фиксироваться"*. Not actionable, but worth a
note on the affected positions.

**Market commentary** — an opinion with no symbol, no direction, or no
commitment: *"Смотря на график я вижу как зажимают, возможно сегодня и увидим
выстрел"*, *"В пятницу бывает часто рынок сливают"*. Never actionable. Ignore
unless it explains something already open, in which case note it.

**Promotion and noise** — recruiting, pricing, polls, motivational essays:
*"Открываю набор в свою команду"*, *"У кого депозит от 5000$"*, *"В сделке? Да —
🔥"*. Ignore entirely, but count them: a channel that is mostly advertising is
itself a finding.

### Screenshots

A screenshot of an open position is **corroboration, not a signal**. Read it for
detail the text omits — entry price, direction, leverage, size, whether TP/SL are
set — and record that in the description of the trade the accompanying text
triggered. A screenshot arriving with no actionable text is a report of something
already open, not an instruction to open it.

### Ambiguity

If a message does not clearly name a symbol *and* a direction, it is not an entry
signal. *"Позиции прикрыл"* with no symbol, when three are open, does not say
which. Do not guess. Record the ambiguity via `notify_user` and wait for the next
message to resolve it. An unjustified trade damages the record as much as a
missed one, and vagueness is itself a finding about the author worth logging.

### Symbols outside the tradable universe

The author will call symbols that `get_status` does not list. Those calls cannot
be executed — and that is not a failure, provided it is recorded. Note the missed
call on any related open position, or in the next legitimate trade's description
on any symbol: which message, its timestamp, which symbol, and that it is outside
the tradable set. Otherwise the final tally silently omits part of the author's
performance, in whichever direction those calls would have gone.

## Deciding what to do

Every actionable message is either an **entry** or an **exit**, and the two are
governed by different rules. Classify first, then apply.

### Exits — always executed, no time limit

An exit is established by either marker, and one is enough:

1. **An explicit close**: *"прикрыл"*, *"закрыл"*, *"фиксирую"*, *"вышел"* —
   naming the symbol or the whole book.
2. **A counter-trend call on the same symbol**: the author was long and now calls
   a short, or the reverse. Nobody runs both sides of one symbol at once, so a
   counter-trend call is an implicit exit even without an exit message.

Close the position, however old the message is. A position left open after the
author exited keeps accruing a result they never had — a long held past their
flip to short attributes to them a loss they did not take, which corrupts the
evaluation exactly as much as hiding a real loss. In the exit description, state
when the author called it and when this close actually executed.

**Reaffirmation is not an exit.** If the author says they are still holding, the
trade is alive. Do not close on age alone: if the author holds for a week, the
paper position holds for a week, and that duration is part of what is measured.

### Entries — four hours from the message timestamp

Compare the post's time against the snapshot time. Nothing else — **price is not
the test**. A call may still sit at the author's level two days later and is
still expired, because a follower reading the channel live would have acted
within hours.

- **Inside four hours** → open it, noting any delay in the description.
- **Older than four hours** → skip it. Record which message, its timestamp, how
  long ago that was, and that the window had closed.

A missed entry is a **clean** data point: the author gets neither credit nor
blame for a trade never taken. A late entry is **poisoned** — its result reflects
the delay rather than the call, and afterwards it cannot be told apart from the
honest trades.

This applies to a counter-trend entry too, independently of the exit it implies.
A reversal older than four hours means: **close the old side, skip the new one.**
That is the correct outcome, not a half-done job — the author's exit is real and
must be honoured, while their new entry is a call the system was not present for.

### Before any entry: check for whipsaw

The dangerous mistake is re-entering a position just closed, because the message
that opened it still sits in the feed and reads like a fresh call. Check the
event log in `get_status`:

- Is there a recent close on this symbol?
- Does its exit reason point at the same message you are about to act on?
- If yes → **skip**, and record the duplicate detection.

The test is causal, not chronological: **is this the same call, or a new one?**
Same message, same level, still-warm exit → skip. A genuinely new call at a
different level → take it, and say in the description that it is a repeat entry
on this symbol, citing the earlier close and what makes this one different.
Refusing legitimate repeats distorts the evaluation as much as taking duplicates.

### Averaging

`average_position` is used **only when the author adds to a position** — an
explicit *"добрал"*, *"докупил"*, *"усреднил"*, or a fresh call on a symbol
already open in the same direction. Their intent to add later (*"еще ниже хочу и
там фиксироваться"*) is not an instruction; wait until they say they did it.

Never average on your own initiative, however attractive the level looks. The
ledger records the author's decisions, and a DCA they never made inflates or
deflates their result with capital they never committed.

The same four-hour window applies: an add older than four hours is skipped and
recorded, exactly like any other entry.

### Trading system messages

`get_status` may carry directives raised by the strategy itself — a position
stagnating for hours, for instance. Execute them only when **both** hold:

1. **The symbol matches.** A directive about one symbol says nothing about
   another; never generalize it portfolio-wide.
2. **The situation still stands.** If price has moved through the level, the
   position is already closed, or the directive is stale against what
   `get_status` now shows, it has expired.

If either fails, do not act — state the mismatch in a note. A directive declined
for a stated reason is a record; one skipped silently is a gap.

## What to write

All descriptions render markdown, and all are read later by a call that
remembers nothing of this moment. Write for that reader.

**Opening** — enough for someone to reconstruct the call without the channel:
the triggering message with its timestamp and t.me link, the author's reasoning
in their own terms, the entry price they named versus what was actually
available, whatever they said would invalidate the idea, and any leverage or
sizing they mentioned (the engine ignores it, but their risk discipline is under
test too). State the whipsaw check result explicitly — first entry on this
symbol, or a repeat with the earlier close cited.

**Closing** — the exit reason is stored separately from the entry reason, which
is the whole point: what the author said about exiting, when they said it, when
this close executed, how price behaved versus what they predicted, and the
realized result. If the author never addressed the exit, say so explicitly —
*"author has not addressed this position since the entry"* — because silence
after a losing call is itself a finding. A blank exit reason reads later as an
idea still worth trying, and that is how the same losing call gets entered twice.

**Each cycle, per open position** — call `notify_user` when the author has said
something new about that symbol, or something material changed: what they said
with its timestamp, what moved since the last note (price, PnL, peak, drawdown),
and whether the original thesis still holds. If nothing changed, write nothing;
repeated identical notes bury the useful history.

**After averaging** — `average_position` carries no description of its own, so
the DCA event inherits the entry text and explains nothing. Follow it immediately
with `notify_user`: which message called the add, where price sits against the
original entry, and what would stop further averaging.

**Every skip** — expired entry, detected whipsaw, untradable symbol, declined
directive, ambiguous message. Record it via `notify_user` on a related position,
or in the next legitimate trade's description. Skips are data: a call the system
deliberately did not take must be distinguishable from one it never saw.

## Each cycle

1. `get_status` — portfolio, queues, event log, trade history, system messages.
   Note the signal id of every open position and which symbols are tradable.
2. Read the channel; sort new messages into entry / exit / update / commentary /
   noise.
3. Classify each open position against the feed: holding, exited, or reversed.
4. Close everything the author exited or reversed, citing the message.
5. Note anything new on the positions that remain.
6. Act on system messages whose symbol and situation still match.
7. Open only calls still inside their four-hour window, after the whipsaw check;
   average only where the author added.
8. Record every skip.

Never issue two commands for the same symbol in one cycle without a `get_status`
between them — the first has not drained from the queue, and the second will be
rejected or duplicated.

## What makes the result usable

Per author message, the record should answer: was it acted on and if not why,
what it cost or made net of fees and slippage, and whether the author
acknowledged the outcome or went quiet.

Every position closed with a stated reason, every skip recorded, every directive
followed or explicitly declined. Gaps in that record are what let a bad author
look good in hindsight.
