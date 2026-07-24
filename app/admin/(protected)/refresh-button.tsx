"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RefreshButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  function handleRefresh() {
    setLoading(true);
    router.refresh();
    setTimeout(() => setLoading(false), 500);
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={loading}
      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
    >
      {loading ? "Actualisation..." : "↻ Actualiser"}
    </button>
  );
}
