import SettleLimitDialog from '@/components/settle-limit-dialog';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

type DialogProviderProps = {
  children: React.ReactNode;
};

type UseDialogProps = {
  openLimitDialog: (account: string) => void;
  isOpenLimitDialog: boolean;
};

const defaultContext: UseDialogProps = {
  openLimitDialog: () => { },
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

  const openLimitDialog = useCallback((newAccount: string) => {
    setAccount(newAccount);
    setIsOpenLimitDialog(true);
  }, []);

  const values = useMemo(() => ({
    openLimitDialog,
    isOpenLimitDialog,
    account,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [isOpenLimitDialog, account, openLimitDialog])

  return (
    <dialogContext.Provider value={values}>
      <SettleLimitDialog account={account} open={isOpenLimitDialog} onOpenChange={setIsOpenLimitDialog} />
      {children}
    </dialogContext.Provider>
  )
}

export default DialogProvider
