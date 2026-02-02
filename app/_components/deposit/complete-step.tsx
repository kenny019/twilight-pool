"use client";
import { Text } from "@/components/typography";
import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";

const CompleteStep = () => {
  const router = useRouter();

  useEffect(() => {
    const timeout = setTimeout(() => {
      router.replace("/");
    }, 3000);

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center space-y-6 py-12">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
        <CheckCircle2 className="h-10 w-10 text-green-500" />
      </div>
      <div className="text-center space-y-2">
        <Text heading="h2" className="text-2xl font-medium sm:text-3xl">
          Deposit Complete
        </Text>
        <Text className="text-primary-accent">
          Your Bitcoin address has been verified successfully.
        </Text>
        <Text className="text-sm text-primary-accent">
          Redirecting to home...
        </Text>
      </div>
    </div>
  );
};

export default CompleteStep;
