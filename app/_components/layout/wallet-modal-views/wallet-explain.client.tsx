import { DialogDescription, DialogTitle } from "@/components/dialog";
import { Text } from "@/components/typography";
import React from "react";
import { WalletViewProps } from "./wallet-view-controller.client";
import Button from "@/components/button";

function ItemRow({
  title,
  description,
  text,
}: {
  title: string;
  description: string;
  text: string;
}) {
  return (
    <div className="flex items-center">
      <div className="mr-2 flex h-8 w-8 items-center justify-center rounded-full bg-button-secondary text-primary-accent">
        <p>{text}</p>
      </div>
      <div className="flex max-w-[420px] flex-col flex-wrap">
        <Text heading="h3" className="my-0 text-lg">
          {title}
        </Text>
        <Text className="text-primary-accent">{description}</Text>
      </div>
    </div>
  );
}

const WalletExplainView = ({
  currentView,
  setCurrentView,
}: WalletViewProps) => {
  return (
    <>
      <DialogTitle>Connect wallet</DialogTitle>
      <DialogDescription
        asChild
        className="space-y-4 duration-300 animate-in fade-in"
      >
        <div>
          <Text className="leading-5 text-primary-accent">{`Start trading on the world's most private
        Bitcoin inverse perpetual exchange.`}</Text>
          <ItemRow
            title="Add Twilight Chain"
            text={"1"}
            description="Add the nyks chain to your wallet and allow Twilight to connect to your wallet on nyks."
          />
          <ItemRow
            title="Verify Ownership"
            text={"2"}
            description="Confirm you are the owner of this wallet."
          />
          <Button
            onClick={() => setCurrentView("providers")}
            size="default"
            className="w-full justify-center"
          >
            Connect Wallet
          </Button>
        </div>
      </DialogDescription>
    </>
  );
};

export default WalletExplainView;
