"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export function RevenueChart({ data }: { data: { date: string; revenue: number }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b3a7a" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#3b3a7a" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7ddd0" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#4a475e" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: "#4a475e" }} axisLine={false} tickLine={false} width={48} />
          <Tooltip formatter={(v: number) => `LKR ${v.toLocaleString()}`} />
          <Area type="monotone" dataKey="revenue" stroke="#3b3a7a" strokeWidth={2} fill="url(#rev)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
