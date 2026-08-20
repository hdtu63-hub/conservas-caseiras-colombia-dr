"use client";
import { useState, useEffect, useCallback } from "react";

interface Stats {
  total: {
    pageViews: number;
    clicksEsencial: number;
    clicksCompleta: number;
    checkoutViewsEsencial: number;
    checkoutViewsCompleta: number;
    receiptsUploaded: number;
    paymentsApproved: number;
    paymentsApprovedEsencial: number;
    paymentsApprovedCompleta: number;
    paymentsRejected: number;
  };
  today: {
    pageViews: number;
    clicksEsencial: number;
    clicksCompleta: number;
    checkoutViewsEsencial: number;
    checkoutViewsCompleta: number;
    receiptsUploaded: number;
    paymentsApproved: number;
    paymentsApprovedEsencial: number;
    paymentsApprovedCompleta: number;
    paymentsRejected: number;
    totalRevenueToday: number;
  };
  recentEvents: Array<{
    id: string;
    type: string;
    timestamp: string;
    metadata?: Record<string, string>;
  }>;
}

const EVENT_LABELS: Record<string, string> = {
  page_view: "👁️ Visita ao site",
  click_esencial: "🖱️ Clique Essencial",
  click_completa: "🖱️ Clique Completa",
  checkout_view_esencial: "🛒 Checkout Essencial",
  checkout_view_completa: "🛒 Checkout Completa",
  upload_receipt: "📎 Comprovante enviado",
  payment_approved: "✅ Pagamento aprovado",
  payment_rejected: "⏳ Pagamento pendente",
  payment_manual_review: "📧 E-mail para Revisão",
};

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [filterType, setFilterType] = useState<"all" | "approved" | "pending">("all");

  const fetchStats = useCallback(async (pwd: string, dateStr: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/track/stats?date=${dateStr}`, {
        headers: { "x-admin-password": pwd },
      });
      if (!res.ok) {
        if (res.status === 401) {
          setAuthenticated(false);
          setError("Senha incorreta");
          return;
        }
        throw new Error("Erro do servidor");
      }
      const data = await res.json();
      setStats(data);
      setError("");
    } catch {
      setError("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    fetchStats(password, selectedDate);
    const interval = setInterval(() => fetchStats(password, selectedDate), 30000);
    return () => clearInterval(interval);
  }, [authenticated, password, selectedDate, fetchStats]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthenticated(true);
    await fetchStats(password, selectedDate);
  }

  async function handleManualApprove(email: string, edition: string, receiptUrl: string) {
    if (!confirm(`¿Aprobar y enviar acceso a ${email}?`)) return;
    
    // Dispara Meta Pixel
    if (typeof window !== "undefined" && (window as any).fbq) {
      (window as any).fbq("track", "Purchase", {
        content_name: edition === "completa" ? "Colección Completa de Conservas" : "Guía Esencial de Conservas",
        currency: "COP",
        value: edition === "esencial" ? 20000 : 28000,
      });
    }

    try {
      // 1. Mover arquivo e enviar email
      await fetch("/api/send-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, edition, receiptUrl, moveReceipt: true })
      });
      
      // 2. Registar analytics
      await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "payment_approved", metadata: { email, edition, source: "manual", monto: edition === "esencial" ? "20000" : "28000" } })
      });

      alert("Aprobado y enviado con éxito.");
      fetchStats(password, selectedDate);
    } catch (e) {
      alert("Error al aprobar");
    }
  }

  if (!authenticated || !stats) {
    return (
      <main className="admin-page">
        <div className="admin-login">
          <h1>Painel de Administração</h1>
          <p>Digite sua senha para acessar</p>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha"
              autoFocus
            />
            <button type="submit" disabled={loading}>
              {loading ? "Carregando..." : "Entrar →"}
            </button>
          </form>
          {error && <p className="admin-error">{error}</p>}
        </div>
      </main>
    );
  }

  const t = stats.total;
  const d = stats.today;
  const conversionRate = d.pageViews > 0
    ? ((d.paymentsApproved / d.pageViews) * 100).toFixed(1)
    : "0.0";
  const clickToCheckout = (d.clicksEsencial + d.clicksCompleta) > 0
    ? (((d.checkoutViewsEsencial + d.checkoutViewsCompleta) / (d.clicksEsencial + d.clicksCompleta)) * 100).toFixed(1)
    : "0.0";

  const filteredEvents = stats.recentEvents.filter((ev) => {
    if (filterType === "all") return true;
    if (filterType === "approved") return ev.type.includes("approved");
    if (filterType === "pending") return ev.type === "payment_rejected" || ev.type === "payment_manual_review";
    return true;
  });

  return (
    <main className="admin-page">
      <div className="admin-container">
        <header className="admin-header">
          <div>
            <h1>Painel de Administração</h1>
            <p>Conservas Caseiras — Colômbia</p>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)} 
              style={{ padding: "8px", border: "1px solid var(--line)", borderRadius: "4px" }}
            />
            <button onClick={() => fetchStats(password, selectedDate)} className="admin-refresh" disabled={loading}>
              {loading ? "⟳ Carregando..." : "⟳ Atualizar"}
            </button>
          </div>
        </header>

        <section className="admin-section">
          <h2>📊 Resumo Geral</h2>
          <div className="metrics-grid">
            <div className="metric-card">
              <span className="metric-label">Visitas</span>
              <strong className="metric-value">{d.pageViews}</strong>
            </div>
            <div 
              className="metric-card accent-green"
              onClick={() => setFilterType(filterType === "approved" ? "all" : "approved")}
              style={{ cursor: "pointer", outline: filterType === "approved" ? "2px solid var(--forest)" : "none" }}
            >
              <span className="metric-label">Pagamentos aprovados</span>
              <strong className="metric-value">{d.paymentsApproved}</strong>
            </div>
            <div 
              className="metric-card accent-amber"
              onClick={() => setFilterType(filterType === "pending" ? "all" : "pending")}
              style={{ cursor: "pointer", outline: filterType === "pending" ? "2px solid var(--terra)" : "none" }}
            >
              <span className="metric-label">Pagamentos pendentes</span>
              <strong className="metric-value">{d.paymentsRejected}</strong>
            </div>
            <div className="metric-card">
              <span className="metric-label">Comprovantes enviados</span>
              <strong className="metric-value">{d.receiptsUploaded}</strong>
            </div>
          </div>
        </section>

        <section className="admin-section">
          <h2>🖱️ Cliques e Conversão</h2>
          <div className="metrics-grid">
            <div className="metric-card">
              <span className="metric-label">Cliques Edição Essencial</span>
              <strong className="metric-value">{d.clicksEsencial}</strong>
            </div>
            <div className="metric-card">
              <span className="metric-label">Cliques Edição Completa</span>
              <strong className="metric-value">{d.clicksCompleta}</strong>
            </div>
            <div className="metric-card">
              <span className="metric-label">Checkout Essencial</span>
              <strong className="metric-value">{d.checkoutViewsEsencial}</strong>
            </div>
            <div className="metric-card">
              <span className="metric-label">Checkout Completa</span>
              <strong className="metric-value">{d.checkoutViewsCompleta}</strong>
            </div>
          </div>
        </section>

        <section className="admin-section">
          <h2>📈 Taxas de Conversão e Vendas ({selectedDate})</h2>
          
          <div className="metrics-grid" style={{ marginBottom: "24px", display: "grid", gridTemplateColumns: "1fr", background: "rgba(20, 93, 61, 0.1)", border: "1px solid var(--forest)", padding: "16px", borderRadius: "12px" }}>
            <div className="metric-card" style={{ background: "transparent", border: "none", padding: "0", textAlign: "center", boxShadow: "none" }}>
              <span className="metric-label" style={{ fontSize: "16px", textTransform: "uppercase", letterSpacing: "1px", color: "var(--forest)" }}>Vendas Totais do Dia</span>
              <strong className="metric-value" style={{ fontSize: "42px", color: "var(--forest)" }}>
                {(d.totalRevenueToday || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
              </strong>
            </div>
          </div>

          <div className="metrics-grid metrics-wide">
            <div className="metric-card">
              <span className="metric-label">Visita → Pagamento</span>
              <strong className="metric-value">{conversionRate}%</strong>
              <div className="metric-bar"><div style={{ width: `${Math.min(parseFloat(conversionRate), 100)}%` }} /></div>
            </div>
            <div className="metric-card">
              <span className="metric-label">Clique → Checkout</span>
              <strong className="metric-value">{clickToCheckout}%</strong>
              <div className="metric-bar"><div style={{ width: `${Math.min(parseFloat(clickToCheckout), 100)}%` }} /></div>
            </div>
            <div className="metric-card accent-green">
              <span className="metric-label">Vendas Essencial</span>
              <strong className="metric-value">{d.paymentsApprovedEsencial}</strong>
            </div>
            <div className="metric-card accent-green">
              <span className="metric-label">Vendas Completa</span>
              <strong className="metric-value">{d.paymentsApprovedCompleta}</strong>
            </div>
          </div>
        </section>

        <section className="admin-section">
          <h2>📋 Últimos Eventos</h2>
          <div className="events-table-wrap">
            <table className="events-table">
              <thead>
                <tr>
                  <th>Data / Hora</th>
                  <th>Evento</th>
                  <th>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((ev) => (
                  <tr key={ev.id} className={`event-row event-${ev.type.includes("approved") ? "approved" : ev.type.includes("rejected") ? "rejected" : "default"}`}>
                    <td className="event-time">
                      {new Date(ev.timestamp).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}{" "}
                      {new Date(ev.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </td>
                    <td>{EVENT_LABELS[ev.type] || ev.type}</td>
                    <td className="event-meta">
                      {ev.metadata ? Object.entries(ev.metadata).map(([k, v]) => {
                        if (k === "receiptUrl") {
                          return (
                            <span key={k}>
                              <a href={v} target="_blank" rel="noopener noreferrer" style={{color: "var(--terra)", textDecoration: "underline"}}>Ver Comprovante ↗</a>
                            </span>
                          );
                        }
                        return <span key={k}>{k}: {v}</span>;
                      }) : "—"}
                      
                      {ev.type === "payment_manual_review" && ev.metadata?.email && ev.metadata?.edition && (
                        <div style={{ marginTop: "8px" }}>
                          <button onClick={() => handleManualApprove(ev.metadata!.email, ev.metadata!.edition, "")} style={{ background: "var(--forest)", color: "#fff", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", border: "none", cursor: "pointer" }}>
                            ✅ Aceitar Comprovante
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredEvents.length === 0 && (
                  <tr><td colSpan={3} className="no-events">Nenhum evento registrado ainda</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="admin-footer">
          <span>Atualização automática a cada 30 segundos</span>
          <span>Conservas Caseiras © 2026</span>
        </footer>
      </div>
    </main>
  );
}
