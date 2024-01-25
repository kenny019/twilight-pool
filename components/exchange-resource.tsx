import { useTwilight } from "@/lib/providers/singleton";
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
import { Text } from "./typography";
import Button from "./button";
import { useRouter } from "next/navigation";

type Props = {
  children: React.ReactNode;
};

const ExchangeResource = ({ children }: Props) => {
  const [open, setOpen] = useState(false);
  const { hasRegisteredBTC, hasConfirmedBTC } = useTwilight();

  const router = useRouter();

  if (hasRegisteredBTC && hasConfirmedBTC) return children;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="top-[35%]">
        {hasRegisteredBTC ? (
          <DialogTitle>Verify BTC Address</DialogTitle>
        ) : (
          <DialogTitle>Register BTC Address</DialogTitle>
        )}
        <DialogDescription asChild className="space-y-4">
          <div>
            {hasRegisteredBTC ? (
              <Text className="leading-5 text-primary-accent">
                You will need to verify your Bitcoin Address with the exact
                deposit amount before performing this action.
              </Text>
            ) : (
              <Text className="leading-5 text-primary-accent">
                You will need to register your Bitcoin Address from which you
                plan on making deposits from.
              </Text>
            )}
            <Button
              onClick={() => {
                setOpen(false);
                router.push(
                  hasRegisteredBTC ? "/verification" : "/registration"
                );
              }}
              size="default"
              className="w-full justify-center"
            >
              {hasRegisteredBTC ? "Verify Now" : "Register Now"}
            </Button>
          </div>
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
};

export default ExchangeResource;
