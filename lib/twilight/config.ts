import { z } from "zod";
import { SubaccountStruct } from "../types";

// todo: convert types to zod schemas
const SubAccountStructSchema = z.object({
  tag: z.string(),
  address: z.string(),
});

const SubAccountListSchema = z.array(SubAccountStructSchema);

function getLocalSubaccountList(twilightAddress: string) {
  const localStorageKey = `twilight-subaccount-${twilightAddress}`;

  const listOfSubaccountAddress = localStorage.getItem(localStorageKey);

  if (listOfSubaccountAddress === null) {
    return [];
  }

  const parsedSubaccountList = JSON.parse(listOfSubaccountAddress);

  const subAccountListRes =
    SubAccountListSchema.safeParse(parsedSubaccountList);

  if (!subAccountListRes.success) return [];

  return subAccountListRes.data;
}

function setLocalSubaccountList(
  twilightAddress: string,
  subAccounts: SubaccountStruct[]
) {
  try {
    const stringifiedSubaccountList = JSON.stringify(subAccounts);

    const localStorageKey = `twilight-subaccount-${twilightAddress}`;

    localStorage.setItem(localStorageKey, stringifiedSubaccountList);

    return {
      success: true,
    };
  } catch (err) {
    console.error(err);
    return {
      success: false,
    };
  }
}

/**
 * updates based on tag
 */
function updateLocalSubaccount(
  subAccountList: SubaccountStruct[],
  subAccountToUpdate: SubaccountStruct
) {
  return subAccountList.map((subAccount) => {
    if (subAccount.tag !== subAccountToUpdate.tag) return subAccount;

    return subAccountToUpdate;
  });
}

export {
  getLocalSubaccountList,
  setLocalSubaccountList,
  updateLocalSubaccount,
};
