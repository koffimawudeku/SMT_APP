"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
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
    new Intl.NumberFormat("fr-FR", { notation: "compact" }).format(n);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
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
            `${new Intl.NumberFormat("fr-FR").format(value)} FCFA`,
            "Solde",
          ]}
          labelStyle={{ fontSize: 12 }}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Line
          type="monotone"
          dataKey="solde"
          stroke="#0F6E56"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
