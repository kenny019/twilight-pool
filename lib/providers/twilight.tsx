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
  hasConfirmedBTC: boolean;
  checkBTCRegistration: () => void;
}

interface TwilightProviderProps {
  hasInit?: string;
  children: React.ReactNode;
}

const defaultContext: UseTwilightProps = {
  hasInit: "",
  setHasInit: () => {},
  colorTheme: "pink",
  setColorTheme: () => {},
  hasRegisteredBTC: false,
  hasConfirmedBTC: false,
  checkBTCRegistration: () => {},
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

  const [hasRegisteredBTC, setHasRegisteredBTC] = useState(false);
  const [hasConfirmedBTC, setHasConfirmedBTC] = useState(false);
  const [shouldRefetchBTCRegistration, setShouldRefetchBTCRegistration] =
    useState(true);

  const checkBTCRegistration = useCallback(() => {
    console.log("checkBTCRegistration");
    setShouldRefetchBTCRegistration(true);
  }, []);

  function useOnWalletChange() {
    useEffect(() => {
      if (shouldRefetchBTCRegistration) return;
      checkBTCRegistration();
    }, [chainWallet?.address]);
  }

  function useUpdateColorTheme() {
    useEffect(() => {
      const root = window.document.documentElement;

      root.classList.remove(...ThemeColors);

      root.classList.add(colorTheme);
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

        const twilightStore = createTwilightStore();

        twilightStore.persist.setOptions({
          name: `twilight-${twilightAddress}`,
        });

        await twilightStore.persist.rehydrate();
        console.log(`rehydrated twilight-${twilightAddress}`);
      }

      updateTwilightStore();
    }, [chainWallet?.address]);
  }

  const registeredBtcResponse = useGetRegisteredBTCAddress(
    mainWallet,
    chainWallet,
    shouldRefetchBTCRegistration
  );

  function useHandleBTCAddress() {
    useEffect(() => {
      console.log("useHandleBTCAddress", registeredBtcResponse);
      // note: sets to default whenever wallet changes
      setHasRegisteredBTC(false);
      setHasConfirmedBTC(false);
      setShouldRefetchBTCRegistration(false);

      if (
        !registeredBtcResponse ||
        !registeredBtcResponse.success ||
        !registeredBtcResponse.data
      ) {
        return;
      }

      setHasRegisteredBTC(true);
      if (registeredBtcResponse.data.isConfirmed) setHasConfirmedBTC(true);
    }, [registeredBtcResponse]);
  }

  // useRehydrateTwilightStore();
  useOnWalletChange();
  useHandleBTCAddress();
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
      hasConfirmedBTC,
      checkBTCRegistration,
    ]
  );

  return (
    <twilightContext.Provider value={providerValue}>
      {children}
    </twilightContext.Provider>
  );
};
