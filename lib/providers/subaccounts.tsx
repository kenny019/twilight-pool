import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import { SubaccountStruct } from "../types";
import {
  getLocalSubaccountList,
  setLocalSubaccountList,
  updateLocalSubaccount,
} from "../twilight/config";
import { useWallet } from "@cosmos-kit/react-lite";

interface UseSubaccountsProps {
  subAccounts: SubaccountStruct[];
  dispatchSubaccounts: React.Dispatch<SubAccountReducerAction>;
  selectedSubaccount: number; // store the index so we can use the subAccounts record as source of truth
  setSelectedSubaccount: (val: number) => void;
  addSubaccount: (twilightAddress: string, val: SubaccountStruct) => void;
}

interface SubaccountProviderProps {
  children: React.ReactNode;
}

const defaultContext: UseSubaccountsProps = {
  subAccounts: [],
  dispatchSubaccounts: () => {},
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

type SubAccountReducerAction = {
  type: "replace";
  payload: {
    accounts: SubaccountStruct[];
    twilightAddress: string;
  };
};

function subAccountReducer(
  state: SubaccountStruct[],
  action: SubAccountReducerAction
) {
  switch (action.type) {
    case "replace":
      const { twilightAddress, accounts } = action.payload;
      setLocalSubaccountList(twilightAddress, accounts);
      return action.payload.accounts;
    default:
      throw new Error();
  }
}

const Subaccount: React.FC<SubaccountProviderProps> = ({ children }) => {
  const { status, mainWallet } = useWallet();
  // todo: grab list of subaccounts in here
  const [subAccounts, dispatchSubaccounts] = useReducer(subAccountReducer, []);

  const addSubaccount = useCallback(
    (twilightAddress: string, newSubAccount: SubaccountStruct) => {
      const updatedSubAccounts = [...subAccounts, newSubAccount];
      dispatchSubaccounts({
        type: "replace",
        payload: {
          accounts: updatedSubAccounts,
          twilightAddress,
        },
      });
      setLocalSubaccountList(twilightAddress, updatedSubAccounts);
    },
    [subAccounts]
  );

  function usePopulateSubaccounts() {
    useEffect(() => {
      if (status !== "Connected") return;

      const chainWallet = mainWallet?.getChainWallet("nyks");

      if (!chainWallet) return;

      const twilightAddress = chainWallet.address;

      if (!twilightAddress) return;

      const localSubaccounts = getLocalSubaccountList(twilightAddress);

      console.log("populating localsubaccounts", localSubaccounts);
      dispatchSubaccounts({
        payload: {
          accounts: localSubaccounts,
          twilightAddress,
        },
        type: "replace",
      });
    }, [status]);
  }

  usePopulateSubaccounts();

  const [selectedSubaccount, setSelectedSubaccount] = useState(-3);

  const providerValue = useMemo(
    () => ({
      subAccounts,
      dispatchSubaccounts,
      selectedSubaccount,
      setSelectedSubaccount,
      addSubaccount,
    }),
    [
      subAccounts,
      dispatchSubaccounts,
      selectedSubaccount,
      setSelectedSubaccount,
    ]
  );

  return (
    <SubaccountContext.Provider value={providerValue}>
      {children}
    </SubaccountContext.Provider>
  );
};
