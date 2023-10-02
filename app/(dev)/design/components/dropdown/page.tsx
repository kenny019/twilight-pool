import Button from "@/components/button";
import {
  DropdownContent,
  DropdownGroup,
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
  DropdownSeparator,
  DropdownTrigger,
} from "@/components/dropdown";
import { Text } from "@/components/typography";
import React from "react";

const DropdownComponentPage = () => {
  return (
    <div className="space-y-4">
      <Text heading="h1">Dropdown</Text>
      <DropdownMenu>
        <DropdownTrigger asChild>
          <Button size="small">Open</Button>
        </DropdownTrigger>
        <DropdownContent className="mt-2 before:mt-[7px]">
          <DropdownLabel>Dropdown Label</DropdownLabel>
          <DropdownSeparator />
          <DropdownGroup>
            <DropdownItem className="hover:bg-green hover:text-black">
              Option #1
            </DropdownItem>
            <DropdownItem className="hover:bg-green hover:text-black">
              Option #2
            </DropdownItem>
          </DropdownGroup>
        </DropdownContent>
      </DropdownMenu>
    </div>
  );
};

export default DropdownComponentPage;
