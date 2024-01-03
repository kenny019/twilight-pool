import React from "react";

type Props = {
  isLoaded: boolean;
  placeholder: React.ReactNode;
  children: React.ReactNode;
};

const Resource = ({ isLoaded, placeholder, children }: Props) => {
  if (!isLoaded) {
    return <>{placeholder}</>;
  }

  return children;
};

export default Resource;
