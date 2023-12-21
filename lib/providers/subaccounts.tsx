import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { SubaccountStruct } from "../types";

interface UseSubaccountsProps {
  subAccounts: SubaccountStruct[];
  setSubaccounts: (val: SubaccountStruct[]) => void;
  selectedSubaccount: number; // store the index so we can use the subAccounts record as source of truth
  setSelectedSubaccount: (val: number) => void;
  addSubaccount: (val: SubaccountStruct) => void;
}

interface SubaccountProviderProps {
  children: React.ReactNode;
}

const defaultContext: UseSubaccountsProps = {
  subAccounts: [],
  setSubaccounts: () => {},
  selectedSubaccount: -3, // -1 represents main trading account selected
  setSelectedSubaccount: () => {},
  addSubaccount: () => {},
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

const Subaccount: React.FC<SubaccountProviderProps> = ({ children }) => {
  // todo: grab list of subaccounts in here
  const [subAccounts, setSubaccounts] = useState<SubaccountStruct[]>([]);

  const addSubaccount = useCallback(
    (newSubAccount: SubaccountStruct) => {
      setSubaccounts([...subAccounts, newSubAccount]);
    },
    [subAccounts]
  );

  const [selectedSubaccount, setSelectedSubaccount] = useState(-3);

  const providerValue = useMemo(
    () => ({
      subAccounts,
      setSubaccounts,
      selectedSubaccount,
      setSelectedSubaccount,
      addSubaccount,
    }),
    [subAccounts, setSubaccounts, selectedSubaccount, setSelectedSubaccount]
  );

  return (
    <SubaccountContext.Provider value={providerValue}>
      {children}
    </SubaccountContext.Provider>
  );
};
