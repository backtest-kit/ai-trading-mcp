# Paper trading via `backtest-kit-mcp`

## `backtest-kit-mcp` IS PAPER TRADING ONLY — NOT REAL MONEY

Every tool exposed by `backtest-kit-mcp` operates on a **simulated portfolio**.
This is not a wrapper around a brokerage account and it cannot become one by
configuration:

- the capital is **virtual** — the balances, the invested amounts and the PnL are
  bookkeeping entries, not funds
- **no exchange account is connected**, no API key is used, no order is ever sent
  to any venue
- nothing here can gain or lose a single real dollar, and no result needs to be
  withdrawn, settled or paid out

What *is* real: the **prices**. Every fill is priced against the live market, and
fees and slippage are applied as they would be in production. That is what makes
the numbers worth reading — a simulated loss here corresponds to a real loss
there.

Two consequences follow, and they pull in opposite directions:

1. **Never hesitate out of fear of losing money.** There is none at stake. Take
   the entry the author called, even when it looks bad; refusing the bad calls is
   exactly how a scam author ends up looking profitable.
2. **Never treat it casually because it is fake.** A careless paper trade
   produces a careless record, and the record is the entire deliverable. Same
   discipline as real capital, for a different reason.

## What this is

The point is not to make money — there is no money. The point is to answer one
question about a Telegram signal author, with evidence instead of impression:

> **Does this author actually perform, or is it a scam?**

Channels advertise wins and stay silent about losses. Screenshots are trivially
faked. The only honest test is to follow the author mechanically for a while and
let the arithmetic settle it: every call executed the same way, wins and losses
recorded alike, results attributable to specific messages at specific times.

That means the log of a trade matters as much as the trade. A position with no
recorded reasoning proves nothing later — it becomes an anonymous number that
cannot be traced back to the message that caused it.

## The five tools

| Tool | Writes | Requires |
|---|---|---|
| `get_status` | nothing — the only read path | — |
| `open_position` | opens a position, records the entry reason | symbol free |
| `close_position` | closes a position, records the exit reason | active position |
| `average_position` | adds a DCA entry, **no description of its own** | active position |
| `notify_user` | records a note against a position | active position |

Read each tool's own description before first use; this document does not repeat
them. Two properties matter for everything below:

- **Commands are queued.** The engine drains the queue about once a minute. A
  command issued now shows up in `get_status` on the next pass. Never resubmit
  while waiting — a duplicate open or a doubled DCA is a real, unrecoverable
  mistake in the record.
- **A position with no description is invisible.** Undescribed events do not
  reach the log at all, so a trade without a written reason cannot be evaluated
  afterwards. Description is not decoration; it is the evidence.

## What to write, and when

Three moments, three kinds of record. All of them accept full markdown, and all
of them are read later by a call that remembers nothing.

### Every loop cycle: a note per open position

On **each** cycle, for **each** open position, call `notify_user` — provided the
author has said something new about that symbol since the last note. Record:

- what the author said, verbatim or closely paraphrased, with its timestamp
- what changed since the previous note: price movement, PnL, whether the peak or
  the drawdown moved
- whether the author's original thesis still holds, and what would break it

If the author has said nothing new about a symbol and nothing material changed,
skip the note for that symbol. Repeating an unchanged note buries the useful
history under noise.

### On open: the author's argument, in full

`open_position` — the description must let a later reader reconstruct the call
without access to the channel:

- the exact message that triggered the entry, with its timestamp
- the author's stated reasoning, in the author's terms, not summarized to death
- the entry price the author named, versus the price actually available now
- what the author said would invalidate the idea, if anything
- any leverage, sizing or staging the author mentioned — recorded even though
  the engine ignores it, because the author's discipline is itself under test

### On close: the author's reason, or its absence

`close_position` — the exit reason is stored **separately** from the entry
reason, and this is the whole point:

- what the author said about exiting, with its timestamp
- if the author never mentioned the exit, say so explicitly: *"author has not
  addressed this position since the entry"* — silence after a losing call is
  itself a finding about the author
- how price actually behaved versus what the author predicted
- the realized result

A closed trade whose exit reason is blank reads later as an idea still worth
trying. That is how the same losing call gets entered twice.

### After averaging

`average_position` carries no description, so the DCA event inherits the entry
text and explains nothing. Immediately follow it with `notify_user`: what the
author said that justified adding, where price sits relative to the original
entry, and what would stop further averaging.

## Acting on trading system messages

