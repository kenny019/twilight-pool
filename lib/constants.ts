export const GRID_DEFAULT_DIMENSIONS = {
  width: 600,
  height: 300,
};

export const GRID_ROW_HEIGHT = 30;
export const GRID_WIDTH_OFFSET = 24;
export const GRID_HEIGHT_OFFSET = 24;

export enum ZK_ACCOUNT_INDEX {
  MANAGE_ACCOUNT = -2,
  DISCONNECTED = -1,
  MAIN = 0,
}

export const TWILIGHT_NETWORK_TYPE = process.env
  .NEXT_PUBLIC_TWILIGHT_NETWORK_TYPE as "testnet" | "mainnet";

export const INSTRUMENT_LABEL = "BTCUSD";
