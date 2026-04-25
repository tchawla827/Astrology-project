import React from "react";

import type { PublicSharePayload } from "@/lib/sharing/tokens";

type ShareCardProps = {
  payload: PublicSharePayload;
  shareUrl: string;
  width: number;
  height: number;
};

function Divider({ color }: { color: string }) {
  return <div style={{ height: 1, width: "100%", backgroundColor: color }} />;
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        color: "#d9b95f",
        fontSize: 24,
        fontWeight: 800,
        letterSpacing: 5,
        textTransform: "uppercase",
      }}
    >
      {children}
    </div>
  );
}

function Bullet({ children, compact }: { children: React.ReactNode; compact: boolean }) {
  return (
    <div style={{ display: "flex", gap: compact ? 12 : 18, alignItems: "flex-start" }}>
      <div
        style={{
          width: compact ? 8 : 10,
          height: compact ? 8 : 10,
          marginTop: compact ? 12 : 16,
          borderRadius: 999,
          backgroundColor: "#d9b95f",
          flexShrink: 0,
        }}
      />
      <div style={{ color: "#ece3c7", fontSize: compact ? 24 : 32, lineHeight: compact ? 1.35 : 1.42 }}>{children}</div>
    </div>
  );
}

export function renderShareCard({ payload, shareUrl, width, height }: ShareCardProps) {
  const compact = height < 900;
  const why = payload.answer.why.slice(0, 3);
  const chartLine = payload.charts_used.length > 0 ? `based on ${payload.charts_used.join(" / ")}` : "based on the chart";
  const displayUrl = shareUrl.replace(/^https?:\/\//, "");

  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#100f18",
        color: "#f5edda",
        padding: compact ? "54px 70px" : "78px 86px",
        fontFamily: "Inter, Arial, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ color: "#f5edda", fontSize: compact ? 34 : 42, fontWeight: 900, letterSpacing: 8 }}>ASTRI</div>
        <div
          style={{
            width: compact ? 54 : 66,
            height: compact ? 54 : 66,
            border: "2px solid #d9b95f",
            borderRadius: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#d9b95f",
            fontSize: compact ? 28 : 34,
            fontWeight: 700,
          }}
        >
          A
        </div>
      </div>

      <div style={{ marginTop: compact ? 24 : 38 }}>
        <Divider color="#373148" />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: compact ? 22 : 36, marginTop: compact ? 32 : 56, flex: 1 }}>
        <section style={{ display: "flex", flexDirection: "column", gap: compact ? 14 : 22 }}>
          <Label>Verdict</Label>
          <Divider color="#3d354b" />
          <div
            style={{
              color: "#fff6dc",
              fontFamily: "Georgia, Times New Roman, serif",
              fontSize: compact ? 47 : 68,
              lineHeight: 1.08,
              maxHeight: compact ? 156 : 230,
              overflow: "hidden",
            }}
          >
            {payload.answer.verdict}
          </div>
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: compact ? 12 : 20 }}>
          <Label>Why</Label>
          <Divider color="#3d354b" />
          <div style={{ display: "flex", flexDirection: "column", gap: compact ? 9 : 14 }}>
            {why.map((item) => (
              <Bullet compact={compact} key={item}>
                {item}
              </Bullet>
            ))}
          </div>
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: compact ? 12 : 20 }}>
          <Label>Timing</Label>
          <Divider color="#3d354b" />
          <div style={{ color: "#ece3c7", fontSize: compact ? 25 : 34, lineHeight: 1.35, maxHeight: compact ? 72 : 138, overflow: "hidden" }}>
            {payload.answer.timing.summary}
          </div>
        </section>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: compact ? 10 : 14 }}>
        <Divider color="#373148" />
        <div style={{ color: "#9f9ab0", fontSize: compact ? 18 : 24, letterSpacing: 1.2 }}>{chartLine}</div>
        <div style={{ color: "#d9b95f", fontSize: compact ? 21 : 28, fontWeight: 700 }}>{displayUrl}</div>
      </div>
    </div>
  );
}
