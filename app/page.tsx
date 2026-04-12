export default function Home() {
  return (
    <main style={{ padding: "2rem", maxWidth: "40rem" }}>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 800 }}>B2C PMES — Next.js (Edge API)</h1>
      <p style={{ marginTop: "1rem", lineHeight: 1.5 }}>
        The member UI is the Vite app in <code>frontend/</code>. This Next app hosts{" "}
        <code>app/api/**</code> routes on the Edge. <code>POST /auth/sync-member</code> is rewritten to{" "}
        <code>/api/auth/sync-member</code> (same path the SPA already uses against Nest).
      </p>
    </main>
  );
}
