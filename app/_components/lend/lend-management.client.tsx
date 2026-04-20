"use client";
import Button from "@/components/button";
import { PopoverInput } from "@/components/input";
import Resource from "@/components/resource";
import { Text } from "@/components/typography";
import cn from "@/lib/cn";
import { sendLendOrder } from "@/lib/api/client";
import { queryLendOrder } from "@/lib/api/relayer";
import {
  queryTransactionHashByRequestId,
  type TransactionHash,
} from "@/lib/api/rest";
import { retry, isUserRejection } from "@/lib/helpers";
import useGetMarketStats from "@/lib/hooks/useGetMarketStats";
import useGetTwilightBTCBalance from "@/lib/hooks/useGetTwilightBtcBalance";
import { useToast } from "@/lib/hooks/useToast";
import { useSessionStore, useSignStatus } from "@/lib/providers/session";
import { useTwilightStore, useTwilightStoreApi } from "@/lib/providers/store";
import BTC, { BTCDenoms } from "@/lib/twilight/denoms";
import { createFundingToTradingTransferMsg } from "@/lib/twilight/wallet";
import {
  createZkAccountWithBalance,
  createZkLendOrder,
} from "@/lib/twilight/zk";
import { createQueryLendOrderMsg } from "@/lib/twilight/zkos";
import { ZkAccount } from "@/lib/types";
import { WalletStatus } from "@cosmos-kit/core";
import { useWallet } from "@cosmos-kit/react-lite";
import Big from "big.js";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import React, { useCallback, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import { ZkPrivateAccount } from "@/lib/zk/account";
import { POOL_SHARE_DECIMALS_SCALE } from "@/lib/format/poolShares";
import { assertCosmosTxSuccess } from "@/lib/utils/cosmosTx";
import { buildLendLedgerEntryFromRelayerEvent } from "@/lib/account-ledger/from-relayer";
import { Slider } from "@/components/slider";

const DEPOSIT_PRESETS = [25, 50, 75, 100] as const;

const LendManagement = () => {
  const { toast } = useToast();
  const privateKey = useSessionStore((state) => state.privateKey);
  const { retrySign } = useSignStatus();
  const { status } = useWallet();

  const { twilightSats } = useGetTwilightBTCBalance();
  const marketStats = useGetMarketStats();
  const isRelayerHalted = marketStats.data?.status === "HALT";

  const zkAccounts = useTwilightStore((state) => state.zk.zkAccounts);
  const addZkAccount = useTwilightStore((state) => state.zk.addZkAccount);
  const lendOrders = useTwilightStore((state) => state.lend.lends);
  const poolInfo = useTwilightStore((state) => state.lend.poolInfo);

  const [approxPoolShare, setApproxPoolShare] = useState<string>("0");
  const [sliderSats, setSliderSats] = useState(0);

  const addLendOrder = useTwilightStore((state) => state.lend.addLend);
  const addLendHistory = useTwilightStore((state) => state.lend.addLendHistory);

  const addTransactionHistory = useTwilightStore(
    (state) => state.history.addTransaction
  );
  const addAccountLedgerEntry = useTwilightStore(
    (state) => state.account_ledger.addEntry
  );
  const updateZkAccount = useTwilightStore((state) => state.zk.updateZkAccount);
  const optInLeaderboard = useTwilightStore((state) => state.optInLeaderboard);
  const btcPrice = useSessionStore((state) => state.price.btcPrice);
  const storeApi = useTwilightStoreApi();

  const [depositDenom, setDepositDenom] = useState<string>("BTC");
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);

  const { mainWallet } = useWallet();

  const depositRef = useRef<HTMLInputElement>(null);

  const clampDepositSats = useCallback(
    (sats: number) => {
      const maxSats = Math.max(0, twilightSats || 0);
      return Math.min(Math.max(0, Math.round(sats)), maxSats);
    },
    [twilightSats]
  );

  const normalizeDepositInput = useCallback(
    (rawValue: string, denom: BTCDenoms) => {
      if (!rawValue.trim()) {
        return {
          displayValue: "",
          clampedSats: 0,
        };
      }

      const parsedValue = Number(rawValue);
      if (!Number.isFinite(parsedValue)) {
        return null;
      }

      const nonNegativeValue = Math.max(0, parsedValue);
      const sats = new BTC(denom, Big(nonNegativeValue))
        .convert("sats")
        .toNumber();
      const clampedSats = clampDepositSats(sats);

      return {
        displayValue: new BTC("sats", Big(clampedSats))
          .convert(denom)
          .toString(),
        clampedSats,
      };
    },
    [clampDepositSats]
  );

  async function submitDepositForm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!privateKey) {
      await retrySign();
      return;
    }

    if (isRelayerHalted) {
      toast({
        variant: "error",
        title: "Deposits paused",
        description:
          "The relayer is currently halted. Deposits will be available when the relayer resumes.",
      });
      return;
    }

    const tag = `BTC lend ${zkAccounts.length}`;

    const chainWallet = mainWallet?.getChainWallet("nyks");

    if (!chainWallet) {
      toast({
        title: "Wallet is not connected",
        description: "Please connect your wallet to deposit.",
      });
      return;
    }

    const normalizedDeposit = normalizeDepositInput(
      depositRef.current?.value || "",
      depositDenom as BTCDenoms
    );

    if (!normalizedDeposit || normalizedDeposit.clampedSats <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter an amount to deposit.",
      });
      return;
    }

    const twilightAddress = chainWallet.address;

    if (!twilightAddress) {
      console.error("no twilightAddress");
      return;
    }

    setIsSubmitLoading(true);

    toast({
      title: "Submitting deposit",
      description:
        "Please do not close this page while your deposit is being submitted...",
    });

    syncDepositUi(
      normalizedDeposit.displayValue,
      normalizedDeposit.clampedSats
    );

    const transferAmount = normalizedDeposit.clampedSats;

    const stargateClient = await chainWallet.getSigningStargateClient();

    console.log("funding transfer signature", privateKey);
    const { account: newTradingAccount, accountHex: newTradingAccountHex } =
      await createZkAccountWithBalance({
        tag: tag,
        balance: transferAmount,
        signature: privateKey,
      });

    const fundingTransferMsg = await createFundingToTradingTransferMsg({
      twilightAddress,
      transferAmount,
      account: newTradingAccount,
      accountHex: newTradingAccountHex,
    });

    console.log("msg", fundingTransferMsg);

    try {
      const res = assertCosmosTxSuccess(
        await stargateClient.signAndBroadcast(
          twilightAddress,
          [fundingTransferMsg],
          "auto"
        ),
        "Lend deposit funding transfer"
      );

      console.log("sent sats from funding to trading", transferAmount);
      console.log("res", res);

      const zkAccountToUse: ZkAccount = {
        scalar: newTradingAccount.scalar,
        type: "Coin",
        address: newTradingAccount.address,
        tag: tag,
        isOnChain: true,
        value: transferAmount,
        createdAt: dayjs().unix(),
      };

      addZkAccount(zkAccountToUse);

      addTransactionHistory({
        date: new Date(),
        from: twilightAddress,
        fromTag: "Funding",
        to: zkAccountToUse.address,
        toTag: zkAccountToUse.tag,
        tx_hash: res.transactionHash,
        type: "Transfer",
        value: transferAmount,
        funding_sats_snapshot: twilightSats,
      });

      // hack to make sure utxo exists on chain before creating the lend order
      await ZkPrivateAccount.create({
        signature: privateKey,
        balance: transferAmount,
        existingAccount: zkAccountToUse,
      });

      const { success, msg } = await createZkLendOrder({
        zkAccount: zkAccountToUse,
        deposit: transferAmount,
        signature: privateKey,
      });

      if (!success || !msg) {
        toast({
          variant: "error",
          title: "Unable to submit lend order",
          description: "An error has occurred, try again later.",
        });
        setIsSubmitLoading(false);
        return;
      }

      const data = await sendLendOrder(
        msg,
        optInLeaderboard ? twilightAddress : undefined
      );

      if (data.result && data.result.id_key) {
        const lendOrderRes = await retry<
          ReturnType<typeof queryTransactionHashByRequestId>,
          string
        >(
          queryTransactionHashByRequestId,
          30,
          data.result.id_key,
          1000,
          (txHash) => {
            const result = "result" in txHash ? txHash.result : undefined;
            const found = Array.isArray(result)
              ? result.find(
                  (tx: TransactionHash) => tx.order_status === "FILLED"
                )
              : undefined;
            return !!found;
          },
          (txHash) => {
            const result = "result" in txHash ? txHash.result : undefined;
            const cancelled = Array.isArray(result)
              ? result.find(
                  (tx: TransactionHash) => tx.order_status === "CANCELLED"
                )
              : undefined;
            return !!cancelled;
          }
        );

        if (!lendOrderRes.success) {
          const failedStatus = lendOrderRes.cancelled
            ? "CANCELLED"
            : "NoResponseFromChain";
          const failedEvent: TransactionHash = {
            account_id: zkAccountToUse.address,
            datetime: new Date().toISOString(),
            id: 0,
            order_id: "",
            order_status: failedStatus,
            order_type: "LEND",
            output: null,
            reason: lendOrderRes.cancelled
              ? "Lend deposit request denied"
              : "Lend deposit request timed out",
            old_price: null,
            new_price: null,
            request_id: String(data.result.id_key),
            tx_hash: "",
          };
          addAccountLedgerEntry(
            buildLendLedgerEntryFromRelayerEvent(
              storeApi.getState(),
              failedEvent,
              {
                accountAddress: zkAccountToUse.address,
                accountTag: zkAccountToUse.tag,
                amountSats: transferAmount,
                fundingAddress: twilightAddress,
                operation: "deposit",
                fallbackOrderId: String(data.result.id_key),
              }
            )
          );

          if (lendOrderRes.cancelled) {
            toast({
              variant: "error",
              title: "Lend order not accepted",
              description:
                "Your funds remain in your ZK account. Use the recovery option in the wallet to move them back to funding.",
            });
          } else {
            console.error("lend order deposit not successful");
            toast({
              variant: "error",
              title: "Unable to submit lend order",
              description: "An error has occurred, try again later.",
            });
          }
          setIsSubmitLoading(false);
          return;
        }

        const txResult =
          "result" in lendOrderRes.data ? lendOrderRes.data.result : [];
        if (Array.isArray(txResult)) {
          txResult.forEach((tx) => {
            addAccountLedgerEntry(
              buildLendLedgerEntryFromRelayerEvent(storeApi.getState(), tx, {
                accountAddress: zkAccountToUse.address,
                accountTag: zkAccountToUse.tag,
                amountSats: transferAmount,
                fundingAddress: twilightAddress,
                operation: "deposit",
                fallbackOrderId: String(data.result.id_key),
              })
            );
          });
        }
        const lendOrderData = Array.isArray(txResult)
          ? txResult.find((tx: TransactionHash) => tx.order_status === "FILLED")
          : undefined;

        const tx_hash = lendOrderData?.tx_hash;
        const orderId = lendOrderData?.order_id;
        const requestId = String(data.result.id_key);

        if (!tx_hash || !orderId) {
          toast({
            variant: "error",
            title: "Unable to submit lend order",
            description: "Order confirmation is incomplete. Please try again.",
          });
          setIsSubmitLoading(false);
          return;
        }

        toast({
          title: "Success",
          description: (
            <div className="opacity-90">
              {`Successfully submitted lend order for ${new BTC(
                "sats",
                Big(transferAmount)
              )
                .convert("BTC")
                .toString()} BTC. `}
              <Link
                href={`${process.env.NEXT_PUBLIC_EXPLORER_URL as string}/txs/${tx_hash}`}
                target={"_blank"}
                className="text-sm underline hover:opacity-100"
              >
                Explorer link
              </Link>
            </div>
          ),
        });

        const queryLendOrderMsg = await createQueryLendOrderMsg({
          address: zkAccountToUse.address,
          signature: privateKey,
          orderStatus: "FILLED",
        });

        const queryLendOrderRes = await retry(
          queryLendOrder,
          5,
          queryLendOrderMsg,
          1000,
          (res) => !!res?.result
        );

        if (!queryLendOrderRes.success || !queryLendOrderRes.data?.result) {
          console.error("queryLendOrder", queryLendOrderRes);
          toast({
            variant: "error",
            title: "Unable to query lend order",
            description:
              "Your deposit may have succeeded. Check your lend history or try refreshing.",
          });
          setIsSubmitLoading(false);
          return;
        }

        const npoolshare = Number(
          queryLendOrderRes.data.result.npoolshare ?? 0
        );
        const fallbackNpoolshare =
          poolInfo?.pool_share && npoolshare === 0
            ? Math.round(
                (transferAmount / poolInfo.pool_share) *
                  POOL_SHARE_DECIMALS_SCALE
              )
            : npoolshare;

        const newLendOrder = {
          accountAddress: zkAccountToUse.address,
          uuid: orderId,
          order_id: orderId,
          request_id: requestId,
          orderStatus: "LENDED",
          value: transferAmount,
          timestamp: new Date(),
          apy: poolInfo?.apy,
          tx_hash: tx_hash,
          npoolshare: fallbackNpoolshare,
          pool_share_price_entry: btcPrice,
        };

        addLendOrder(newLendOrder);
        addLendHistory(newLendOrder);

        updateZkAccount(zkAccountToUse.address, {
          ...zkAccountToUse,
          type: "Memo",
        });

        // Reset form and approx pool share (was only clearing input before)
        if (depositRef.current) {
          depositRef.current.value = "";
        }
        setApproxPoolShare("0");
        setSliderSats(0);
      } else {
        toast({
          variant: "error",
          title: "Unable to submit lend order",
          description: "An error has occurred, try again later.",
        });
      }
    } catch (err) {
      if (isUserRejection(err)) {
        toast({
          title: "Transaction rejected",
          description: "You declined the transaction in your wallet.",
        });
      } else {
        console.error(err);
        toast({
          variant: "error",
          title: "Unable to submit lend order",
          description: "An error has occurred, try again later.",
        });
      }
    }

    setIsSubmitLoading(false);
  }

  const availableBalance = BTC.format(
    new BTC("sats", Big(twilightSats)).convert("BTC"),
    "BTC"
  );

  const calculateApproxPoolShare = useCallback(
    (value: string) => {
      const amount = Big(value || 0).toNumber();
      const sats = new BTC(depositDenom as BTCDenoms, Big(amount))
        .convert("sats")
        .toNumber();

      const sharePrice = poolInfo?.pool_share;
      if (!sharePrice || sharePrice <= 0) {
        setApproxPoolShare("0");
        return;
      }

      const poolShare = sats / sharePrice;
      setApproxPoolShare(
        Number.isFinite(poolShare)
          ? Math.round(poolShare).toLocaleString()
          : "0"
      );
    },
    [depositDenom, poolInfo?.pool_share]
  );

  const syncDepositUi = useCallback(
    (displayValue: string, clampedSats: number) => {
      if (depositRef.current) {
        depositRef.current.value = displayValue;
      }
      setSliderSats(clampedSats);
      calculateApproxPoolShare(displayValue || "0");
    },
    [calculateApproxPoolShare]
  );

  const applyDepositSats = useCallback(
    (sats: number) => {
      const clampedSats = clampDepositSats(sats);
      const converted = new BTC("sats", Big(clampedSats)).convert(
        depositDenom as BTCDenoms
      );
      syncDepositUi(converted.toString(), clampedSats);
    },
    [clampDepositSats, depositDenom, syncDepositUi]
  );

  const activeDepositPreset = useMemo(() => {
    if (!twilightSats || sliderSats <= 0) return null;

    return (
      DEPOSIT_PRESETS.find(
        (preset) =>
          clampDepositSats((twilightSats * preset) / 100) === sliderSats
      ) ?? null
    );
  }, [clampDepositSats, sliderSats, twilightSats]);

  function renderDepositForm() {
    return (
      <form onSubmit={submitDepositForm} className="space-y-3 md:space-y-4">
        <div className="space-y-2.5 md:space-y-2">
          {/* Available balance — own row, matching trade form style */}
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm text-primary/60">Available</span>
            <span className="text-sm font-medium tabular-nums">
              {availableBalance} BTC
            </span>
          </div>

          {/* Amount label */}
          <Text className="text-xs text-primary-accent" asChild>
            <label htmlFor="amount-dep">Amount</label>
          </Text>

          <PopoverInput
            id="amount-dep"
            name="depositValue"
            onClickPopover={(e) => {
              e.preventDefault();
              if (!depositRef.current?.value) return;

              const toDenom = e.currentTarget.value as BTCDenoms;
              const normalized = normalizeDepositInput(
                new BTC(
                  depositDenom as BTCDenoms,
                  Big(depositRef.current.value)
                )
                  .convert(toDenom)
                  .toString(),
                toDenom
              );
              if (!normalized) return;
              if (depositRef.current) {
                depositRef.current.value = normalized.displayValue;
              }
              setSliderSats(normalized.clampedSats);
            }}
            type="text"
            min="0"
            max={new BTC("sats", Big(Math.max(0, twilightSats || 0)))
              .convert(depositDenom as BTCDenoms)
              .toString()}
            inputMode="decimal"
            placeholder="0.00"
            options={["BTC", "mBTC", "sats"]}
            setSelected={setDepositDenom}
            selected={depositDenom}
            ref={depositRef}
            className="border-outline/60 bg-background/40 pr-16 font-semibold text-primary"
            selectorWrapperClassName="border-outline/[0.06]"
            selectorClassName="gap-0.5 px-2 text-primary/70 data-[state=open]:text-primary"
            disabled={status !== WalletStatus.Connected || isSubmitLoading}
            onChange={(e) => {
              const val = e.target.value;
              if (!val.trim()) {
                setSliderSats(0);
                calculateApproxPoolShare("0");
                return;
              }
              const parsed = Number(val);
              if (!Number.isFinite(parsed) || parsed < 0) return;
              const rawSats = new BTC(
                depositDenom as BTCDenoms,
                Big(Math.max(0, parsed))
              )
                .convert("sats")
                .toNumber();
              const clamped = clampDepositSats(rawSats);
              setSliderSats(clamped);
              calculateApproxPoolShare(String(parsed));
            }}
            onBlur={() => {
              if (!depositRef.current) return;
              const normalized = normalizeDepositInput(
                depositRef.current.value,
                depositDenom as BTCDenoms
              );
              if (!normalized) {
                depositRef.current.value = "";
                setSliderSats(0);
                calculateApproxPoolShare("0");
                return;
              }
              syncDepositUi(normalized.displayValue, normalized.clampedSats);
            }}
          />

          <div className="flex flex-wrap gap-1.5">
            {DEPOSIT_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  if (!twilightSats) return;
                  applyDepositSats((twilightSats * preset) / 100);
                }}
                disabled={!twilightSats || isSubmitLoading}
                className={cn(
                  "rounded border px-1.5 py-0.5 text-[10px] font-medium transition-colors disabled:opacity-40",
                  activeDepositPreset === preset
                    ? "border-theme/50 bg-theme/20 text-theme"
                    : "border-outline text-primary/70 hover:border-theme/30 hover:bg-theme/10"
                )}
              >
                {preset}%
              </button>
            ))}
          </div>

          {/* Slider */}
          <div className="w-full md:w-[65%]">
            <Slider
              min={0}
              max={twilightSats || 1}
              step={1}
              value={[sliderSats]}
              className="w-full"
              disabled={!twilightSats || isSubmitLoading}
              markerCount={5}
              onValueChange={([sats]) => {
                applyDepositSats(sats);
              }}
            />
          </div>
        </div>

        <div className="flex justify-between text-sm">
          <Text className="text-primary-accent">Approx Pool Share</Text>
          <Text>≈ {approxPoolShare} shares</Text>
        </div>

        <div className="max-md:flex max-md:justify-center">
          <Button
            variant="ui"
            disabled={
              isSubmitLoading ||
              status !== WalletStatus.Connected ||
              isRelayerHalted ||
              sliderSats === 0
            }
            type="submit"
            className="min-h-[44px] w-full border-theme/70 bg-theme/[0.08] py-2 text-sm font-medium text-theme transition-colors hover:border-theme hover:bg-theme/[0.12] disabled:border-outline disabled:bg-transparent disabled:hover:border-outline max-md:h-12 max-md:w-3/4 max-md:border-theme max-md:bg-theme/10 max-md:text-base max-md:font-semibold max-md:text-theme max-md:active:bg-theme/20"
            title={
              isRelayerHalted
                ? "The relayer is halted. Deposits will be available when it resumes."
                : undefined
            }
          >
            <Resource
              isLoaded={!isSubmitLoading}
              placeholder={<Loader2 className="animate-spin" />}
            >
              Deposit
            </Resource>
          </Button>
        </div>
        {isRelayerHalted && (
          <Text className="text-xs text-primary-accent">
            Deposits paused — relayer is halted
          </Text>
        )}
      </form>
    );
  }

  return <div className="space-y-4">{renderDepositForm()}</div>;
};

export default LendManagement;
