import WalletRegistrationForm from "@/app/_components/registration/form";
import { Text } from "@/components/typography";
import React from "react";

const importantNotice = `Please register the Bitcoin Address from which you
plan on making deposits so that funds can be directed to your account properly.
Please don't forget to complete the next step (Verify Ownership Form) to make
a deposit from this address within 72 hours to complete the registration process.
`;

const Page = () => {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="mx-auto my-16 grid h-full w-full max-w-5xl grid-cols-2 gap-16">
        <WalletRegistrationForm />
        <div className="border p-4">
          <Text heading="h3">Important:</Text>
          <Text className="text-primary opacity-70">{importantNotice}</Text>
        </div>
      </div>
    </div>
  );
};

export default Page;
