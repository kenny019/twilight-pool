export type WalletErrorType =
  | "rejected"
  | "not_installed"
  | "timeout"
  | "network"
  | "unknown";

export function classifyWalletError(err: unknown): WalletErrorType {
  const message = err instanceof Error ? err.message : String(err);

  if (message === "CONNECTION_TIMEOUT") return "timeout";
  if (/reject|denied|cancelled|cancel/i.test(message)) return "rejected";
  if (/not.*(found|installed|exist)/i.test(message)) return "not_installed";
  if (/extension.*context.*invalidated/i.test(message)) return "not_installed";
  if (/network|fetch|CORS|socket/i.test(message)) return "network";

  return "unknown";
}

export function getErrorMessage(
  type: WalletErrorType,
  walletName: string
): { title: string; description: string } {
  switch (type) {
    case "rejected":
      return {
        title: "Connection rejected",
        description: `You rejected the connection request in ${walletName}. Click "Try Again" to retry.`,
      };
    case "not_installed":
      return {
        title: `${walletName} not found`,
        description: `Please install the ${walletName} extension and try again.`,
      };
    case "timeout":
      return {
        title: "Connection timed out",
        description: `${walletName} did not respond in time. Make sure the extension is unlocked and try again.`,
      };
    case "network":
      return {
        title: "Network error",
        description:
          "Could not reach the wallet. Check your internet connection and try again.",
      };
    case "unknown":
    default:
      return {
        title: "Connection failed",
        description: `Could not connect to ${walletName}. Please try again.`,
      };
  }
}
