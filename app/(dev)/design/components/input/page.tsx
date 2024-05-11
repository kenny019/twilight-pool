import { Input, NumberInput } from "@/components/input";
import { Text } from "@/components/typography";
import React from "react";

const InputComponentPage = () => {
  return (
    <div className="space-y-4">
      <Text heading="h1">Input</Text>
      <Input placeholder="Input with placeholder" />
      <div>
        <Text asChild>
          <label htmlFor="number-input">Number input</label>
        </Text>
        {/* <NumberInput /> */}
      </div>
    </div>
  );
};

export default InputComponentPage;
