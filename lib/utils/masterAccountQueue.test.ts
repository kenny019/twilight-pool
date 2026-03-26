import {
  describe,
  expect,
  it,
  vi,
  beforeEach,
  afterEach,
} from "vitest";
import { MasterAccountQueue } from "./masterAccountQueue";

describe("MasterAccountQueue", () => {
  let queue: MasterAccountQueue;

  beforeEach(() => {
    vi.useFakeTimers();
    queue = new MasterAccountQueue();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("runs tasks serially", async () => {
    const order: number[] = [];
    const t1 = queue.enqueue(async () => {
      order.push(1);
      return 1;
    });
    const t2 = queue.enqueue(async () => {
      order.push(2);
      return 2;
    });

    const r1 = await t1;
    // t2 waits for inter-task delay (2s) since queue was non-empty when t1 finished
    await vi.advanceTimersByTimeAsync(2000);
    const r2 = await t2;

    expect(r1).toBe(1);
    expect(r2).toBe(2);
    expect(order).toEqual([1, 2]);
  });

  it("rejects on 60s timeout and advances queue", async () => {
    const hangingTask = queue.enqueue(
      () => new Promise(() => {}) // never resolves
    );
    const followUp = queue.enqueue(async () => "done");
    const timeoutExpectation = expect(hangingTask).rejects.toThrow(
      "task timed out"
    );

    // Advance past 60s timeout
    await vi.advanceTimersByTimeAsync(60_000);

    await timeoutExpectation;

    // Inter-task delay then follow-up runs
    await vi.advanceTimersByTimeAsync(2_000);
    await expect(followUp).resolves.toBe("done");
  });

  it("rejecting task does not block queue", async () => {
    const failing = queue.enqueue(async () => {
      throw new Error("fail");
    });
    const next = queue.enqueue(async () => "ok");

    await expect(failing).rejects.toThrow("fail");

    await vi.advanceTimersByTimeAsync(2000);
    await expect(next).resolves.toBe("ok");
  });

  it("no inter-task delay when queue is empty between tasks", async () => {
    // When first task finishes with nothing pending, advance() is called synchronously
    // (no setTimeout). A second task enqueued later also runs immediately.
    const order: string[] = [];

    await queue.enqueue(async () => {
      order.push("first");
    });

    // Yield to let .finally() microtask run (sets _busy = false)
    await vi.advanceTimersByTimeAsync(0);

    const second = queue.enqueue(async () => {
      order.push("second");
    });
    await second;

    expect(order).toEqual(["first", "second"]);
  });

  it("reflects busy and pending state", async () => {
    expect(queue.busy).toBe(false);
    expect(queue.pending).toBe(0);

    let resolve!: () => void;
    const blocker = new Promise<void>((r) => {
      resolve = r;
    });

    const t1 = queue.enqueue(() => blocker);
    queue.enqueue(async () => {});

    // After enqueueing, first task is running
    expect(queue.busy).toBe(true);
    expect(queue.pending).toBe(1);

    resolve();
    await t1;

    // After first completes, second is pending behind inter-task delay
    await vi.advanceTimersByTimeAsync(2000);
    // Let second task finish
    await vi.advanceTimersByTimeAsync(0);
  });
});
