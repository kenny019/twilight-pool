"use client";
import BtcWithdrawalForm from "@/app/_components/withdrawal/form";
import { Text } from "@/components/typography";
import useRedirectUnconnected from "@/lib/hooks/useRedirectUnconnected";
import React from "react";

const importantNotice = `
The reserve ID must match the reserve address you have registered with.
`;

const Page = () => {
  useRedirectUnconnected();

  return (
    <div className="flex h-full w-full flex-col px-4 md:px-0">
      <div className="mx-auto my-8 flex h-full w-full max-w-5xl grid-cols-2 flex-col gap-8 sm:my-16 sm:grid md:gap-16">
        <BtcWithdrawalForm />
        <div className="flex flex-col rounded-md border p-4">
          <Text heading="h3">Important:</Text>
          <Text className="text-primary opacity-80">{importantNotice}</Text>
        </div>
      </div>
    </div>
  );
};

export default Page;
