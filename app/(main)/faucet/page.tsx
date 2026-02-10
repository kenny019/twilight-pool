"use client";
import React, { useState, useRef, useEffect } from "react";
import Button from "@/components/button";
import { Input } from "@/components/input";
import { Text } from "@/components/typography";
import { useToast } from "@/lib/hooks/useToast";
import { isUserRejection } from "@/lib/helpers";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import wfetch from "@/lib/http";
import { useWallet } from '@cosmos-kit/react-lite';
import { twilightproject } from "twilightjs";
import Long from 'long';
import { useRouter } from 'next/navigation';
import { useTwilightStore } from '@/lib/providers/store';
import useVerifyStatus from '@/lib/hooks/useVerifyStatus';
import Link from 'next/link';
import { getRegisteredBTCAddress } from '@/lib/twilight/rest';

interface FaucetResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    txHash: string;
  }
}

const faucetSteps = [
  {
    id: 1,
    title: "Enter Twilight Address",
    description: "Provide your twilight address to receive tokens"
  },
  {
    id: 2,
    title: "Get NYKS Tokens",
    description: "Receive 100,000 NYKS tokens from the faucet"
  },
  {
    id: 3,
    title: "Register your address to accept BTC",
    description: "Register your address on the NYKS chain to accept BTC"
  },
  {
    id: 4,
    title: "Get BTC Tokens",
    description: "Receive 50,000 sats from the mint endpoint"
  }
];

const FAUCET_ENDPOINT = process.env.NEXT_PUBLIC_FAUCET_ENDPOINT as string;

const generateRandomBtcTestnetAddress = (): string => {
  const randomHex = Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');

  return `tb1q${randomHex}`
};


