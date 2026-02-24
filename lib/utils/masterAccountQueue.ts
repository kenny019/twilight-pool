/**
 * MasterAccountQueue — serialises every operation that reads or writes the
 * master trading account UTXO.
 *
 * Because the ZKOS UTXO store is updated asynchronously (via a block-event
 * oracle subscriber), two concurrent operations that both try to spend the
 * same master-account UTXO will result in a double-spend rejection or
 * corrupted local state.  By running all such operations one at a time
 * through this queue we guarantee that each task starts with the latest
 * on-chain UTXO.
 *
 * Usage:
 *   import { masterAccountQueue } from "@/lib/utils/masterAccountQueue";
 *
 *   const result = await masterAccountQueue.enqueue(async () => {
 *     // read fresh state, broadcast tx, wait for UTXO update, mutate store
 *     return { ... };
 *   });
 *
 * Rules for tasks:
 *   - NEVER read tradingAccount from a React closure.  Instead read it from
 *     the StoreApi passed via useTwilightStoreApi() and captured before
 *     calling enqueue:
 *       const storeApi = useTwilightStoreApi();
 *       masterAccountQueue.enqueue(() => {
 *         const ta = storeApi.getState().zk.zkAccounts.find(a => a.tag === "main");
 *       });
 *   - The task MUST call waitForUtxoUpdate() after every broadcastTradingTx
 *     call so the on-chain UTXO store is consistent before the next task runs.
 *   - Tasks time out after TASK_TIMEOUT_MS and the queue advances regardless.
 */

const TASK_TIMEOUT_MS = 60_000;
/** Minimum delay between tasks so UTXO store can settle (~5–6s per relayer). */
const INTER_TASK_DELAY_MS = 2_000;

type QueueEntry<T> = {
  task: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
};

class MasterAccountQueue {
  private readonly queue: QueueEntry<any>[] = [];
  private _busy = false;

  /** True while a task is executing. */
  get busy(): boolean {
    return this._busy;
  }

  /** Number of tasks waiting to run (does not include the running task). */
  get pending(): number {
    return this.queue.length;
  }

  /**
   * Add a task to the queue.  Returns a Promise that resolves/rejects with
   * the task's return value once the task has been executed.
   */
  enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.advance();
    });
  }

  private advance(): void {
    if (this._busy || this.queue.length === 0) return;

    this._busy = true;
    const entry = this.queue.shift()!;

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("MasterAccountQueue: task timed out")),
        TASK_TIMEOUT_MS
      )
    );

    Promise.race([entry.task(), timeout])
      .then((result) => entry.resolve(result))
      .catch((err) => entry.reject(err))
      .finally(() => {
        this._busy = false;
        // Brief delay before next task so UTXO store can settle.
        if (this.queue.length > 0) {
          setTimeout(() => this.advance(), INTER_TASK_DELAY_MS);
        } else {
          this.advance();
        }
      });
  }
}

export const masterAccountQueue = new MasterAccountQueue();
