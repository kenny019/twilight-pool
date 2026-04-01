import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Page from "./page";

const { lendOrdersTableMock, lendHistoryTableMock } = vi.hoisted(() => ({
  lendOrdersTableMock: vi.fn(() => React.createElement("div", null, "orders-table")),
  lendHistoryTableMock: vi.fn(() =>
    React.createElement("div", null, "history-table")
  ),
}));

vi.mock("@/app/_components/lend/pool-info.client", () => ({
  default: () => React.createElement("div", null, "PoolInfo"),
}));
vi.mock("@/app/_components/lend/pool-health.client", () => ({
  default: () => React.createElement("div", null, "PoolHealth"),
}));
vi.mock("@/app/_components/lend/apy-chart.client", () => ({
  default: () => React.createElement("div", null, "ApyChart"),
}));
vi.mock("@/app/_components/lend/my-investment.client", () => ({
  default: () => React.createElement("div", null, "MyInvestment"),
}));
vi.mock("@/app/_components/lend/lend-management.client", () => ({
  default: () => React.createElement("div", null, "LendManagement"),
}));
vi.mock(
  "@/app/_components/trade/details/tables/lend-orders/lend-orders-table.client",
  () => ({
    default: lendOrdersTableMock,
  })
);
vi.mock(
  "@/app/_components/trade/details/tables/lend-history/lend-history-table.client",
  () => ({
    default: lendHistoryTableMock,
  })
);

vi.mock("@/components/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
  DialogContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
  DialogTitle: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
  DialogDescription: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
}));

vi.mock("@/components/tabs", () => ({
  Tabs: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
  TabsList: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
  TabsTrigger: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => React.createElement("button", { onClick }, children),
}));

vi.mock("@/components/typography", () => ({
  Text: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
}));

vi.mock("@/components/seperator", () => ({
  Separator: () => React.createElement("hr"),
}));

vi.mock("@/lib/hooks/useGetMarketStats", () => ({
  default: () => ({ data: { status: "RUNNING" } }),
}));
vi.mock("@/lib/hooks/useRedirectUnconnected", () => ({
  default: () => undefined,
}));
vi.mock("@/lib/hooks/useGetLendPoolInfo", () => ({
  useGetLendPoolInfo: () => undefined,
}));
vi.mock("@/lib/hooks/useToast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock("@/lib/hooks/useLendWithdrawal", () => ({
  useLendWithdrawal: () => ({
    isWithdrawDialogOpen: false,
    setIsWithdrawDialogOpen: vi.fn(),
    settleLendOrder: vi.fn(),
    settlingOrderId: null,
  }),
}));
vi.mock("@/lib/providers/feed", () => ({
  usePriceFeed: () => ({
    getCurrentPrice: () => 100000,
  }),
}));

const storeState = {
  lend: {
    lends: [
      {
        accountAddress: "addr-1",
        value: 100,
        uuid: "lend-1",
        orderStatus: "LENDED",
        timestamp: new Date("2026-01-01T00:00:00Z"),
      },
    ],
    lendHistory: [
      {
        accountAddress: "addr-1",
        value: 100,
        uuid: "lend-history-1",
        orderStatus: "SETTLED",
        timestamp: new Date("2026-01-02T00:00:00Z"),
      },
    ],
    poolInfo: {
      apy: 4,
      tvl_btc: 10,
      pool_share: 1,
    },
  },
  zk: {
    zkAccounts: [
      {
        tag: "main",
        address: "addr-1",
        scalar: "scalar-1",
        type: "Coin",
      },
    ],
  },
};

vi.mock("@/lib/providers/store", () => ({
  useTwilightStore: (selector: (state: typeof storeState) => unknown) =>
    selector(storeState),
}));

describe("lend page", () => {
  beforeEach(() => {
    lendOrdersTableMock.mockClear();
    lendHistoryTableMock.mockClear();
  });

  it("renders the same top-level sections and passes transformed data to the records tables", () => {
    const html = renderToStaticMarkup(React.createElement(Page));

    expect(html).toContain("Pool Performance");
    expect(html).toContain("APY Trend");
    expect(html).toContain("Add Liquidity");
    expect(html).toContain("Pool Health");
    expect(html).toContain("Positions");
    expect(html).toContain("History");

    expect(lendOrdersTableMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            uuid: "lend-1",
            accountTag: "Primary Trading Account",
          }),
        ],
      }),
      undefined
    );

    expect(lendHistoryTableMock).not.toHaveBeenCalled();
  });
});
