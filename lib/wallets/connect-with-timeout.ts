const CONNECTION_TIMEOUT_MS = 30_000;

export async function connectWithTimeout(
  connectFn: () => Promise<void>,
  timeoutMs = CONNECTION_TIMEOUT_MS
): Promise<void> {
  return Promise.race([
    connectFn(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("CONNECTION_TIMEOUT")), timeoutMs)
    ),
  ]);
}
