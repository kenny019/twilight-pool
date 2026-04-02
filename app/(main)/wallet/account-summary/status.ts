import { ActiveAccount } from "../page";

export type ActiveAccountStatus =
  | "Available"
  | "Locked in Position"
  | "Locked in Lending"
  | "Action Required";

export const ACTION_REQUIRED_MESSAGE =
  "This account was not fully processed. Your funds are safe and can be moved back using Transfer.";

export function canTransferActiveAccount(account: ActiveAccount) {
  return (
    !account.utilized &&
    account.tag !== "Primary Trading Account" &&
    account.value !== 0
  );
}

export function getActiveAccountStatus(
  account: ActiveAccount
): ActiveAccountStatus {
  if (account.tag === "Primary Trading Account") {
    return "Available";
  }

  if (canTransferActiveAccount(account)) {
    return "Action Required";
  }

  if (account.utilized && account.type === "Lend") {
    return "Locked in Lending";
  }

  if (account.utilized) {
    return "Locked in Position";
  }

  return "Available";
}

export function getActiveAccountStatusClass(status: ActiveAccountStatus) {
  switch (status) {
    case "Available":
      return "bg-green-medium/10 text-green-medium/80";
    case "Locked in Position":
      return "bg-yellow-500/10 text-yellow-500";
    case "Locked in Lending":
      return "bg-yellow-500/10 text-yellow-500";
    case "Action Required":
      return "border border-blue-500/25 bg-blue-500/[0.08] text-blue-300";
  }
}
