"use client";

import { useEffect } from "react";

export function UpgradeSuccessBanner() {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has("upgraded")) {
      url.searchParams.delete("upgraded");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    }
  }, []);

  return (
    <div
      style={{
        flexShrink: 0,
        padding: "10px 20px",
        borderBottom: "1px solid #e5e7eb",
        background: "#f0fdf4",
      }}
      role="status"
    >
      <p style={{ margin: 0, fontSize: "14px", color: "#15803d" }}>
        Welcome to Elite! Your domain request is being processed.
      </p>
    </div>
  );
}
