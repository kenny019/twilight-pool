"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import NextImage from "@/components/next-image";
import Skeleton from "@/components/skeleton";

interface WalletQRCodeProps {
  uri: string;
  logoSrc: string;
  size?: number;
}

export default function WalletQRCode({
  uri,
  logoSrc,
  size = 240,
}: WalletQRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !uri) return;
    setReady(false);

    QRCode.toCanvas(canvasRef.current, uri, {
      width: size,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then(() => setReady(true))
      .catch((err) => console.error("QR code render failed:", err));
  }, [uri, size]);

  const logoSize = Math.round(size * 0.15);

  return (
    <div className="relative inline-flex" style={{ width: size, height: size }}>
      {!ready && (
        <Skeleton
          className="absolute inset-0 rounded-lg"
          style={{ width: size, height: size }}
        />
      )}

      <canvas
        ref={canvasRef}
        className="rounded-lg"
        style={{ opacity: ready ? 1 : 0 }}
      />

      {/* Wallet logo overlay in center */}
      {ready && (
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white p-1 shadow-sm"
          style={{ width: logoSize + 8, height: logoSize + 8 }}
        >
          <NextImage
            src={logoSrc}
            alt="Wallet logo"
            width={logoSize}
            height={logoSize}
            className="rounded-full"
          />
        </div>
      )}
    </div>
  );
}
