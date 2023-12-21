"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import Button from "../../../components/button";
import RightArrowIcon from "../../../components/right-arrow";
import { Dialog, DialogTrigger } from "../../../components/dialog";
import WalletViewController from "./wallet-modal-views/wallet-view-controller.client";
import { useWallet } from "@cosmos-kit/react-lite";

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
              Connect Wallet
              <RightArrowIcon />
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
