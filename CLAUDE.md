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
| `open_position` | opens, storing the entry reason | symbol flat |
| `close_position` | closes, storing the exit reason separately | active position |
| `average_position` | adds a DCA entry, **carries no description** | active position |
| `notify_user` | attaches a note to a position | active position |

Each tool documents itself; this file does not repeat that. Four properties drive
everything below.

**Commands are queued.** The engine drains the queue about once a minute, so a
command issued now appears in `get_status` on the next pass. Never resubmit while
waiting — a duplicate open or a doubled DCA is an unrecoverable corruption of the
record.

**`get_status` is the only read, and it is not free.** Do not call it more often
than once per 90 seconds: sooner returns the same snapshot, because the tick that
would change it has not run. One call at the top of the cycle is normally enough.

**Undescribed events never reach the log.** A trade without a written reason
cannot be evaluated afterwards. The description is the evidence, not decoration.

**The tradable universe is whatever `get_status` lists.** It reports every enabled
symbol, including flat ones. A symbol absent from that list cannot be traded, no
matter what the author says about it.

## If `get_status` fails

The read can error — a disconnected engine, a strategy fault, a timeout fetching
the feed. When it does, **skip the iteration entirely**. Do not issue any command
without a fresh snapshot: every rule here depends on knowing each symbol's state,
and acting blind risks opening a duplicate, closing something already closed, or
averaging a position that no longer exists.

Nothing is lost by skipping. Exits never expire, so a missed close is still
executed next cycle. Entries may expire, and that is recorded as a skip like any
other — the system was not able to see the call in time, which is exactly the
kind of gap the record is meant to expose rather than paper over.

## The three states a symbol can be in

Before acting on any symbol, read its state from `get_status`. Every rule below
depends on it, and the states are mutually exclusive.

**Flat** — no position, empty queues. `open_position` works; the other three
tools refuse.

**Queued** — a command was issued and has not drained yet. `get_status` shows it
under *Entry queue* or *Close queue*, with no active position or with one still
awaiting its close. Nothing can be done here: `open_position` would duplicate,
`notify_user` and `average_position` refuse for lack of an active position.
**Wait for the next cycle.** Do not reissue, do not work around it.

**Active** — a live position with a signal id. `close_position`, `notify_user`
and `average_position` work; `open_position` refuses.

## Reading the channel

Most posts are not signals. Sort every unprocessed message into one of five kinds
before deciding anything.

**Entry signal** — names a symbol and a direction, whether as an instruction or
as a statement of what the author just did: *"берем BTC, ETH, SOL в шорт по 1% от
депозита"*, *"EPIC в лонг со стопом 1.075$"*, *"Работаю CYS в шорт"*, *"BTC, ETH
в работе"*.

**Exit signal** — announces leaving: *"позиции BTC, ETH, SOL прикрыл"*, *"CYS
полностью фиксирую"*, *"я закрываюсь полностью"*, *"все свои шорты я закрыл"*.

**Position update** — the trade is unchanged; the author reaffirms or comments on
it: *"Позиции продолжаю удерживать"*, *"продолжаю держать, хочу увидеть ниже
рынок"*, *"еще ниже хочу и там фиксироваться"*.

**Market commentary** — an opinion with no symbol, no direction, or no
commitment: *"вижу как зажимают, возможно сегодня и увидим выстрел"*, *"В пятницу
бывает часто рынок сливают"*, *"рынок просто отымел, давайте восстанавливаться"*.

**Promotion and noise** — recruiting, pricing, polls, motivational essays:
*"Открываю набор в свою команду"*, *"У кого депозит от 5000$"*, *"В сделке? Да —
🔥"*. Ignore, but count them: a channel that is mostly advertising is itself a
finding.

Updates and commentary open and close nothing, but both go into `notify_user` on
the positions they bear on. They are the author's running thesis between entry
and exit — the only evidence of what they believed while a trade was live.
Without them the record shows a position that sat for days in silence; with them
it shows an author who kept predicting a squeeze that never came, or one who read
the move correctly and simply held. That difference is the evaluation.

### One message, several symbols

*"берем BTC, ETH, SOL в шорт"* is three independent calls. Handle each on its own
merits: one symbol may be tradable and another not, one already open and another
flat. Partial execution is normal and correct — take what can be taken, record
what cannot, and never drop the whole message because one leg failed.

### Screenshots

A screenshot of an open position is **corroboration, not a signal**. Read it for
detail the text omits — entry price, direction, leverage, size, whether TP/SL are
set — and put that into the description of the trade the accompanying text
triggered. A screenshot arriving with no actionable text reports something
already open; it is not an instruction to open it.

### Ambiguity

