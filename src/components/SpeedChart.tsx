import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, ReferenceArea, Tooltip } from "recharts";
import type { WPMSnapshot } from "@/hooks/useSpeechRecognition";

interface SpeedChartProps {
  data: WPMSnapshot[];
}

export function SpeedChart({ data }: SpeedChartProps) {
  if (data.length < 2) {
    return (
      <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
        Not enough data to show chart
      </div>
    );
  }

  const maxWPM = Math.max(...data.map(d => d.wpm), 180);

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 90%)" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 11, fill: "hsl(220, 10%, 50%)" }}
            tickFormatter={(v) => `${v}s`}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "hsl(220, 10%, 50%)" }}
            domain={[0, maxWPM + 20]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(0, 0%, 100%)",
              border: "1px solid hsl(220, 15%, 90%)",
              borderRadius: "8px",
              fontSize: 12,
            }}
            formatter={(value: number) => [`${value} WPM`, "Speed"]}
            labelFormatter={(label) => `${label}s`}
          />
          {/* Green zone */}
          <ReferenceArea y1={0} y2={140} fill="hsl(142, 71%, 45%)" fillOpacity={0.06} />
          {/* Yellow zone */}
          <ReferenceArea y1={140} y2={160} fill="hsl(45, 93%, 47%)" fillOpacity={0.08} />
          {/* Red zone */}
          <ReferenceArea y1={160} y2={maxWPM + 20} fill="hsl(0, 84%, 60%)" fillOpacity={0.06} />
          <ReferenceLine y={140} stroke="hsl(45, 93%, 47%)" strokeDasharray="4 4" strokeWidth={1} />
          <ReferenceLine y={160} stroke="hsl(0, 84%, 60%)" strokeDasharray="4 4" strokeWidth={1} />
          <Line
            type="monotone"
            dataKey="wpm"
            stroke="hsl(220, 60%, 50%)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
