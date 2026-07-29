import { setup } from "@backtest-kit/mongo";

import {
  Markdown,
  StorageLive,
  StorageBacktest,
  NotificationLive,
  NotificationBacktest,
  RecentLive,
  RecentBacktest,
  Dump,
  MemoryLive,
  MemoryBacktest,
  StateLive,
  StateBacktest,
  SessionLive,
  SessionBacktest,
  Log,
} from "backtest-kit";

{
  Dump.useMarkdown();
}

{
  SessionLive.usePersist();
  SessionBacktest.useLocal();
}

{
  StorageLive.usePersist();
  StorageBacktest.useMemory();
}

{
  RecentLive.usePersist();
  RecentBacktest.useMemory();
}

{
  NotificationLive.usePersist();
  NotificationBacktest.useMemory();
}

{
  RecentLive.usePersist();
  RecentBacktest.useMemory();
}

{
  MemoryLive.usePersist();
  MemoryBacktest.useLocal();
}

{
  StateLive.usePersist();
  StateBacktest.useLocal();
}

{
  Markdown.useDummy();
  Log.useJsonl();
}

setup();
