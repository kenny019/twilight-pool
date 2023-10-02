import Checkbox from "@/components/checkbox";
import { Text } from "@/components/typography";
import React from "react";

const CheckboxComponentPage = () => {
  return (
    <div className="space-y-4">
      <Text heading="h1">Checkbox</Text>
      <div className="flex items-center space-x-2">
        <Checkbox id="test-checkbox" />
        <Text className="cursor-pointer select-none" asChild>
          <label htmlFor="test-checkbox">Checkbox with label</label>
        </Text>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox disabled id="test-checkbox-disabled" />
        <Text
          className="cursor-pointer select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          asChild
        >
          <label htmlFor="test-checkbox-disabled">
            Disabled checkbox with label
          </label>
        </Text>
      </div>
    </div>
  );
};

export default CheckboxComponentPage;
