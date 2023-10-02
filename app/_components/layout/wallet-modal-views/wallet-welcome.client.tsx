import { DialogDescription, DialogTitle } from "@/components/dialog";
import { Text } from "@/components/typography";
import React from "react";
import { WalletViewProps } from "./wallet-view-controller.client";
import { BarChart4, EyeOff, Lock, type LucideIcon } from "lucide-react";
import Button from "@/components/button";

function IconWrapper({ Icon }: { Icon: LucideIcon }) {
  return (
    <div className="mr-4 rounded-full bg-button-secondary p-2 text-primary-accent">
      <Icon className="h-6 w-6" />
    </div>
  );
}

function ItemRow({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <div className="flex items-center">
      <IconWrapper Icon={icon} />
      <div className="flex flex-col flex-wrap">
        <Text heading="h3" className="my-0 text-lg">
          {title}
        </Text>
        <Text className="text-primary-accent">{description}</Text>
      </div>
    </div>
  );
}

const WalletWelcomeView = ({
  currentView,
  setCurrentView,
}: WalletViewProps) => {
  return (
    <>
      <DialogTitle>Welcome to Twilight</DialogTitle>
      <DialogDescription asChild className="space-y-4">
        <div>
          <Text className="text-primary-accent">{`Start trading on the world's most private
        Bitcoin inverse perpetual exchange.`}</Text>
          <ItemRow
            title="Liquid"
            description="We specialize in providing liquidity for Bitcoin inverse perpetuals."
            icon={BarChart4}
          />
          <ItemRow
            title="Private"
            description="Anonymous transactions that are fast with lower fees."
            icon={EyeOff}
          />
          <ItemRow
            title="Secure"
            description="Cutting edge tech on Bitcoin layer 2 providing security and self-custody."
            icon={Lock}
          />
          <Button
            onClick={() => setCurrentView("explanation")}
            size="default"
            className="w-full justify-center"
          >
            Get Started
          </Button>
        </div>
      </DialogDescription>
    </>
  );
};

export default WalletWelcomeView;
