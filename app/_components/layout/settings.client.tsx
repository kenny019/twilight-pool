"use client";
import React from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/dialog";
import { SettingsIcon } from "lucide-react";

const Settings = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <SettingsIcon className="hover:text-theme h-4 w-4 cursor-pointer" />
      </DialogTrigger>
      <DialogContent className="left-auto right-0 min-h-screen max-w-xs translate-x-0 rounded-none border-r-0"></DialogContent>
    </Dialog>
  );
};

export default Settings;
