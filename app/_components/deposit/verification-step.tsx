"use client";
import Button from "@/components/button";
import { Input } from "@/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import { Text } from "@/components/typography";
import { truncateHash } from '@/lib/helpers';
import useBtcBlockHeight from "@/lib/hooks/useBtcBlockHeight";
import useBtcReserves from "@/lib/hooks/useBtcReserves";
import { useToast } from "@/lib/hooks/useToast";
import BTC from '@/lib/twilight/denoms';
import Big from 'big.js';
import { RefreshCw, AlertTriangle, Info, Loader2 } from "lucide-react";
import QRCode from 'qrcode';
import React, { useEffect, useRef, useState } from "react";
import CopyField from "./copy-field";

type Props = {
  btcDepositAddress: string;
  btcSatoshiTestAmount: number;
  onSuccess: () => void;
  onBack?: () => void;
  isConfirmed?: boolean
};

// Bitcoin blocks until reserve unlocks - approx 1 day at 10min/block
const NEXT_UNLOCK_HEIGHT_MODIFIER = 144;
// Warning threshold for blocks remaining
const LOW_BLOCKS_WARNING = 10;
// Critical blocks warning - don't send deposits within this threshold
const CRITICAL_BLOCKS_WARNING = 4;

const VerificationStep = ({
  btcDepositAddress,
  btcSatoshiTestAmount,
  onBack,
  isConfirmed
}: Props) => {
  const { toast } = useToast();

  const {
    data: btcReserves = [],
    isLoading: reservesLoading,
    isError: reservesError,
    refetch: refetchReserves,
    isFetching: reservesFetching,
  } = useBtcReserves();
  const {
    data: btcBlockHeight,
    isLoading: blockHeightLoading,
    isError: blockHeightError,
    refetch: refetchBlockHeight,
  } = useBtcBlockHeight();

  const [selectedBtcReserve, setSelectedBtcReserve] = useState<number | undefined>();
  const [qrGenerated, setQrGenerated] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hasShownExpiryToast = useRef(false);

  const selectedReserve = selectedBtcReserve !== undefined
    ? btcReserves.find(r => Number(r.ReserveId) === selectedBtcReserve)
    : undefined;

  const selectedReserveAddress = selectedReserve?.ReserveAddress;

  // Auto-refresh on reserve expiry
  useEffect(() => {
    if (!btcBlockHeight || !selectedReserve) return;

    const unlockHeight = Number(selectedReserve.UnlockHeight) + NEXT_UNLOCK_HEIGHT_MODIFIER;
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

  const depositAmountInBTC = new BTC("sats", Big(btcSatoshiTestAmount))
    .convert("BTC")
    .toString()

  return (
    <div className="space-y-6">
      <Text heading="h2" className="text-2xl font-medium sm:text-3xl">
        Deposit Details
      </Text>
      <div className="space-y-2">
        <Text asChild>
          <label className="text-primary-accent">Sender BTC Address</label>
        </Text>
        <Input
          value={btcDepositAddress}
          readOnly
        />
        <div className="flex items-center gap-2 text-xs text-yellow-500">
          <Info className="h-3 w-3 shrink-0" />
          <span>Oracles will only detect deposits sent from this address</span>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Text asChild>
            <label className="text-primary-accent" htmlFor="select-btc-reserve">
              Select Twilight BTC Reserve
            </label>
          </Text>
          {!reservesLoading && (
            <button
              type="button"
              onClick={() => refetchReserves()}
              disabled={reservesFetching}
              className="p-1 rounded text-primary-accent hover:text-primary disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              aria-label="Refresh reserves"
            >
              <RefreshCw className={`h-4 w-4 ${reservesFetching ? "animate-spin" : ""}`} />
            </button>
          )}
        </div>

        {reservesLoading ? (
          <div className="flex items-center gap-2 h-10 px-3 border rounded-default text-primary-accent">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading reserves...</span>
          </div>
        ) : reservesError ? (
          <div className="flex items-center justify-between gap-2 h-10 px-3 border border-red-500/50 rounded-default text-red-500">
            <span className="text-sm">Failed to load reserves</span>
            <Button
              variant="link"
              size="small"
              onClick={() => refetchReserves()}
              className="text-red-500"
            >
              Retry
            </Button>
          </div>
        ) : btcReserves.length === 0 ? (
          <div className="flex items-center justify-between gap-2 h-10 px-3 border border-yellow-500/50 rounded-default text-yellow-500">
            <span className="text-sm">No reserves available</span>
            <Button
              variant="link"
              size="small"
              onClick={() => refetchReserves()}
            >
              Refresh
            </Button>
          </div>
        ) : (
          <Select onValueChange={(value) => setSelectedBtcReserve(Number(value))}>
            <SelectTrigger id="select-btc-reserve">
              <SelectValue placeholder="Select a reserve" />
              <SelectContent>
                {btcReserves.map((reserve) => (
                  <SelectItem key={reserve.ReserveId} value={reserve.ReserveId}>
                    {`Reserve #${reserve.ReserveId} ${truncateHash(reserve.ReserveAddress)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </SelectTrigger>
          </Select>
        )}

        <div className="space-y-2">
          <Text asChild>
            <label className="text-primary-accent" htmlFor="input-deposit-amount">
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
                  className="rounded-md max-w-[200px] sm:max-w-[256px]"
                />
                {!qrGenerated && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-md">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}
                <Text className="mt-2 text-xs text-center text-primary-accent">
                  Scan with wallet
                </Text>
              </div>
              <div className="w-full space-y-2">
                <Text asChild>
                  <label className="text-primary-accent">Reserve Address</label>
                </Text>
                <CopyField value={selectedReserveAddress} label="reserve address" />
                {/* Block Height Indicator */}
                {selectedReserve && (
                  <div className="mt-3 space-y-1">
                    {/* Critical blocks warning */}
                    {(() => {
                      const unlockHeight = Number(selectedReserve.UnlockHeight) + NEXT_UNLOCK_HEIGHT_MODIFIER;
                      const blocksRemaining = btcBlockHeight != null ? unlockHeight - btcBlockHeight : null;
                      if (blocksRemaining !== null && blocksRemaining <= CRITICAL_BLOCKS_WARNING && blocksRemaining > 0) {
                        return (
                          <div className="flex items-center gap-2 p-2 rounded bg-yellow-500/10 border border-yellow-500/50 text-yellow-500 text-xs">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            <span>Do not send deposit when the reserve expiry is within 4 blocks, please create a new deposit when the reserve address has updated</span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    <Text asChild>
                      <label className="text-primary-accent text-sm">
                        Reserve Expiry
                      </label>
                    </Text>
                    {blockHeightError ? (
                      <div className="flex items-center gap-2 text-sm text-red-500">
                        <span>Unable to fetch block height</span>
                        <button
                          onClick={() => refetchBlockHeight()}
                          className="p-1 rounded text-primary-accent hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                          aria-label="Retry fetching block height"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      (() => {
                        const unlockHeight = Number(selectedReserve.UnlockHeight) + NEXT_UNLOCK_HEIGHT_MODIFIER;
                        const blocksRemaining = btcBlockHeight != null
                          ? unlockHeight - btcBlockHeight
                          : null;
                        const isExpired = blocksRemaining !== null && blocksRemaining <= 0;
                        const isWarning = blocksRemaining !== null && blocksRemaining > 0 && blocksRemaining <= LOW_BLOCKS_WARNING;
                        const colorClass = blocksRemaining === null
                          ? "text-primary-accent"
                          : isExpired
                            ? "text-red-500"
                            : isWarning
                              ? "text-yellow-500"
                              : "text-green-500";

                        return (
                          <div className="space-y-1">
                            {blockHeightLoading ? (
                              <div className="flex items-center gap-2 text-sm text-primary-accent">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Fetching block height...</span>
                              </div>
                            ) : (
                              <>
                                <div className={`text-sm font-mono ${colorClass}`}>
                                  {btcBlockHeight}/{unlockHeight}
                                </div>
                                <div className={`text-xs flex items-center gap-1 ${colorClass}`}>
                                  {isWarning && <AlertTriangle className="h-3 w-3" />}
                                  {isExpired ? (
                                    <span className="flex items-center gap-2">
                                      Expired — reserve sweeping in progress
                                      <button
                                        onClick={() => {
                                          setSelectedBtcReserve(undefined);
                                          refetchReserves();
                                        }}
                                        className="underline hover:no-underline"
                                      >
                                        Refresh
                                      </button>
                                    </span>
                                  ) : (
                                    <span>
                                      {blocksRemaining} block{blocksRemaining === 1 ? "" : "s"} remaining
                                      {isWarning && " — complete soon"}
                                    </span>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })()
                    )}
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
