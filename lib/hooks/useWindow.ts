"use client";
import { useEffect, useState } from "react";

function useWindow() {
  const [windowDimension, setWindowDimension] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 1280,
    height: typeof window !== "undefined" ? window.innerHeight : 1280,
  });

  useEffect(() => {
    function update() {
      setWindowDimension({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    if (typeof window === "undefined") {
      return;
    }

    window.addEventListener("resize", update);

    return () => window.removeEventListener("resize", update);
  }, []);

  return windowDimension;
}

export default useWindow;
