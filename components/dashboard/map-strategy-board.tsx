"use client";

import { Download, Save } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Circle, Layer, Line, Stage, Text } from "react-konva";
import type Konva from "konva";
import { SectionCard } from "@/components/ui/section-card";
import type { StrategyNode } from "@/lib/types";

const initialNodes: StrategyNode[] = [
  { id: "line-1", type: "line", x: 80, y: 80, x2: 260, y2: 170, color: "#ef4444" },
  { id: "circle-1", type: "circle", x: 300, y: 150, color: "#22c55e" },
  { id: "text-1", type: "text", x: 100, y: 40, text: "Push Team A", color: "#f59e0b" },
];

export function MapStrategyBoard() {
  const stageRef = useRef<Konva.Stage | null>(null);
  const [nodes] = useState<StrategyNode[]>(initialNodes);
  const [title, setTitle] = useState("Castle Siege Week Plan");

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ title, nodes }, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `strategy-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportPng = () => {
    if (!stageRef.current) {
      return;
    }

    const dataUrl = stageRef.current.toDataURL({ pixelRatio: 2 });
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `strategy-${Date.now()}.png`;
    link.click();
  };

  const renderedNodes = useMemo(
    () =>
      nodes.map((node) => {
        if (node.type === "line") {
          return (
            <Line
              key={node.id}
              points={[node.x, node.y, node.x2 ?? node.x, node.y2 ?? node.y]}
              stroke={node.color ?? "#f97316"}
              strokeWidth={4}
              tension={0.2}
            />
          );
        }

        if (node.type === "circle") {
          return <Circle key={node.id} x={node.x} y={node.y} radius={14} fill={node.color ?? "#0ea5e9"} />;
        }

        return (
          <Text
            key={node.id}
            x={node.x}
            y={node.y}
            text={node.text ?? "Marker"}
            fill={node.color ?? "#111827"}
            fontStyle="bold"
            fontSize={18}
          />
        );
      }),
    [nodes],
  );

  return (
    <SectionCard title="Map Strategy" subtitle="Draw plan, save JSON for edit later, export PNG to share on Discord">
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none ring-2 ring-transparent transition focus:border-amber-300 focus:ring-amber-200/30"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportJson}
            className="inline-flex items-center gap-1 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800"
          >
            <Save size={16} /> Save JSON
          </button>
          <button
            type="button"
            onClick={exportPng}
            className="inline-flex items-center gap-1 rounded-2xl bg-[#f5c548] px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-300"
          >
            <Download size={16} /> Export PNG
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[24px] border border-slate-700 bg-slate-900 p-2 shadow-inner">
        <Stage width={900} height={380} ref={stageRef}>
          <Layer>{renderedNodes}</Layer>
        </Stage>
      </div>
    </SectionCard>
  );
}