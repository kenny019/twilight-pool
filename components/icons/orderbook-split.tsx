import React from "react";

type Props = {
  className?: string;
  onClick?: React.MouseEventHandler<Element>;
};

const OrderbookSplitIcon = ({ onClick, ...props }: Props) => {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer opacity-40 transition-opacity hover:opacity-100 data-[state=selected]:opacity-100"
      {...props}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g clipPath="url(#clip0_1526_5549)">
          <path
            opacity="0.3"
            d="M2.66667 0.75H21.3333C22.3919 0.75 23.25 1.60812 23.25 2.66667V21.3333C23.25 22.3919 22.3919 23.25 21.3333 23.25H2.66667C1.60812 23.25 0.75 22.3919 0.75 21.3333V2.66667C0.75 1.60812 1.60812 0.75 2.66667 0.75Z"
            stroke="hsl(var(--primary))"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8.69231 5H5V9.92308H8.69231V5Z"
            stroke="hsl(var(--red))"
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
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8.69231 13.8462H5V18.7693H8.69231V13.8462Z"
            stroke="hsl(var(--green-medium))"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
        <defs>
          <clipPath id="clip0_1526_5549">
            <rect width="24" height="24" fill="white" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
};

export default OrderbookSplitIcon;
