import ConnectWallet from "@/app/_components/layout/connect-wallet.client";
import Button from "@/components/button";
import {
  DropdownContent,
  DropdownGroup,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@/components/dropdown";
import ExchangeResource from "@/components/exchange-resource";
import { Input, NumberInput } from "@/components/input";
import { Text } from "@/components/typography";
import cn from "@/lib/cn";
import { useGrid } from "@/lib/providers/grid";
import { useWallet } from "@cosmos-kit/react-lite";
import { ChevronDown } from "lucide-react";
import React from "react";

const OrderLimitForm = () => {
  const { width } = useGrid();

  const { status } = useWallet();
  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="flex flex-col space-y-3 px-3"
    >
      <div>
        <Text className="mb-1 text-xs opacity-80" asChild>
          <label htmlFor="input-order-price">Order Price</label>
        </Text>
        <div className="flex flex-row space-x-2">
          <NumberInput id="input-order-price" />
        </div>
      </div>
      <div>
        <DropdownMenu>
          <DropdownTrigger className="group">
            <Text className="mb-1 flex cursor-pointer items-center gap-1 text-sm opacity-80">
              Order by Qty
              <ChevronDown className="h-3 w-3 transition-all group-data-[state=open]:-rotate-180" />
            </Text>
          </DropdownTrigger>
          <DropdownContent className="mt-1 before:mt-[3px]">
            <DropdownGroup>
              <DropdownItem className="hover:bg-primary hover:text-button-secondary">
                25%
              </DropdownItem>
              <DropdownItem className="hover:bg-primary hover:text-button-secondary">
                50%
              </DropdownItem>
              <DropdownItem className="hover:bg-primary hover:text-button-secondary">
                75%
              </DropdownItem>
              <DropdownItem className="hover:bg-primary hover:text-button-secondary">
                100%
              </DropdownItem>
            </DropdownGroup>
          </DropdownContent>
        </DropdownMenu>

        <Input
          id="input-order-amount"
          type="number"
          placeholder="Single Contract value 0.01 BTC"
        />
      </div>
      <div className="space-y-1">
        <div className="tracking-tigther">
          <p className="text-primary-accent">
            Available <span className="text-accent-300"> -- USDT</span>
          </p>
        </div>
        <div className="flex w-full justify-between tracking-tighter">
          <p className="text-primary-accent">
            Max (Long) <span className="text-accent-300"> -- Cont</span>
          </p>
          <p className="text-primary-accent">
            Max (Long) <span className="text-accent-300"> -- Cont</span>
          </p>
        </div>
      </div>
      {status === "Connected" ? (
        <div
          className={cn(
            "flex justify-between",
            width < 350 ? "flex-col space-y-2" : "flex-row space-x-4"
          )}
        >
          <ExchangeResource>
            <Button
              className="border-green-medium py-2 text-green-medium opacity-70 transition-opacity hover:border-green-medium hover:text-green-medium hover:opacity-100"
              variant="ui"
            >
              Buy
            </Button>
          </ExchangeResource>
          <ExchangeResource>
            <Button
              variant="ui"
              className="border-red py-2 text-red opacity-70 transition-opacity hover:border-red hover:text-red hover:opacity-100"
            >
              Sell
            </Button>
          </ExchangeResource>
        </div>
      ) : (
        <div className="flex w-full justify-center">
          <ConnectWallet />
        </div>
      )}
    </form>
  );
};

export default OrderLimitForm;
