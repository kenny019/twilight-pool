import { useCallback, useEffect, useState } from "react";

const useLocalStorage = (key: string): [string, (val: string) => void] => {
  const keyVal = `twilight-${key}`;
  const [data, setData] = useState("");

  const getData = useCallback(() => {
    if (typeof window === "undefined") {
      return "";
    }

    try {
      const data = window.localStorage.getItem(keyVal);
      return data || "";
    } catch (err) {
      console.error(`Error reading localStorage, key ${keyVal}`, err);
      return "";
    }
  }, [keyVal]);

  const setLocalData = useCallback(
    (val: string) => {
      if (typeof window === "undefined") {
        console.warn("window has not loaded");
      }

      try {
        window.localStorage.setItem(keyVal, val);
        setData(val);
      } catch (err) {
        console.error(err);
      }
    },
    [keyVal]
  );

  useEffect(() => {
    setData(getData());
  }, [getData]);

  return [data, setLocalData];
};

export default useLocalStorage;
