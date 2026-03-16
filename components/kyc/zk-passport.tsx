import { SANCTIONED_COUNTRIES, ZKPassport } from "@zkpassport/sdk";
import { useEffect, useMemo, useState, useRef } from 'react';
import Button from '@/components/button';
import { Text } from '@/components/typography';
import QRCode from 'qrcode';
import { useToast } from '@/lib/hooks/useToast';

interface ZKPassportComponentProps {
  walletAddress: string;
  isMockPassport: boolean;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

const ZK_KYC_URL = process.env.NEXT_PUBLIC_KYC_ENDPOINT as string;

export default function ZKPassportComponent({
  walletAddress,
  onSuccess,
  onError,
  isMockPassport,
}: ZKPassportComponentProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string>("");
  const [requestId, setRequestId] = useState<string>("");
  const [status, setStatus] = useState<string>("Initializing...");
  const [isVerifying, setIsVerifying] = useState(false);
  const [qrGenerated, setQrGenerated] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const proofsRef = useRef<any[]>([]);

  const { toast } = useToast();

  useEffect(() => {
    console.log("isMockPassport", isMockPassport)
    const initializeZKPassport = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setStatus("Initializing ZK Passport...");

        // Initialize ZK Passport SDK
        const zkPassport = new ZKPassport();

        const request = await zkPassport.request({
          name: "Twilight Pool Region Verification",
          logo: process.env.NEXT_PUBLIC_APP_LOGO_URL as string,
          purpose: "adult",
          scope: "adult",
          devMode: isMockPassport ? true : false,
          validity: 180,
        })

        const builderResult = request
          .disclose("expiry_date")
          .disclose("issuing_country")
          .done();

        console.log("builderResult", builderResult);

        const {
          url,
          requestId: reqId,
          onRequestReceived,
          onGeneratingProof,
          onProofGenerated,
          onResult,
          onReject,
          onError: onSDKError,
        } = builderResult


        setQrUrl(url);
        setRequestId(reqId);
        setStatus("Ready - Scan QR code or click the link");

        // Set up event handlers
        onRequestReceived(() => {
          setStatus("Request received on device");
        });

        onGeneratingProof(() => {
          setStatus("Generating proof on device...");
        });

        onProofGenerated((proof) => {
          proofsRef.current.push(proof);
          setStatus("Proof generated successfully");
        });

        onReject(() => {
          setStatus("User rejected verification");
          setError("Verification was rejected by user");
          onError?.("User rejected verification");
        });

        onSDKError((err) => {
          setStatus("Error occurred");
          const errorMessage = (err && typeof err === 'object' && 'message' in err)
            ? (err as Error).message
            : (typeof err === 'string' ? err : "An error occurred during verification");
          setError(errorMessage);
          onError?.(err);
        });

        onResult(async ({ uniqueIdentifier, verified, result: queryResult }) => {
          try {
            console.log("queryResult", queryResult);
            console.log("proofsRef.current", proofsRef.current);
            console.log("verified", verified, "uniqueIdentifier", uniqueIdentifier)
            console.log("isMockPassport", isMockPassport)

            if (!verified) {
              toast({
                title: "Failed to verify passport",
                description: "Failed to verify passport, please try again later.",
              });
              return;
            }
            setIsVerifying(true);
            setStatus("Verifying with backend...");

            const response = await fetch(`${ZK_KYC_URL}/api/verify/zkpass`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                proofs: proofsRef.current,
                queryResult,
                scope: "adult",
                uniqueIdentifier,
                cosmosAddress: walletAddress,
                devMode: true,
              }),
            });

            if (response.ok) {
              setStatus("Verification completed successfully!");
              onSuccess?.();
            } else {
              throw new Error("Backend verification failed");
            }
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Backend verification failed";
            setStatus("Verification failed");
            setError(errorMessage);
            onError?.(err);
          } finally {
            setIsVerifying(false);
          }
        });

        setIsLoading(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to initialize ZK Passport";
        setError(errorMessage);
        setStatus("Initialization failed");
        setIsLoading(false);
        onError?.(err);
      }
    };

    initializeZKPassport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMockPassport]);

  // Separate effect to handle QR code generation
  useEffect(() => {
    const generateQRCode = async () => {
      if (qrUrl && canvasRef.current && !isLoading && !error) {
        try {
          console.log("Generating QR code for URL:", qrUrl);
          console.log("Canvas ref:", canvasRef.current);
          await QRCode.toCanvas(canvasRef.current, qrUrl);
          setQrGenerated(true);
          console.log("QR code generated successfully");
        } catch (err) {
          console.error("Failed to generate QR code:", err);
          setQrGenerated(false);
        }
      }
    };

    if (qrUrl) {
      generateQRCode();
    }
  }, [qrUrl, isLoading, error, qrGenerated]);

  const handleOpenDeeplink = () => {
    if (qrUrl) {
      window.open(qrUrl, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-4 p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <Text className="text-primary opacity-80">{status}</Text>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 p-6 border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 rounded-lg">
        <div className="text-red-500 text-2xl">⚠️</div>
        <Text className="text-red-700 dark:text-red-300 text-center">
          {error}
        </Text>
        <Button
          onClick={() => window.location.reload()}
          variant="secondary"
          size="default"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center space-y-2">
        <Text className="text-sm text-primary opacity-80">
          Request ID: {requestId}
        </Text>
        <Text className="text-sm font-medium text-primary">
          {status}
        </Text>
      </div>

      <div className="border border-primary/20 rounded-lg p-4 bg-white dark:bg-gray-900">
        {qrUrl ? (
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="max-w-full h-auto"
              width={256}
              height={256}
            />
            {!qrGenerated && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 rounded">
                <div className="text-center space-y-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  <Text className="text-sm text-primary opacity-70">Generating QR code...</Text>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-64 h-64 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded">
            <div className="text-center space-y-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
              <Text className="text-sm text-primary opacity-70">Initializing...</Text>
            </div>
          </div>
        )}
      </div>

      <Button
        onClick={handleOpenDeeplink}
        disabled={!qrUrl || isVerifying}
        variant="primary"
        size="default"
      >
        {isVerifying ? "Verifying..." : "Open ZK Passport App"}
      </Button>

      {isVerifying && (
        <div className="flex items-center gap-2 text-sm text-primary opacity-80">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          <Text>Processing verification...</Text>
        </div>
      )}

      <div className="text-center space-y-1 text-xs text-primary opacity-70 max-w-sm">
        <Text>
          Scan the QR code with your ZK Passport app or click the button above to open the verification link.
        </Text>
      </div>
    </div>
  );
}
