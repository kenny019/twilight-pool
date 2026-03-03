import ConditionalCloseDialog from "@/components/conditional-close-dialog";
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type DialogProviderProps = {
  children: React.ReactNode;
};

type UseDialogProps = {
  openLimitDialog: (account: string) => void;
  openConditionalDialog: (account: string, mode: "limit" | "sltp") => void;
  isOpenLimitDialog: boolean;
};

const defaultContext: UseDialogProps = {
  openLimitDialog: () => {},
  openConditionalDialog: () => {},
  isOpenLimitDialog: false,
};

const dialogContext = createContext<UseDialogProps | undefined>(undefined);

export const useLimitDialog = () => useContext(dialogContext) ?? defaultContext;

export const DialogProvider: React.FC<DialogProviderProps> = (props) => {
  return <Dialog {...props} />;
};

const Dialog: React.FC<DialogProviderProps> = ({ children }) => {
  const [isOpenLimitDialog, setIsOpenLimitDialog] = useState(false);
  const [account, setAccount] = useState<string>("");
  const [initialTab, setInitialTab] = useState<"limit" | "sltp">("limit");

  const openLimitDialog = useCallback((newAccount: string) => {
    setAccount(newAccount);
    setInitialTab("limit");
    setIsOpenLimitDialog(true);
  }, []);

  const openConditionalDialog = useCallback(
    (newAccount: string, mode: "limit" | "sltp") => {
      setAccount(newAccount);
      setInitialTab(mode);
      setIsOpenLimitDialog(true);
    },
    []
  );

  const values = useMemo(
    () => ({
      openLimitDialog,
      openConditionalDialog,
      isOpenLimitDialog,
      account,
    }),
    [isOpenLimitDialog, account, openLimitDialog, openConditionalDialog]
  );

  return (
    <dialogContext.Provider value={values}>
      <ConditionalCloseDialog
        account={account}
        initialTab={initialTab}
        open={isOpenLimitDialog}
        onOpenChange={setIsOpenLimitDialog}
      />
      {children}
    </dialogContext.Provider>
  );
};

export default DialogProvider;