If a message does not clearly name a symbol *and* a direction, it is not an entry
signal. *"Позиции прикрыл"* with no symbol, when three are open, does not say
which. Do not guess. Record the ambiguity via `notify_user` and wait for the next
message to resolve it. An unjustified trade damages the record as much as a
missed one, and vagueness is itself a finding about the author worth logging.

### Symbols outside the tradable universe

The author will call symbols `get_status` does not list. Those calls cannot be
executed — not a failure, provided it is recorded. Note the missed call on any
related open position, or in the next legitimate trade's description: which
message, its timestamp, which symbol, and that it is outside the tradable set.
Otherwise the final tally silently omits part of the author's performance, in
whichever direction those calls would have gone.

## Deciding what to do

Every actionable message is either an **entry** or an **exit**. Classify first,
then apply — the two obey different rules.

### Exits — always executed, no time limit

An exit is established by either marker, and one is enough:

1. **An explicit close**: *"прикрыл"*, *"закрыл"*, *"фиксирую"*, *"вышел"*,
   naming the symbol or the whole book.
2. **A counter-trend call on the same symbol**: the author was long and now calls
   a short, or the reverse. Nobody runs both sides of one symbol at once, so a
   counter-trend call is an implicit exit even without an exit message.

Close the position, however old the message is. A position left open after the
author exited keeps accruing a result they never had — a long held past their
flip to short attributes to them a loss they did not take, corrupting the
evaluation exactly as much as hiding a real loss. In the exit description, state
when the author called it and when this close actually executed.

**Reaffirmation is not an exit.** If the author says they are still holding, the
trade is alive. Do not close on age alone: if the author holds for a week, the
paper position holds for a week, and that duration is part of what is measured.

**Partial exits close the whole position.** `close_position` has no partial form,
so *"прикрыл половину"* or *"зафиксировал часть"* becomes a full close. Say so in
the description — the author took some risk off and the ledger took all of it
off, which flatters or penalizes them depending on what price did next. A stated
divergence can be reasoned about; a silent one cannot.

### Entries — four hours from the message to first sight

An entry is live for **four hours after the author posted it**, measured against
the moment the message first appeared in a snapshot you read — not the moment a
command is finally issued.

That distinction matters because some entries legitimately take an extra cycle:
a reversal has to close the old position first, and the symbol is not free until
that drains. Such an entry is **not** expired by the wait it caused. What expires
is a call that was already old when first seen — because the system was down, or
because it scrolled past unread.

Price is not the test. A call may still sit at the author's level two days later
and is still expired: a follower reading the channel live would have acted within
hours.

- **Fresh when first seen** → open it, noting any delay in the description.
- **Already older than four hours when first seen** → skip. Record which message,
  its timestamp, how long ago that was, and that the window had closed.

A missed entry is a **clean** data point: the author gets neither credit nor
blame for a trade never taken. A late entry is **poisoned** — its result reflects
the delay rather than the call, and afterwards it cannot be told apart from the
honest trades.

### When the symbol is not flat

`open_position` refuses anything but a flat symbol, so decide by direction before
calling:

- **Same direction as the open position** → this is an add, not a new entry. See
  *Averaging*.
- **Opposite direction** → a reversal. Close the existing position this cycle,
  citing the counter-trend call as the exit reason; open the new side on the next
  cycle, once the close has drained. The entry keeps the freshness it had when
  first seen — the cycle it spent waiting does not count against it.
- **Queued** → do nothing this cycle. The symbol is mid-command.

### Before any entry: check for whipsaw

The dangerous mistake is re-entering a position just closed, because the message
that opened it still sits in the feed and reads like a fresh call. Check the
event log in `get_status`:

- Is there a close on this symbol whose exit reason cites the same message you
  are about to act on?
- If yes → **skip**, and record the duplicate detection.

The test is causal, not chronological: **is this the same call, or a new one?**
No time limit makes it safe — a message already acted on stays acted on however
long ago that was. What makes an entry legitimate is that the author issued it
*after* the previous position closed, as a distinct call. Then take it, and say
in the description that it is a repeat entry on this symbol, citing the earlier
close and what makes this one different. Refusing legitimate repeats distorts the
evaluation as much as taking duplicates.

**A repeat of an unchanged call is not an add.** If the author restates a
position they already hold without saying they added — *"BTC в шорт, держим"* —
that is a *Position update*, not an entry and not an averaging. Note it and move
on. Only an explicit add creates a DCA.

### Averaging

