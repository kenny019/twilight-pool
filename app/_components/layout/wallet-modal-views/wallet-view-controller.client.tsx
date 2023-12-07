import React, { useEffect, useState } from "react";
import WalletWelcomeView from "./wallet-welcome.client";
import WalletProvidersView from "./wallet-providers.client";
import { DialogContent } from "@/components/dialog";
import WalletExplainView from "./wallet-explain.client";
import { useTwilight } from "@/lib/providers/singleton";
type availableViews = "welcome" | "explanation" | "providers";

export type WalletViewProps = {
  currentView: availableViews;
  setCurrentView: React.Dispatch<React.SetStateAction<availableViews>>;
};

const WalletViewController = () => {
  const { hasInit } = useTwilight();

  const [currentView, setCurrentView] = useState<availableViews>("welcome");

  useEffect(() => {
    if (currentView !== "providers" && hasInit) {
      setCurrentView("providers");
    }
  }, [hasInit]);

  const walletViewProps = {
    setCurrentView,
    currentView,
  };

  function Views() {
    switch (currentView) {
      case "welcome": {
        return <WalletWelcomeView {...walletViewProps} />;
      }
      case "explanation": {
        return <WalletExplainView {...walletViewProps} />;
      }
      case "providers": {
        return <WalletProvidersView {...walletViewProps} />;
      }
    }
  }

  return (
    <DialogContent className="top-[35%]">
      <Views />
    </DialogContent>
  );
};

export default WalletViewController;