const Page = () => {
  const { toast } = useToast();
  const twilightAddressRef = useRef<HTMLInputElement>(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { mainWallet } = useWallet();

  const addTransactionHistory = useTwilightStore(
    (state) => state.history.addTransaction
  );

  const chainWallet = mainWallet?.getChainWallet("nyks");

  const router = useRouter()

  const [twilightAddress, setTwilightAddress] = useState(chainWallet?.address || "");

  const MANDATORY_KYC = process.env.NEXT_PUBLIC_MANDATORY_KYC === "true";
  const { isVerified } = useVerifyStatus();

  // Update twilight address when wallet connects/disconnects
  useEffect(() => {
    if (chainWallet?.address) {
      setTwilightAddress(chainWallet.address);
    }
  }, [chainWallet?.address]);

  useEffect(() => {
    if (MANDATORY_KYC && isVerified !== undefined && isVerified === false) {
      toast({
        title: "Verification required",
        description: "Please verify your country to continue",
      });

      router.push("/verify-region");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVerified, MANDATORY_KYC])

  const markStepCompleted = (stepId: number) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps([...completedSteps, stepId]);
    }
  };

  const callFaucetEndpoint = async (address: string): Promise<FaucetResponse> => {
    try {
      const {
        success,
        error
      } = await wfetch(`${FAUCET_ENDPOINT}/faucet`)
        .post({
          body: JSON.stringify({ recipientAddress: address }),
        }).text()


      if (!success) {
        return { success: false, error: error?.toString() || "Request failed" };
      }

      return { success: true, message: "Successfully received 100,000 NYKS tokens" };
    } catch (error) {
      return { success: false, error: error?.toString() || "Network error" };
    }
  };

  const callMintEndpoint = async (address: string): Promise<FaucetResponse> => {
    try {
      const { success, error, data } = await wfetch(`${FAUCET_ENDPOINT}/mint`)
        .post({
          body: JSON.stringify({ recipientAddress: address }),
        })
        .json<{ data: { txHash?: string } }>()

      const txHash = data?.data?.txHash;

      console.log("data", data, txHash)
      if (!success || !txHash) {
        return { success: false, error: error?.toString() || "Request failed" };
      }

      console.log("adding transaction history")
      addTransactionHistory({
        date: new Date(),
        from: "twilight1k5knhhd6p9zxxwug77aqgrayvyt8yh6nw8ca7h",
        fromTag: "Faucet",
        to: twilightAddress,
        toTag: "Funding",
        tx_hash: txHash,
        type: "Transfer",
        value: 50_000,
      })

      return { success: true, message: "Successfully received 50,000 sats", data: { txHash } };
    } catch (error) {
      return { success: false, error: error?.toString() || "Network error" };
    }
  };

  const handleSubmitAddress = async () => {
    if (!chainWallet || !twilightAddress) {
      toast({
        variant: "error",
        title: "Error",
        description: "Please connect your Cosmos wallet",
      });
      return;
    }

    toast({
      title: "Address Validated",
      description: "Ready to proceed with token distribution",
    });

    const stargateClient = await chainWallet.getStargateClient()
    const nyksBalanceString = await stargateClient.getBalance(
      twilightAddress,
      "nyks"
    );

    const nyksBalance = parseInt(nyksBalanceString.amount);

    const registeredBTCAddress = await getRegisteredBTCAddress(twilightAddress);

    console.log("registeredBTCAddress", registeredBTCAddress)

    if (registeredBTCAddress && nyksBalance > 20_000) {
      setCompletedSteps([1, 2, 3]);
      setCurrentStep(4);
      return;
    }

    markStepCompleted(1);
    setCurrentStep(2);

    toast({
      title: "Address Validated",
      description: "Ready to proceed with token distribution",
    });
  };

  const handleGetNyks = async () => {
    if (!twilightAddress) return;

    setIsLoading(true);

    try {
      const result = await callFaucetEndpoint(twilightAddress);

      await new Promise(resolve => setTimeout(resolve, 5000));

      if (result.success) {
        toast({
          title: "NYKS Tokens Received",
          description: result.message || "Successfully received 100,000 NYKS tokens",
        });

        const registeredBTCAddress = await getRegisteredBTCAddress(twilightAddress);

        if (registeredBTCAddress) {
          setCompletedSteps([1, 2, 3]);
          setCurrentStep(4);
          return;
        }

        markStepCompleted(2);
        setCurrentStep(3);

      } else {
        toast({
          variant: "error",
          title: "Failed to Get NYKS",
          description: result.error || "Failed to get NYKS tokens",
        });
      }
    } catch (error) {
      toast({
        variant: "error",
        title: "Network Error",
        description: "Failed to connect to faucet service",
      });
    } finally {
      setIsLoading(false);

    }
  };

  const handleRegisterBTC = async () => {
    setIsLoading(true);

    try {

      if (!mainWallet) {
        toast({
          title: "Please connect your Cosmos wallet",
          description: "You must connect your Cosmos wallet to receive sats",
        });
        return;
      }

      const chainWallet = mainWallet.getChainWallet("nyks");

      if (!chainWallet) {
        toast({
          title: "Please connect your Cosmos wallet",
          description: "You must connect your Cosmos wallet to receive sats",
        });
        return;
      }
      toast({
        title: "Submitting address",
        description:
          "Please do not close this page while your address is being registered...",
      });

      const stargateClient = await chainWallet.getSigningStargateClient();

      const { registerBtcDepositAddress } =
        twilightproject.nyks.bridge.MessageComposer.withTypeUrl;

      const msg = registerBtcDepositAddress({
        btcDepositAddress: generateRandomBtcTestnetAddress(),
        twilightAddress: twilightAddress,
        btcSatoshiTestAmount: Long.fromNumber(50_000),
        twilightStakingAmount: Long.fromNumber(50_000),
      });

      try {
        const result = await stargateClient.signAndBroadcast(twilightAddress, [msg], "auto");

        console.log("result", result)
      }
      catch (err) {
        if (isUserRejection(err)) {
          toast({
            title: "Transaction rejected",
            description: "You declined the transaction in your wallet.",
          });
          return;
        }
        console.error(err)
        toast({
          variant: "error",
          title: "Error submitting address",
          description: "There was a problem with submitting your address, please try again later",
        });
        return;
      }

      markStepCompleted(3);
      setCurrentStep(4);

      toast({
        title: "BTC Address Registered",
        description: "Your address has been registered on the NYKS chain",
      });



    } catch (error) {
      toast({
        variant: "error",
        title: "Registration Failed",
        description: "Failed to register BTC deposit address",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetBTC = async () => {
    if (!twilightAddress) return;

    setIsLoading(true);

    try {
      const result = await callMintEndpoint(twilightAddress);

      if (result.success) {
        markStepCompleted(4);
        setCurrentStep(5); // Move to completion state

        toast({
          title: "BTC Tokens Received",
          description: (
            <div className="flex space-x-1 opacity-90">
              Successfully received 50,000 sats.{" "}
              {
                result.data?.txHash && (
                  <Button
                    variant="link"
                    className="inline-flex text-sm opacity-90 hover:opacity-100"
                    asChild
                  >
                    <Link
                      href={`${process.env.NEXT_PUBLIC_EXPLORER_URL as string}/tx/${result.data.txHash}`}
                      target={"_blank"}
                    >
                      Explorer link
                    </Link>
                  </Button>
                )
              }

            </div>
          ),
        });
      } else {
        toast({
          variant: "error",
          title: "Failed to Get BTC",
          description: result.error || "Failed to get BTC tokens",
        });
      }
    } catch (error) {
      toast({
        variant: "error",
        title: "Network Error",
        description: "Failed to connect to mint service",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
    setCompletedSteps([]);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-1">
              <Text asChild>
                <label className="text-primary-accent" htmlFor="twilight-address">
                  Twilight Address
                </label>
              </Text>
              <Input
                ref={twilightAddressRef}
                id="twilight-address"
                placeholder="twilight1..."
                value={twilightAddress}
                onChange={(e) => setTwilightAddress(e.target.value)}
                required
              />
            </div>
            <Button
              onClick={handleSubmitAddress}
              className="w-full justify-center"
              disabled={isLoading}
            >
              Continue
            </Button>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Text className="text-primary-accent">
                Address: <span className="text-primary font-mono">{twilightAddress}</span>
              </Text>
              <Text className="text-sm text-primary-accent opacity-80">
                Click below to receive 100,000 NYKS tokens from the faucet.
              </Text>
            </div>
            <Button
              onClick={handleGetNyks}
              className="w-full justify-center"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={16} />
                  Getting NYKS...
                </>
              ) : (
                "Get NYKS Tokens"
              )}
            </Button>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Text className="text-sm text-primary-accent opacity-80">
                Registering your BTC deposit address on the NYKS chain...
              </Text>
            </div>
            <Button
              onClick={handleRegisterBTC}
              className="w-full justify-center"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={16} />
                  Registering...
                </>
              ) : (
                "Register BTC Address"
              )}
            </Button>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Text className="text-sm text-primary-accent opacity-80">
                Ready to receive BTC tokens. This will mint 50,000 sats to your address.
              </Text>
            </div>
            <Button
              onClick={handleGetBTC}
              className="w-full justify-center"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={16} />
                  Minting BTC...
                </>
              ) : (
                "Get BTC Tokens"
              )}
            </Button>
          </div>
        );

      default:
        return (
          <div className="space-y-4 text-center">
            <CheckCircle className="mx-auto text-green-medium" size={48} />
            <Text heading="h3" className="text-green-medium">
              All Steps Completed!
            </Text>
            <Text className="text-primary-accent">
              You have successfully received both NYKS and BTC tokens.
            </Text>
            <Button
              onClick={handleReset}
              className="w-full justify-center"
              variant="secondary"
            >
              Start Over
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="flex h-full w-full flex-col px-4 md:px-0">
      <div className="mx-auto my-8 flex h-full w-full max-w-5xl grid-cols-2 flex-col gap-8 sm:my-16 sm:grid md:gap-16">
        <div className="space-y-6">
          <Text heading="h2" className="text-2xl font-medium sm:text-3xl">
            Twilight Faucet
          </Text>

          {/* Progress Steps */}
          <div className="space-y-2">
            {faucetSteps.map((step) => (
              <div
                key={step.id}
                className={`flex items-center space-x-3 p-3 rounded-md border transition-colors ${currentStep === step.id
                  ? "border-primary bg-primary/5"
                  : completedSteps.includes(step.id)
                    ? "border-green-medium/50 bg-green-medium/10"
                    : "border-outline/50"
                  }`}
              >
                <div
                  className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${completedSteps.includes(step.id)
                    ? "bg-green-medium text-black"
                    : currentStep === step.id
                      ? "bg-primary text-background"
                      : "bg-outline text-primary-accent"
                    }`}
                >
                  {completedSteps.includes(step.id) ? (
                    <CheckCircle size={16} />
                  ) : (
                    step.id
                  )}
                </div>
                <div className="flex-1">
                  <Text className="font-medium">{step.title}</Text>
                  <Text className="text-sm text-primary-accent opacity-80">
                    {step.description}
                  </Text>
                </div>
              </div>
            ))}
          </div>

          {/* Current Step Content */}
          <div className="border rounded-md p-6">
            {renderStepContent()}
          </div>
        </div>

        {/* Information Panel */}
        <div className="rounded-md border p-4">
          <Text heading="h3" className="mb-4">Important Information:</Text>
          <div className="space-y-3">
            <Text className="text-primary opacity-80 text-sm" asChild>
              <div className="flex items-start space-x-2">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-primary-accent" />
                <span>The faucet provides 100,000 NYKS tokens and 50,000 sats for testing purposes.</span>
              </div>
            </Text>
            <Text className="text-primary opacity-80 text-sm" asChild>
              <div className="flex items-start space-x-2">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-primary-accent" />
                <span>You must use the same twilight address for all steps in the process.</span>
              </div>
            </Text>
            <Text className="text-primary opacity-80 text-sm" asChild>
              <div className="flex items-start space-x-2">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-primary-accent" />
                <span>The BTC deposit address registration is required before minting BTC tokens.</span>
              </div>
            </Text>
            <Text className="text-primary opacity-80 text-sm" asChild>
              <div className="flex items-start space-x-2">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-primary-accent" />
                <span>This is for testnet use only</span>
              </div>
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page;