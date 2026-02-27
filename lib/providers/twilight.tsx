import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useWallet } from "@cosmos-kit/react-lite";
import useGetRegisteredBTCAddress from "../hooks/useGetRegisteredBtcAddress";
import { createTwilightStore } from "../state/store";
import useLocalStorage from "../hooks/useLocalStorage";

interface UseTwilightProps {
  hasInit: string;
  setHasInit: (val: string) => void;
  colorTheme: string;
  setColorTheme: (val: string) => void;
  hasRegisteredBTC: boolean;
  setHasRegisteredBTC: (val: boolean) => void;
  hasConfirmedBTC: boolean;
  setHasConfirmedBTC: (val: boolean) => void;
  checkBTCRegistration: () => void;
}

interface TwilightProviderProps {
  hasInit?: string;
  children: React.ReactNode;
}

const defaultContext: UseTwilightProps = {
  hasInit: "",
  setHasInit: () => { },
  colorTheme: "pink",
  setColorTheme: () => { },
  hasRegisteredBTC: true,
  setHasRegisteredBTC: () => { },
  hasConfirmedBTC: true,
  setHasConfirmedBTC: () => { },
  checkBTCRegistration: () => { },
};

const twilightContext = createContext<UseTwilightProps | undefined>(undefined);

export const useTwilight = () => useContext(twilightContext) ?? defaultContext;

export const TwilightProvider: React.FC<TwilightProviderProps> = (props) => {
  return <Twilight {...props} />;
};

export const ThemeColors = ["pink", "purple", "orange"] as const;

const Twilight: React.FC<TwilightProviderProps> = ({ children }) => {
  const [hasInit, setHasInit] = useLocalStorage("init");
  const [storedColorTheme, setColorTheme] = useLocalStorage("color-theme");

  const colorTheme = storedColorTheme || "pink";

  const { mainWallet, status } = useWallet();

  const chainWallet = mainWallet?.getChainWallet("nyks");

  const [hasRegisteredBTC, setHasRegisteredBTC] = useState(true);
  const [hasConfirmedBTC, setHasConfirmedBTC] = useState(true);
  const [shouldRefetchBTCRegistration, setShouldRefetchBTCRegistration] =
    useState(true);

  const checkBTCRegistration = useCallback(() => {
    console.log("checkBTCRegistration");
    // setShouldRefetchBTCRegistration(true);
  }, []);

  function useOnWalletChange() {
    useEffect(() => {
      if (shouldRefetchBTCRegistration) return;
      // checkBTCRegistration();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chainWallet?.address]);
  }

  function useUpdateColorTheme() {
    useEffect(() => {
      const root = window.document.documentElement;

      root.classList.remove(...ThemeColors);

      root.classList.add(colorTheme);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [colorTheme]);
  }

  // function useCleanupAccountData() {
  //   useEffect(() => {
  //     if (status !== "Disconnected" && status !== "Connecting") return;

  //     if (quisPrivateKey) {
  //       setQuisPrivateKey("");
  //     }
  //   }, [status]);
  // }

  function useRehydrateTwilightStore() {
    useEffect(() => {
      async function updateTwilightStore() {
        const twilightAddress = chainWallet?.address || "";

        if (!twilightAddress) return;

        const twilightStore = createTwilightStore(
          `twilight-${twilightAddress}`
        );

        await twilightStore.persist.rehydrate();
        console.log(`rehydrated twilight-${twilightAddress}`);
      }

      updateTwilightStore();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chainWallet?.address]);
  }
  // useRehydrateTwilightStore();
  useOnWalletChange();
  // useCleanupAccountData();
  // useGetQuisPrivateKey();
  useUpdateColorTheme();

  const providerValue = useMemo(
    () => ({
      hasInit,
      setHasInit,
      colorTheme: colorTheme || "pink",
      setColorTheme,
      // quisPrivateKey,
      // setQuisPrivateKey,
      hasRegisteredBTC,
      setHasRegisteredBTC,
      hasConfirmedBTC,
      setHasConfirmedBTC,
      checkBTCRegistration,
    }),
    [
      hasInit,
      setHasInit,
      colorTheme,
      setColorTheme,
      // quisPrivateKey,
      // setQuisPrivateKey,
      hasRegisteredBTC,
      setHasRegisteredBTC,
      hasConfirmedBTC,
      setHasConfirmedBTC,
      checkBTCRegistration,
    ]
  );

  return (
    <twilightContext.Provider value={providerValue}>
      {children}
    </twilightContext.Provider>
  );
};
