import { createContext, useContext, useMemo, useState } from "react";
import { SubaccountStruct } from "../types";

interface UseSubaccountsProps {
  subAccounts: SubaccountStruct[];
  setSubAccounts: (val: SubaccountStruct[]) => void;
  selectedSubaccount: number; // store the index so we can use the subAccounts record as source of truth
  setSelectedSubaccount: (val: number) => void;
}

interface SubaccountProviderProps {
  children: React.ReactNode;
}

const defaultContext: UseSubaccountsProps = {
  subAccounts: [],
  setSubAccounts: () => {},
  selectedSubaccount: -3, // -1 represents main trading account selected
  setSelectedSubaccount: () => {},
};

const SubaccountContext = createContext<UseSubaccountsProps | undefined>(
  undefined
);

export const useSubaccount = () =>
  useContext(SubaccountContext) ?? defaultContext;

export const SubaccountProvider: React.FC<SubaccountProviderProps> = (
  props
) => {
  return <Subaccount {...props} />;
};

const subAccountsData = [
  {
    tag: "Subaccount 1",
    address: "0x1234567890123456789012345678901234567890",
  },
  {
    tag: "Subaccount 2",
    address: "0x1234567890123456789012345678901234567890",
  },
  {
    tag: "Subaccount 3",
    address: "0x1234567890123456789012345678901234567890",
  },
];

const Subaccount: React.FC<SubaccountProviderProps> = ({ children }) => {
  // todo: grab list of subaccounts in here
  const [subAccounts, setSubAccounts] = useState(subAccountsData);

  const [selectedSubaccount, setSelectedSubaccount] = useState(-3);

  const providerValue = useMemo(
    () => ({
      subAccounts,
      setSubAccounts,
      selectedSubaccount,
      setSelectedSubaccount,
    }),
    [subAccounts, setSubAccounts, selectedSubaccount, setSelectedSubaccount]
  );

  return (
    <SubaccountContext.Provider value={providerValue}>
      {children}
    </SubaccountContext.Provider>
  );
};
