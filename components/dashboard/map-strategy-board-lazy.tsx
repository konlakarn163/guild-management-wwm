"use client";

import dynamic from "next/dynamic";

export const MapStrategyBoardLazy = dynamic(
  () => import("@/components/dashboard/map-strategy-board").then((module) => module.MapStrategyBoard),
  {
    ssr: false,
  },
);