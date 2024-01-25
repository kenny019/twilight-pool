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
  const { hasRegisteredBTC } = useTwilight();

  const router = useRouter();

  if (hasRegisteredBTC) return children;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="top-[35%]">
        <DialogTitle>Register BTC Address</DialogTitle>
        <DialogDescription asChild className="space-y-4">
          <div>
            <Text className="leading-5 text-primary-accent">
              You will need to register your Bitcoin Address from which you plan
              on making deposits from.
            </Text>
            <Button
              onClick={() => {
                setOpen(false);
                router.push("/registration");
              }}
              size="default"
              className="w-full justify-center"
            >
              Register Now
            </Button>
          </div>
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
};

export default ExchangeResource;
