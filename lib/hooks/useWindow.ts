"use client";
import { useEffect, useState } from "react";

function useWindow() {
  const [windowDimension, setWindowDimension] = useState({
    width: 0,
    height: 0,
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

    update();

    window.addEventListener("resize", update);

    return () => window.removeEventListener("resize", update);
  }, []);

  return windowDimension;
}

export default useWindow;
