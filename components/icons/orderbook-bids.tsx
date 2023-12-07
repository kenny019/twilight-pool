import React from "react";

type Props = {
  className?: string;
  onClick?: React.MouseEventHandler<Element>;
};

const OrderbookBidsIcon = ({ onClick, ...props }: Props) => {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer opacity-40 transition-opacity hover:opacity-100 data-[state=selected]:opacity-100"
      {...props}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
      >
        <g clipPath="url(#clip0_1526_5556)">
          <path
            opacity="0.3"
            d="M2.66667 0.75H21.3333C22.3919 0.75 23.25 1.60812 23.25 2.66667V21.3333C23.25 22.3919 22.3919 23.25 21.3333 23.25H2.66667C1.60812 23.25 0.75 22.3919 0.75 21.3333V2.66667C0.75 1.60812 1.60812 0.75 2.66667 0.75Z"
            stroke="hsl(var(--primary))"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8.69 5H5V18.7H8.69V5Z"
            stroke="hsl(var(--green-medium))"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            opacity="0.3"
            d="M13 7H19"
            stroke="hsl(var(--primary))"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            opacity="0.3"
            d="M13 12H19"
            stroke="hsl(var(--primary))"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            opacity="0.3"
            d="M13 17H19"
            stroke="hsl(var(--primary))"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
        <defs>
          <clipPath id="clip0_1526_5556">
            <rect width="24" height="24" fill="white" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
};

export default OrderbookBidsIcon;
