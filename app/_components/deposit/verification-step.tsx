"use client";
import Button from "@/components/button";
import { Input } from "@/components/input";
import { Text } from "@/components/typography";
import useBtcBlockHeight from "@/lib/hooks/useBtcBlockHeight";
import useBtcReserves from "@/lib/hooks/useBtcReserves";
import { useToast } from "@/lib/hooks/useToast";
import BTC from "@/lib/twilight/denoms";
import Big from "big.js";
import { RefreshCw, AlertTriangle, Info, Loader2 } from "lucide-react";
import QRCode from "qrcode";
import React, { useEffect, useRef, useState } from "react";
import BtcReserveSelect from "../btc-reserve-select";
import CopyField from "./copy-field";

type Props = {
  btcDepositAddress: string;
  btcSatoshiTestAmount: number;
  onBack?: () => void;
  isConfirmed?: boolean;
};

// Bitcoin blocks until reserve unlocks - approx 1 day at 10min/block
const NEXT_UNLOCK_HEIGHT_MODIFIER = 144;
// Critical blocks warning - don't send deposits within this threshold
const CRITICAL_BLOCKS_WARNING = 4;

const SWEEP_CYCLE = 144;
const RING_SIZE = 80;
const RING_RADIUS = 34;
const RING_STROKE = 6;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function SweepProgress({
  currentBlock,
  sweepBlock,
  blocksRemaining,
}: {
  currentBlock: number;
  sweepBlock: number;
  blocksRemaining: number;
}) {
  const progress = Math.min(
    Math.max((SWEEP_CYCLE - blocksRemaining) / SWEEP_CYCLE, 0),
    1
  );
  const dashoffset = CIRCUMFERENCE * (1 - progress);
  const isExpired = blocksRemaining <= 0;
  const isCritical = blocksRemaining <= CRITICAL_BLOCKS_WARNING && !isExpired;
  const isWarning = progress >= 0.5;

  const strokeColor =
    isExpired || isCritical ? "#ef4444" : isWarning ? "#eab308" : "#22c55e";

  if (isExpired) {
    return (
      <div className="text-red-500 text-sm">
        Expired — reserve sweeping in progress
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div
        className="relative shrink-0"
        style={{ width: RING_SIZE, height: RING_SIZE }}
      >
        <svg width={RING_SIZE} height={RING_SIZE} className="-rotate-90">
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth={RING_STROKE}
            className="text-primary-accent/20"
          />
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            stroke={strokeColor}
            strokeWidth={RING_STROKE}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashoffset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.5s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="text-sm font-semibold"
            style={{ color: strokeColor }}
          >
            {blocksRemaining}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-primary-accent">Current Block</span>
          <span className="font-mono">{currentBlock.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-primary-accent">Next Sweep Block</span>
          <span className="font-mono">{sweepBlock.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

const VerificationStep = ({
  btcDepositAddress,
  btcSatoshiTestAmount,
  onBack,
  isConfirmed,
}: Props) => {
  const { toast } = useToast();

  const {
    data: btcReserves = [],
    refetch: refetchReserves,
    isFetching: isRefetchingReserves,
  } = useBtcReserves();
  const {
    data: btcBlockHeight,
    isLoading: blockHeightLoading,
    isError: blockHeightError,
    refetch: refetchBlockHeight,
    isFetching: isRefetchingBlockHeight,
  } = useBtcBlockHeight();

  const [selectedBtcReserve, setSelectedBtcReserve] = useState<
    number | undefined
  >();
  const [qrGenerated, setQrGenerated] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hasShownExpiryToast = useRef(false);

  const selectedReserve =
    selectedBtcReserve !== undefined
      ? btcReserves.find((r) => Number(r.ReserveId) === selectedBtcReserve)
      : undefined;

  const selectedReserveAddress = selectedReserve?.ReserveAddress;

  // Auto-refresh on reserve expiry
  useEffect(() => {
    if (!btcBlockHeight || !selectedReserve) return;

    const unlockHeight =
      Number(selectedReserve.UnlockHeight) + NEXT_UNLOCK_HEIGHT_MODIFIER;
    if (btcBlockHeight >= unlockHeight && !hasShownExpiryToast.current) {
      hasShownExpiryToast.current = true;
      toast({
        variant: "error",
        title: "Reserve expired",
        description: "The selected reserve has expired. Please select another.",
      });
      setSelectedBtcReserve(undefined);
      refetchReserves();
    }
  }, [btcBlockHeight, selectedReserve, toast, refetchReserves]);

  // Reset toast flag when reserve selection changes
  useEffect(() => {
    hasShownExpiryToast.current = false;
  }, [selectedBtcReserve]);

  useEffect(() => {
    const generateQRCode = async () => {
      if (selectedReserveAddress && canvasRef.current) {
        try {
          setQrGenerated(false);
          await QRCode.toCanvas(canvasRef.current, selectedReserveAddress);
          setQrGenerated(true);
        } catch {
          setQrGenerated(false);
        }
      }
    };

    if (selectedReserveAddress) {
      generateQRCode();
    }
  }, [selectedReserveAddress]);

  async function handleRefreshReserves() {
    setSelectedBtcReserve(undefined);
    const [{ status }] = await Promise.all([
      refetchReserves(),
      new Promise((r) => setTimeout(r, 300)),
    ]);
    toast(
      status === "success"
        ? { title: "Reserves updated", description: "Latest reserve data fetched." }
        : { title: "Refresh failed", description: "Could not fetch reserves.", variant: "error" }
    );
  }

  async function handleRetryBlockHeight() {
    const [{ status }] = await Promise.all([
      refetchBlockHeight(),
      new Promise((r) => setTimeout(r, 300)),
    ]);
    if (status === "success") {
      toast({ title: "Block height updated" });
    }
  }

  const depositAmountInBTC = new BTC("sats", Big(btcSatoshiTestAmount))
    .convert("BTC")
    .toString();

  return (
    <div className="space-y-6">
      <Text heading="h2" className="text-2xl font-medium sm:text-3xl">
        Deposit Details
      </Text>
      <div className="space-y-2">
        <Text asChild>
          <label className="text-primary-accent">Sender BTC Address</label>
        </Text>
        <Input value={btcDepositAddress} readOnly />
        <div className="flex items-center gap-2 text-xs text-yellow-500">
          <Info className="h-3 w-3 shrink-0" />
          <span>Oracles will only detect deposits sent from this address</span>
        </div>
      </div>
      <div className="space-y-2">
        <Text asChild>
          <label className="text-primary-accent" htmlFor="select-btc-reserve">
            Select Twilight BTC Reserve
          </label>
        </Text>
        <BtcReserveSelect
          value={selectedBtcReserve}
          onValueChange={setSelectedBtcReserve}
        />

        <div className="space-y-2">
          <Text asChild>
            <label
              className="text-primary-accent"
              htmlFor="input-deposit-amount"
            >
              BTC Amount
            </label>
          </Text>
          <CopyField
            id="input-deposit-amount"
            value={depositAmountInBTC}
            label="deposit amount"
          />
        </div>

        {selectedReserveAddress && (
          <div className="space-y-2">
            <Text asChild>
              <label className="text-primary-accent">Deposit Details</label>
            </Text>
            <div className="flex flex-col items-center gap-4">
              <div
                className="relative"
                role="img"
                aria-label={`QR code for reserve address ${selectedReserveAddress}`}
              >
                <canvas
                  ref={canvasRef}
                  width={256}
                  height={256}
                  className="max-w-[200px] rounded-md sm:max-w-[256px]"
                />
                {!qrGenerated && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-md bg-background/80">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}
                <Text className="mt-2 text-center text-xs text-primary-accent">
                  Scan with wallet
                </Text>
              </div>
              <div className="w-full space-y-2">
                <Text asChild>
                  <label className="text-primary-accent">Reserve Address</label>
                </Text>
                <CopyField
                  value={selectedReserveAddress}
                  label="reserve address"
                />
                {/* Sweep Progress */}
                {selectedReserve && (
                  <div className="mt-3 space-y-2">
                    <Text asChild>
                      <label className="text-sm text-primary-accent">
                        Reserve Expiry
                      </label>
                    </Text>
                    {blockHeightError ? (
                      <div className="text-red-500 flex items-center gap-2 text-sm">
                        <span>Unable to fetch block height</span>
                        <button
                          onClick={handleRetryBlockHeight}
                          disabled={isRefetchingBlockHeight}
                          className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded p-2 text-primary-accent transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:opacity-50 touch-manipulation"
                          aria-label="Retry fetching block height"
                        >
                          <RefreshCw className={`h-4 w-4 ${isRefetchingBlockHeight ? "animate-spin" : ""}`} />
                        </button>
                      </div>
                    ) : blockHeightLoading ? (
                      <div className="flex items-center gap-2 text-sm text-primary-accent">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Fetching block height...</span>
                      </div>
                    ) : btcBlockHeight != null ? (
                      (() => {
                        const unlockHeight =
                          Number(selectedReserve.UnlockHeight) +
                          NEXT_UNLOCK_HEIGHT_MODIFIER;
                        const blocksRemaining = unlockHeight - btcBlockHeight;
                        const isCritical =
                          blocksRemaining <= CRITICAL_BLOCKS_WARNING &&
                          blocksRemaining > 0;
                        const isExpired = blocksRemaining <= 0;
                        return (
                          <>
                            {isCritical && (
                              <div className="flex items-center gap-2 rounded border border-yellow-500/50 bg-yellow-500/10 p-2 text-xs text-yellow-500">
                                <AlertTriangle className="h-4 w-4 shrink-0" />
                                <span>
                                  Do not send deposit when the reserve expiry is
                                  within 4 blocks, please create a new deposit
                                  when the reserve address has updated
                                </span>
                              </div>
                            )}
                            <SweepProgress
                              currentBlock={btcBlockHeight}
                              sweepBlock={unlockHeight}
                              blocksRemaining={blocksRemaining}
                            />
                            {isExpired && (
                              <button
                                onClick={handleRefreshReserves}
                                disabled={isRefetchingReserves}
                                className="inline-flex min-h-[36px] items-center gap-1 text-xs text-red-500 underline hover:no-underline disabled:opacity-50 disabled:no-underline touch-manipulation"
                              >
                                <RefreshCw className={`h-3.5 w-3.5 ${isRefetchingReserves ? "animate-spin" : ""}`} />
                                Refresh reserves
                              </button>
                            )}
                          </>
                        );
                      })()
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {isConfirmed && onBack && (
        <Button
          className="w-full bg-primary text-background hover:bg-primary/90"
          onClick={onBack}
        >
          Back
        </Button>
      )}
    </div>
  );
};

export default VerificationStep;
