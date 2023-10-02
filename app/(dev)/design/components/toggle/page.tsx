import Switch from "@/components/switch";
import { Text } from "@/components/typography";
import React from "react";

const ToggleComponentPage = () => {
  return (
    <div className="space-y-4">
      <Text heading="h1">Toggle</Text>
      <div className="flex items-center space-x-2">
        <Text className="cursor-pointer select-none" asChild>
          <label htmlFor="test-switch">Switch with Label</label>
        </Text>
        <Switch id="test-switch" />
      </div>
      <div className="flex items-center space-x-2">
        <Switch disabled id="test-switch-disabled" />
        <Text
          className="cursor-pointer select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          asChild
        >
          <label htmlFor="test-switch-disabled">
            Disabled Switch with Label
          </label>
        </Text>
      </div>
    </div>
  );
};

export default ToggleComponentPage;
