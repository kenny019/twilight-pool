"use client";
import Image, { ImageProps } from "next/image";
import React, { useState } from "react";
import cn from "@/lib/cn";
import Skeleton from "./skeleton";

interface Props extends ImageProps {}

const NextImage = ({ width, height, alt, className, ...props }: Props) => {
  const [loading, setLoading] = useState(true);

  return (
    <div className="relative">
      {loading && (
        <Skeleton
          className={cn("absolute z-10 rounded-md", className)}
          style={{
            width: width,
            height: height,
          }}
        />
      )}
      <Image
        className={cn("rounded-md", className)}
        alt={alt}
        width={width}
        height={height}
        {...props}
        onLoad={() => {
          setLoading(false);
        }}
      />
    </div>
  );
};

export default NextImage;
