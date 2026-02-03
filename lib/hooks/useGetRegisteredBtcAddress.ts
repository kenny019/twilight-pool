import {
  getAllBTCDepositAddress,
  getRegisteredBTCAddress,
} from "../twilight/rest";
import { useQuery } from "@tanstack/react-query";

export default function useGetRegisteredBTCAddress(twilightAddress?: string) {
  const query = useQuery({
    queryKey: ["btc-registration", twilightAddress],
    queryFn: async () => {
      if (!twilightAddress)
        return {
          depositAddress: "",
          depositAmount: 0,
          isConfirmed: false,
        };

      const result = await getAllBTCDepositAddress();

      const foundRow = result.filter(
        (row) => row.twilightAddress == twilightAddress
      );

      if (!foundRow[0])
        return {
          depositAddress: "",
          depositAmount: 0,
          isConfirmed: false,
        };

      return {
        depositAddress: foundRow[0].btcDepositAddress,
        depositAmount: Number(foundRow[0].btcSatoshiTestAmount),
        isConfirmed: foundRow[0].isConfirmed,
      };
    },
  });

  return query;
}
