"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

type Point = { date: string; solde: number };

export default function TresorerieChart({ data }: { data: Point[] }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Pas encore assez de données pour afficher un graphique.
      </p>
    );
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 0 }).format(n);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="soldeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0F6E56" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#0F6E56" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12, fill: "#6b7280" }}
          minTickGap={24}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "#6b7280" }}
          tickFormatter={fmt}
          width={48}
        />
        <Tooltip
          formatter={(value: number) => [
            `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value)} FCFA`,
            "Solde",
          ]}
          labelStyle={{ fontSize: 12 }}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Area
          type="monotone"
          dataKey="solde"
          stroke="#0F6E56"
          strokeWidth={2}
          fill="url(#soldeGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
