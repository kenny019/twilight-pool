import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocalStorage } from "../hooks";
import { TradingAccountStruct } from "../types";
import { useWallet } from "@cosmos-kit/react-lite";
import {
  generateSignMessage,
  getLocalTradingAccountAddress,
} from "../twilight/chain";
import {
  generatePublicKey,
  generateTradingAccountAddress,
} from "../twilight/zkos";
import useGetRegisteredBTCAddress from "../hooks/useGetRegisteredBtcAddress";

interface UseTwilightProps {
  hasInit: string;
  setHasInit: (val: string) => void;
  colorTheme: string;
  setColorTheme: (val: string) => void;
  quisPrivateKey: string;
  setQuisPrivateKey: (val: string) => void;
  mainTradingAccount?: TradingAccountStruct;
  setMainTradingAccount: (val: TradingAccountStruct) => void;
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
  quisPrivateKey: "",
  setQuisPrivateKey: () => {},
  mainTradingAccount: undefined,
  setMainTradingAccount: () => {},
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

  const [mainTradingAccount, setMainTradingAccount] =
    useState<TradingAccountStruct>();

  const [quisPrivateKey, setQuisPrivateKey] = useState("");

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

  function useGetTradingAccountFromLocal() {
    useEffect(() => {
      // todo: refactor into context with flag to retry
      async function getTradingAccountFromLocal() {
        if (
          status !== "Connected" ||
          !quisPrivateKey ||
          mainTradingAccount?.address
        )
          return;

        const chainWallet = mainWallet?.getChainWallet("nyks");

        if (!chainWallet) {
          console.error("no chainWallet");
          return;
        }

        const twilightAddress = chainWallet.address;

        if (!twilightAddress) {
          console.error("no twilightAddress");
          return;
        }

        try {
          const storedQuisTradingAddress =
            getLocalTradingAccountAddress(twilightAddress);

          if (storedQuisTradingAddress) {
            setMainTradingAccount({
              address: storedQuisTradingAddress,
              tag: "main",
            });
            return;
          }

          const quisPublicKeyHex = await generatePublicKey({
            signature: quisPrivateKey,
          });

          const mainTradingAddress = await generateTradingAccountAddress({
            publicKeyHex: quisPublicKeyHex,
          });

          try {
            window.localStorage.setItem(
              `twilight-trading-${twilightAddress}`,
              mainTradingAddress
            );

            setMainTradingAccount({
              address: mainTradingAddress,
              tag: "main",
            });

            console.log(
              "created a new main trading address",
              mainTradingAddress
            );
          } catch (err) {
            console.error(err);
          }
        } catch (err) {
          console.error(err);
        }
      }

      getTradingAccountFromLocal();
    }, [status, quisPrivateKey]);
  }

  function useGetQuisPrivateKey() {
    useEffect(() => {
      async function getQuisPrivateKey() {
        if (!!quisPrivateKey || status !== "Connected") return;

        const chainWallet = mainWallet?.getChainWallet("nyks");

        if (!chainWallet) {
          console.error("no chainWallet");
          return;
        }

        const twilightAddress = chainWallet.address;

        if (!twilightAddress) {
          console.error("no twilightAddress");
          return;
        }

        try {
          const [_key, signature] = await generateSignMessage(
            chainWallet,
            twilightAddress,
            "Hello Twilight!"
          );

          // note: not really private key but for our purposes
          // it acts as the way to derive the public key
          setQuisPrivateKey(signature as string);
        } catch (err) {
          console.error(err);
        }
      }
      getQuisPrivateKey();
    }, [status]);
  }

  function useUpdateColorTheme() {
    useEffect(() => {
      const root = window.document.documentElement;

      root.classList.remove(...ThemeColors);

      root.classList.add(colorTheme);
    }, [colorTheme]);
  }

  function useCleanupAccountData() {
    useEffect(() => {
      if (status !== "Disconnected" && status !== "Connecting") return;

      console.log("cleaning up account data");
      if (mainTradingAccount) {
        setMainTradingAccount(undefined);
      }

      if (quisPrivateKey) {
        setQuisPrivateKey("");
      }

      checkBTCRegistration();
    }, [status]);
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

  useOnWalletChange();
  useHandleBTCAddress();
  useCleanupAccountData();
  useGetQuisPrivateKey();
  useUpdateColorTheme();
  useGetTradingAccountFromLocal();

  const providerValue = useMemo(
    () => ({
      hasInit,
      setHasInit,
      colorTheme: colorTheme || "pink",
      setColorTheme,
      quisPrivateKey,
      setQuisPrivateKey,
      mainTradingAccount,
      setMainTradingAccount,
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
      quisPrivateKey,
      setQuisPrivateKey,
      mainTradingAccount,
      setMainTradingAccount,
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
