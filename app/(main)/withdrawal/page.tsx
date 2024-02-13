"use client";
import BtcWithdrawalForm from "@/app/_components/withdrawal/form";
import { Text } from "@/components/typography";
import useRedirectUnconnected from "@/lib/hooks/useRedirectUnconnected";
import React from "react";

const importantNotice = `
`;

const Page = () => {
  useRedirectUnconnected();

  return (
    <div className="flex h-full w-full flex-col">
      <div className="mx-auto my-16 grid h-full w-full max-w-5xl grid-cols-2 gap-16">
        <BtcWithdrawalForm />
        <div className="rounded-md border p-4">
          <Text heading="h3">Important:</Text>
          <Text className="text-primary opacity-80">{importantNotice}</Text>
        </div>
      </div>
    </div>
  );
};

export default Page;
