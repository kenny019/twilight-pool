"use client";
import React, { useCallback, useContext } from "react";
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
import { twilightStoreContext, useTwilightStore } from "@/lib/providers/store";
import { useWallet } from "@cosmos-kit/react-lite";

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
  const twilightStore = useContext(twilightStoreContext);

  const { status, mainWallet } = useWallet();
  const optInLeaderboard = useTwilightStore((state) => state.optInLeaderboard);
  const setOptInLeaderboard = useTwilightStore((state) => state.setOptInLeaderboard);
  const twilightAddress =
    mainWallet?.getChainWallet("nyks")?.address || "";

  const exportData = useCallback(() => {
    if (!twilightAddress) {
      toast({
        title: "Export failed",
        description: "Please connect your wallet first.",
      });
      return;
    }

    if (!twilightStore) {
      toast({
        title: "Export failed",
        description: "Store not available",
      });
      return;
    }

    const storeState = twilightStore.getState();
    const jsonString = JSON.stringify(storeState);

    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${twilightAddress}-data.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Exported successfully",
      description: "Exported account data to your device.",
    });
  }, [toast, twilightAddress, twilightStore]);

  const importData = useCallback(() => {
    if (!twilightAddress) {
      toast({
        title: "Import failed",
        description: "Please connect your wallet first.",
      });
      return;
    }

    if (!twilightStore) {
      toast({
        title: "Import failed",
        description: "Store not available",
      });
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        twilightStore.setState(data);
        toast({
          title: "Imported successfully",
          description: "Account data has been imported.",
        });
      } catch {
        toast({
          title: "Import failed",
          description: "Invalid JSON file.",
        });
      }
    };
    input.click();
  }, [toast, twilightAddress, twilightStore]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="flex min-h-[44px] min-w-[44px] items-center justify-center touch-manipulation" aria-label="Settings">
          <SettingsIcon className="h-4 w-4 transition-colors hover:text-theme" />
        </button>
      </DialogTrigger>
      <DialogContent className="left-auto right-0 min-h-[100dvh] max-h-[100dvh] max-w-xs translate-x-0 rounded-none border-r-0 overflow-y-auto pb-[env(safe-area-inset-bottom)] data-[state=open]:![--tw-enter-scale:1] data-[state=closed]:![--tw-exit-scale:1] data-[state=open]:![--tw-enter-translate-y:0px] data-[state=closed]:![--tw-exit-translate-y:0px] data-[state=open]:![--tw-enter-translate-x:100%] data-[state=closed]:![--tw-exit-translate-x:100%] duration-300">
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
            {/* <Button
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
            </Button> */}
          </div>
          <Text className="select-none font-ui text-xs uppercase text-primary-accent">
            App Data
          </Text>
          <div className="space-y-2">
            <Button
              type="button"
              variant="ui"
              className="w-full justify-center"
              onClick={exportData}
            >
              Export App Data
            </Button>
            <Button
              type="button"
              variant="ui"
              className="w-full justify-center"
              onClick={importData}
            >
              Import App Data
            </Button>
            <Text className="text-xs text-primary-accent">
              Move your local Twilight state between browsers on the same
              account.
            </Text>
          </div>
          {status === "Connected" && (
            <>
              <Text className="select-none font-ui text-xs uppercase text-primary-accent">
                Leaderboard
              </Text>
              <div className="space-y-1">
                <div className="flex w-full items-center justify-between">
                  <label
                    className="cursor-pointer select-none"
                    htmlFor="toggle-leaderboard"
                  >
                    Leaderboard participation
                  </label>
                  <Switch
                    checked={optInLeaderboard}
                    onCheckedChange={setOptInLeaderboard}
                    id="toggle-leaderboard"
                  />
                </div>
                <Text className="text-xs text-primary-accent">
                  Track your trades on the chain for leaderboard participation.
                </Text>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default Settings;
