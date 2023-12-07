import { createChart, ColorType } from "lightweight-charts";
import React, { useRef } from "react";

const Chart = () => {
  const chartContainerRef = useRef();
  const data = [
    { time: "2023-12-01", value: 80.01 },
    { time: "2023-12-02", value: 96.63 },
    { time: "2023-12-03", value: 76.64 },
    { time: "2023-12-04", value: 81.89 },
    { time: "2023-12-05", value: 74.43 },
    { time: "2023-12-06", value: 80.01 },
    { time: "2023-12-07", value: 96.63 },
    { time: "2023-12-08", value: 76.64 },
    { time: "2023-12-09", value: 81.89 },
    { time: "2023-12-10", value: 74.43 },
  ];

  return <div></div>;
};

export default Chart;
