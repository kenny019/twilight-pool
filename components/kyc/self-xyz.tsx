import { SelfApp, SelfAppBuilder, SelfQRcodeWrapper } from '@selfxyz/qrcode';
import { getUniversalLink } from "@selfxyz/core";
import { useEffect, useMemo, useState } from 'react';
import Button from '@/components/button';
import { v4 as uuidv4 } from 'uuid';
import { toast } from '@/lib/hooks/useToast';
import wfetch from '@/lib/http';

const BACKEND_URL = process.env.NEXT_PUBLIC_KYC_ENDPOINT as string

function buildUserDefinedData(twilightAddress: string): string {
  return [
    `Wallet: ${twilightAddress}`,
    `Only supported Asia-Pacific passports are eligible`,
    `Full list: frontend.twilight.rest/countries`,
    `⚠️ Not restricted ≠ eligible`
  ].join("\n");
}

export default function SelfQRComponent({
  walletAddress,
  handleSuccess,
  isMockPassport,
}: {
  walletAddress: string;
  handleSuccess: () => void;
  isMockPassport: boolean;
}) {
  const [selfApp, setSelfApp] = useState<SelfApp | null>(null);
  const [universalLink, setUniversalLink] = useState("");
  const [userId] = useState(uuidv4());

  useEffect(() => {
    const initializeSelfApp = async () => {
      try {

        const response = await fetch(`${BACKEND_URL}/disclosures`)

        const result = await response.json()

        const {
          status,
          data: disclosures
        } = result;

        console.log(disclosures)

        const userDefinedData = buildUserDefinedData(walletAddress);

        const app = new SelfAppBuilder({
          version: 2,
          appName: "Twilight Self Passport",
          scope: "twilight-relayer-passport",
          endpoint: `${BACKEND_URL}/api/verify${isMockPassport ? "/self/mock" : ""}`,
          logoBase64: process.env.NEXT_PUBLIC_APP_LOGO_URL as string,
          userId: userId,
          userIdType: "uuid",
          endpointType: "staging_https",
          userDefinedData: userDefinedData,
          disclosures: disclosures,
          devMode: isMockPassport ? true : false,
        }).build();

        setSelfApp(app);
        setUniversalLink(getUniversalLink(app));

      } catch (error) {
        console.error("Failed to initialize Self app:", error);
      }
    }

    initializeSelfApp();
  }, [walletAddress, userId, isMockPassport]);


  const fetchWhitelistStatus = async (recipientAddress: string) => {
    try {
      const body = JSON.stringify({
        recipientAddress: recipientAddress
      });

      const { success, data, error } = await wfetch(`${BACKEND_URL}/api/verify/whitelist`)
        .post({ body })
        .json<{
          data: {
            address: string;
            whitelisted: boolean;
          }
        }>();

      if (!success) {
        console.error("Failed to fetch whitelist status:", error);
        return false;
      }

      if (!data.data.whitelisted) {
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error fetching whitelist status:", error);
      return false;
    }
  };

  const onSuccess = async () => {
    // Fetch whitelist status
    const whitelistStatus = await fetchWhitelistStatus(walletAddress);

    if (!whitelistStatus) {
      toast({
        title: "Failed to verify passport",
        description: "Failed to verify passport, please do toggle Mock Passport if you are using a mock passport.",
        variant: "error",
      });
      return;
    }

    toast({
      title: "Passport verified successfully",
      description: "Your passport has been verified successfully.",
    });

    handleSuccess();
  }

  if (!selfApp) return null;

  const handleOpenDeeplink = () => {
    if (universalLink) {
      window.open(universalLink, '_blank');
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <SelfQRcodeWrapper
        onSuccess={() => {
          console.log("Passport verified successfully");
          onSuccess();
        }}
        onError={() => {

          toast({
            title: "Failed to verify passport",
            description: "Failed to verify passport, please do toggle Mock Passport if you are using a mock passport.",
            variant: "error",
          });
        }}
        selfApp={selfApp}
      />
      <Button
        onClick={handleOpenDeeplink}
        disabled={!universalLink}
        variant="primary"
        size="default"
      >
        Open Self App
      </Button>
    </div>
  )
}