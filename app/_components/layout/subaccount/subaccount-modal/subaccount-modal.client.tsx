import { Dialog, DialogContent, DialogTrigger } from "@/components/dialog";
import React, { createContext, useContext, useMemo, useState } from "react";
import SubaccountListView from "./subaccount-modal-views/subaccount-list.client";
import SubaccountCreateView from "./subaccount-modal-views/subaccount-create.client";
import SubaccountEditView from "./subaccount-modal-views/subaccount-edit.client";

type availableViews = "list" | "create" | "edit";

type Props = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

// todo: refactor all these into a reusable dialog context factory
type DialogContext = {
  open: boolean;
  setOpen: (val: boolean) => void;
  view: availableViews;
  setView: (val: availableViews) => void;
  selectedSubaccount: string;
  setSelectedSubaccount: (val: string) => void;
};

const dialogContext = createContext<DialogContext>({
  open: false,
  setOpen: () => {},
  view: "list",
  setView: () => {},
  selectedSubaccount: "",
  setSelectedSubaccount: () => {},
});

export const useSubaccountDialog = () =>
  useContext<DialogContext>(dialogContext);

const SubaccountModal = ({ open, setOpen }: Props) => {
  const [view, setView] = useState<availableViews>("list");
  const [selectedSubaccount, setSelectedSubaccount] = useState("");

  const providerValue = useMemo(() => {
    return {
      open,
      setOpen,
      view,
      setView,
      selectedSubaccount,
      setSelectedSubaccount,
    };
  }, [open, view, setOpen, setView]);

  function Views() {
    switch (view) {
      case "list": {
        return <SubaccountListView />;
      }
      case "create": {
        return <SubaccountCreateView />;
      }
      case "edit": {
        return <SubaccountEditView />;
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen} defaultOpen={open}>
      <DialogContent className="">
        <dialogContext.Provider value={providerValue}>
          <Views />
        </dialogContext.Provider>
      </DialogContent>
    </Dialog>
  );
};

export default SubaccountModal;
