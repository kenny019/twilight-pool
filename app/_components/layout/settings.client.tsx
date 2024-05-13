"use client";
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/dialog";
import { ChevronDown, SettingsIcon } from "lucide-react";
import { Text } from "@/components/typography";
import Switch from "@/components/switch";
import {
  DropdownContent,
  DropdownGroup,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@/components/dropdown";
import { ThemeColors, useTwilight } from "@/lib/providers/twilight";
import cn from "@/lib/cn";
import { useTheme } from "next-themes";
import Button from "@/components/button";
import { useToast } from "@/lib/hooks/useToast";
import { useSessionStore } from "@/lib/providers/session";

// workaround for tailwind css
enum ColorBG {
  "pink" = "bg-pink",
  "purple" = "bg-purple",
  "orange" = "bg-orange",
}

const Settings = () => {
  // todo: refactor into seperate files
  const { colorTheme, setColorTheme } = useTwilight();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const privateKey = useSessionStore((state) => state.privateKey);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <SettingsIcon className="h-4 w-4 cursor-pointer transition-colors hover:text-theme" />
      </DialogTrigger>
      <DialogContent className="left-auto right-0 min-h-screen max-w-xs translate-x-0 rounded-none border-r-0">
        <DialogTitle>Settings</DialogTitle>
        <div className="space-y-4">
          <Text className="select-none font-ui text-xs uppercase text-primary-accent">
            Theme
          </Text>
          <div className="space-y-1">
            <div className="flex w-full items-center justify-between">
              <label
                className="cursor-pointer select-none"
                htmlFor="toggle-theme"
              >
                Light mode
              </label>
              <Switch
                checked={theme === "light"}
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                id="toggle-theme"
              />
            </div>
            <Text className="text-xs text-primary-accent">{`Enables light mode for the interface.`}</Text>
          </div>
          <div className="space-y-1">
            <div className="flex w-full items-center justify-between">
              <label className="select-none">Color scheme</label>
              <DropdownMenu>
                <DropdownTrigger asChild>
                  <button className="group ml-4 flex items-center gap-1 text-sm capitalize">
                    {colorTheme}
                    <ChevronDown className="h-3 w-3 transition-all group-data-[state=open]:-rotate-180" />
                  </button>
                </DropdownTrigger>
                <DropdownContent
                  align="end"
                  className="mt-2 min-w-[48px] before:mt-[7px]"
                >
                  <DropdownGroup>
                    {ThemeColors.map((color, index) => (
                      <DropdownItem
                        key={index}
                        className="flex items-center justify-end space-x-1 hover:bg-primary hover:text-button-secondary"
                        onClick={() => setColorTheme(color)}
                      >
                        <div
                          className={cn("h-3 w-3", ColorBG[ThemeColors[index]])}
                        />
                        <p className="capitalize">{color}</p>
                      </DropdownItem>
                    ))}
                  </DropdownGroup>
                </DropdownContent>
              </DropdownMenu>
            </div>
          </div>
          <div className="space-y-1">
            <Button
              onClick={() => {
                if (!privateKey) {
                  toast({
                    title: "Error getting seed",
                    description:
                      "Wallet must be connected to export seed to clipboard",
                    variant: "error",
                  });
                  return;
                }

                navigator.clipboard.writeText(privateKey);
                toast({
                  title: "Copied to clipboard",
                  description: "Seed has been exported to clipboard",
                });
              }}
            >
              Export Seed to Clipboard
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default Settings;
