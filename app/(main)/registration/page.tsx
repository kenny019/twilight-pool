"use client";
import WalletRegistrationForm from "@/app/_components/registration/form";
import { Text } from "@/components/typography";
import useRedirectUnconnected from "@/lib/hooks/useRedirectUnconnected";
import React from "react";

const importantNotice = `Please register the Bitcoin Address from which you
plan on making deposits so that funds can be directed to your account properly.
Please don't forget to complete the next step (Verify Ownership Form) to make
a deposit from this address within 72 hours to complete the registration process.
`;

const Page = () => {
  useRedirectUnconnected();
  return (
    <div className="flex h-full w-full flex-col px-4 md:px-0">
      <div className="mx-auto my-8 flex h-full w-full max-w-5xl grid-cols-2 flex-col gap-8 sm:my-16 sm:grid md:gap-16">
        <WalletRegistrationForm />
        <div className="rounded-md border p-4">
          <Text heading="h3">Important:</Text>
          <Text className="text-primary opacity-80">{importantNotice}</Text>
        </div>
      </div>
    </div>
  );
};

export default Page;