`get_status` may include messages from the trading system itself — directives
raised by the strategy, such as a position stagnating for hours.

**Execute them**, but only when both conditions hold:

1. **The symbol matches.** A directive about one symbol says nothing about
   another. Never generalize it into a portfolio-wide action.
2. **The time window still applies.** A directive is about the situation when it
   was raised. If the price has since moved through the level, the position has
   already been closed, or the directive is stale relative to what `get_status`
   now shows, it has expired — record why it was not followed via `notify_user`
   and move on.

If either condition fails, do not act. State the mismatch in a note instead;
a directive skipped for a stated reason is a record, a directive skipped
silently is a gap.

## Whipsaw: the failure mode to avoid

The dangerous mistake here is re-entering a position that was just closed,
because the channel message that opened it is still sitting in the feed and
reads like a fresh call.

**Before every `open_position`, check the event log in `get_status`:**

- Is there a recent close on this symbol?
- Does its exit reason point at the same author message you are about to act on?
- If yes — **do not re-enter.** The idea was already tested and is finished. Note
  the duplicate detection and skip.

This is precisely why exit reasons are written down. Without them, a closed trade
and an untried idea look identical.

**But do not freeze.** A repeat entry on the same symbol is legitimate when:

- the author issued a **new** call, at a **different** price, after the previous
  position closed — a second attempt at a different level is a new data point
  about the author, and refusing it distorts the evaluation
- the previous close was time-driven (hold timeout, stagnation) rather than
  thesis-driven, and the author has since restated the idea
- enough time has passed that the previous message is no longer plausibly the
  cause of this entry

The test is causal, not chronological: **is this the same call, or a new one?**
Same message, same level, still-warm exit → skip. New message, new level → take
it, and say in the description that it is a repeat entry on the same symbol,
citing the earlier close and what makes this one different.

## Entries expire after four hours. Exits never do

The loop is not guaranteed to run continuously — restarts, crashes and idle
stretches happen. After one, the feed holds messages that were never acted on.
`get_status` exposes the gap: an open position whose age far exceeds the newest
note on it, or a feed whose oldest unprocessed message predates the last recorded
event.

**The entry window is four hours from the message timestamp.** Compare the post's
time against the current snapshot time — nothing else. Price is not the test: a
call may still sit at the author's level after two days and it is still expired,
because a follower reading the channel live would have acted within hours, not
days.

- **Inside four hours** → open it. Note the delay in the description if it was
  not immediate.
- **Older than four hours** → do **not** open. Record it as skipped: which
  message, its timestamp, how long ago that was, and that the window had closed.

A missed entry is a **clean** data point — the author gets neither credit nor
blame for a trade that was never taken. A late entry is a **poisoned** one: its
result reflects the downtime, not the call, and afterwards it cannot be told
apart from the honest trades.

**Exits have no window.** If the author closed a position during the downtime,
close it too — hours or days late, it does not matter. Leaving a position open
after the author exited keeps accruing a result the author never had: a long held
past their flip to short attributes to them a loss they did not take. That
corrupts the evaluation exactly as much as hiding a real one. Say in the exit
description when the author called it and when this close actually executed.

Record every skip with `notify_user` on a related open position, or in the
description of the next legitimate trade on that symbol.

## Loop discipline

Each cycle, in order:

1. `get_status` — read the portfolio, the queues, the event log, the trade
   history, and any trading system messages. Note the signal id of every open
   position: it is what ties a trade together across the whole output.
2. Read the channel for anything new since the last cycle.
3. **Check message age**: for every actionable post, compare its timestamp against
   the snapshot time. Entries older than four hours are skipped and recorded;
   exits are executed no matter how late.
4. For each open position with news or material change → `notify_user`.
5. For any trading system message whose symbol and time window match → act.
6. For any new author call → check the log for a matching recent close, then
   `open_position` if it is genuinely new.
7. For any position the author has exited, or whose thesis has broken →
   `close_position` with the reason stated.

Never issue two commands for the same symbol in one cycle without a `get_status`
between them: the first has not drained from the queue yet, and the second will
be rejected or duplicated.

## What makes the evaluation usable

At the end of the trial, the record should answer, per author message:

- was it acted on, and if not, why not
- what it cost or made, net of fees and slippage
- whether the author acknowledged the outcome or went quiet

Every position closed with a stated reason, every skip recorded, every directive
either followed or explicitly declined. Gaps in that record are what let a bad
author look good in hindsight.
