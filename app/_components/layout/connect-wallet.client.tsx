"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import Button from "../../../components/button";
import RightArrowIcon from "../../../components/right-arrow";
import { Dialog, DialogTrigger } from "../../../components/dialog";
import WalletViewController from "./wallet-modal-views/wallet-view-controller.client";
import { useWallet } from "@cosmos-kit/react-lite";
import Resource from "@/components/resource";
import { Loader2 } from "lucide-react";

type DialogContext = {
  open: boolean;
  setOpen: (val: boolean) => void;
};

const dialogContext = createContext<DialogContext>({
  open: false,
  setOpen: () => {},
});

export const useWalletDialog = () => useContext<DialogContext>(dialogContext);

const ConnectWallet = () => {
  const [open, setOpen] = useState(false);

  const { status, mainWallet } = useWallet();

  console.log("stat", status);
  return (
    <>
      {status === "Connected" ? (
        <Button
          onClick={async (e) => {
            e.preventDefault();
            await mainWallet?.disconnect();
          }}
          size="small"
          className="w-[180px]"
        >
          Disconnect <RightArrowIcon />
        </Button>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="small" className="w-[180px]">
              <Resource
                isLoaded={!open}
                placeholder={<Loader2 className="animate-spin" />}
              >
                Connect Wallet
                <RightArrowIcon />
              </Resource>
            </Button>
          </DialogTrigger>
          <dialogContext.Provider value={{ open, setOpen }}>
            <WalletViewController />
          </dialogContext.Provider>
        </Dialog>
      )}
    </>
  );
};

export default ConnectWallet;
