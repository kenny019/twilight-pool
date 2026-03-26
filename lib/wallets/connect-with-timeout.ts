const CONNECTION_TIMEOUT_MS = 30_000;

export async function connectWithTimeout(
  connectFn: () => Promise<void>,
  timeoutMs = CONNECTION_TIMEOUT_MS
): Promise<void> {
  let timerId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timerId = setTimeout(
      () => reject(new Error("CONNECTION_TIMEOUT")),
      timeoutMs
    );
  });
  try {
    return await Promise.race([connectFn(), timeoutPromise]);
  } finally {
    clearTimeout(timerId);
  }
}
