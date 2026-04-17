"use client";
import { useEffect, useState } from "react";

/**
 * Like useWindow but tracks ONLY the viewport width.
 * Height changes (e.g. caused by the soft keyboard appearing on mobile) do NOT
 * trigger a re-render, which prevents the mobile keyboard from dismissing
 * immediately after it appears inside form inputs.
 */
function useWindowWidth(): number {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function update() {
      const next = window.innerWidth;
      setWidth((prev) => (prev === next ? prev : next));
    }

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return width;
}

export default useWindowWidth;