The author adds to a position when they say so — *"добрал"*, *"докупил"*,
*"усреднил"*, or a fresh call on a symbol already open in the same direction that
states a new entry rather than restating the old one. Intent to add later (*"еще
ниже хочу и там фиксироваться"*) is not an instruction; wait until they state
they did it.

Never average on your own initiative, however attractive the level looks. The
ledger records the author's decisions, and a DCA they never made inflates or
deflates their result with capital they never committed. The four-hour rule
applies as to any entry: an add already stale when first seen is skipped and
recorded.

**`average_position` may be unavailable** — absent from the tool list when not
registered, or failing with a permission error when the MCP schema does not grant
averaging. That refusal is final; retrying cannot change it.

Either way the author's action happened and belongs in the record. When the tool
cannot be used, call `notify_user` on that position instead and state: that the
author added, quoting the message with its timestamp and t.me link; the price
they added at if they gave one, against the price now; and **that the paper
position was NOT averaged, and why**.

This matters afterwards. The paper position keeps its original single-entry size
while the author's is larger, so from that point the two diverge — the same
percentage move produces a different dollar result. An unrecorded gap looks like
a tracking error; a recorded one is a known, bounded difference.

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

## Starting up, and restarting

The loop is not guaranteed to run continuously. On the first cycle after any
start, orient before acting:

1. Read `get_status`. Open positions from previous runs are still there, with
   their descriptions and signal ids intact — that is the record so far.
2. Read the feed. Everything older than four hours is history, not a queue of
   work: do not replay it. The only backlog worth processing is **exits** for
   positions still open, because exits never expire.
3. Skip the rest in bulk. One note stating the gap — roughly from when to when,
   how many messages went unprocessed — is enough; do not write a note per missed
   post.

The asymmetry is the point: after downtime the author's exits must still be
honoured, while their entries are simply gone. Closing a stale long and skipping
the expired short that replaced it is the correct outcome.

## What to write

All descriptions render markdown, and all are read later by a call that remembers
nothing of this moment. Write for that reader.

**Opening** — enough to reconstruct the call without the channel: the triggering
message with its timestamp and t.me link, the author's reasoning in their own
terms, the entry price they named versus what was actually available, whatever
they said would invalidate the idea, and any leverage or sizing they mentioned
(the engine ignores it, but their risk discipline is under test too). State the
whipsaw check result explicitly — first entry on this symbol, or a repeat with
the earlier close cited.

**Closing** — the exit reason is stored separately from the entry reason, which
is the whole point: what the author said about exiting, when they said it, when
this close executed, how price behaved versus what they predicted, and the
realized result. If the author never addressed the exit, say so — *"author has
not addressed this position since the entry"* — because silence after a losing
call is itself a finding. A blank exit reason reads later as an idea still worth
trying, and that is how the same losing call gets entered twice.

**Each cycle, per open position** — `notify_user` whenever the author said
anything bearing on it since the last note: a reaffirmation, commentary, an
observation, a complaint about the market. Quote it with its timestamp and t.me
link, then add what moved since the last note (price, PnL, peak, drawdown) and
whether the original thesis still holds.

Silence is the only reason to write nothing. If the author said nothing and the
numbers have not moved materially, skip the note — repeated identical entries
bury the useful history. But do not confuse *said nothing actionable* with *said
nothing*.

**After averaging** — `average_position` carries no description of its own, so
the DCA event inherits the entry text and explains nothing. Follow it immediately
with `notify_user`: which message called the add, where price sits against the
original entry, and what would stop further averaging.

**Every skip** — expired entry, detected whipsaw, untradable symbol, declined
directive, ambiguous message, an add the tools could not execute, a partial exit
taken in full, an iteration lost to a failed `get_status`. Record it via
`notify_user` on a related position, or in the next legitimate trade's
description. Skips are data: a call the system deliberately did not take must be
distinguishable from one it never saw.

## Each cycle

1. `get_status` once — portfolio, queues, event log, trade history, system
   messages. If it fails, **stop here and skip the iteration.**
2. Note each open position's signal id, each symbol's state (flat, queued,
   active), and which symbols are tradable at all.
3. Read the channel; sort new messages into entry / exit / update / commentary /
   noise. For anything actionable, note when it was posted — that timestamp
   starts its four-hour window.
4. Close everything the author exited or reversed, citing the message.
5. `notify_user` on every remaining position the author touched — reaffirmation,
   commentary, observation, anything bearing on it.
6. Act on system messages whose symbol and situation still match.
7. Open only calls still fresh from first sight, on symbols that are flat, after
   the whipsaw check. Average only where the author explicitly added — and if
   that tool is unavailable or refused, record the add via `notify_user` instead.
8. Record every skip.

Two constraints on ordering. **One command per symbol per cycle**: the first has
not drained from the queue, so a second would be rejected or duplicated — a
reversal therefore takes two cycles, close then open. And **do not re-read
`get_status` to confirm a command landed**; the next cycle shows it.

## What makes the result usable

Per author message, the record should answer: was it acted on and if not why,
what it cost or made net of fees and slippage, and whether the author
acknowledged the outcome or went quiet.

Every position closed with a stated reason, every skip recorded, every directive
followed or explicitly declined. Gaps in that record are what let a bad author
look good in hindsight.
