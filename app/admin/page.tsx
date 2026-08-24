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
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || body.error || `Erro ${res.status}`);
      }
      const data = await res.json();
      setStats(data);
      setError("");
    } catch (e: unknown) {
      setError(`Erro: ${e instanceof Error ? e.message : String(e)}`);
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

  // Add search state
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"pedidos"|"trafico"|"ventas"|"emails">("pedidos");

  const filteredEvents = stats.recentEvents.filter((ev) => {
    if (filterType === "approved" && !ev.type.includes("approved")) return false;
    if (filterType === "pending" && ev.type !== "payment_rejected" && ev.type !== "payment_manual_review") return false;
    if (filterType === "rejected" && ev.type !== "payment_rejected") return false;
    
    if (searchTerm) {
      const email = ev.metadata?.email?.toLowerCase() || "";
      if (!email.includes(searchTerm.toLowerCase())) return false;
    }
    return true;
  });

  const generateNameFromEmail = (email: string) => {
    if (!email) return "Cliente Anónimo";
    const namePart = email.split('@')[0];
    return namePart.replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getStatusInfo = (type: string) => {
    if (type.includes("approved")) return { label: "Aprobado", className: "status-pill approved" };
    if (type === "payment_rejected" || type === "payment_manual_review") return { label: "Pendiente", className: "status-pill pending" };
    return { label: "Otro", className: "status-pill default" };
  };

  return (
    <main className="admin-dashboard">
      <div className="admin-container">
        
        {/* Header */}
        <header className="dashboard-header">
          <div className="header-title">
            <h1>Panel de ventas</h1>
            <p>Pedidos, verificación de pagos y comprobantes.</p>
          </div>
          <div className="header-actions">
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)} 
              className="date-picker"
            />
            <button onClick={() => fetchStats(password, selectedDate)} className="refresh-btn" disabled={loading}>
              {loading ? "⟳..." : "⟳"}
            </button>
            <button onClick={() => { setAuthenticated(false); setStats(null); }} className="logout-btn">
              → Salir
            </button>
          </div>
        </header>

        {/* Tabs */}
        <nav className="dashboard-tabs">
          <button className={`tab ${activeTab === 'pedidos' ? 'active' : ''}`} onClick={() => setActiveTab('pedidos')}>Pedidos</button>
          <button className={`tab ${activeTab === 'trafico' ? 'active' : ''}`} onClick={() => setActiveTab('trafico')}>Tráfico y embudo</button>
          <button className={`tab ${activeTab === 'ventas' ? 'active' : ''}`} onClick={() => setActiveTab('ventas')}>Ventas por día</button>
          <button className={`tab ${activeTab === 'emails' ? 'active' : ''}`} onClick={() => setActiveTab('emails')}>Emails</button>
        </nav>

        {/* Main Content Area */}
        <div className="dashboard-content">
          
          {/* Top Metrics Row */}
          <div className="metrics-row">
            <div className="metric-box">
              <span className="metric-label">INGRESOS APROBADOS</span>
              <strong className="metric-value">
                {(d.totalRevenueToday || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
              </strong>
            </div>
            <div className="metric-box">
              <span className="metric-label">PEDIDOS</span>
              <strong className="metric-value">{d.paymentsApproved + d.paymentsRejected}</strong>
            </div>
            <div className="metric-box">
              <span className="metric-label">APROBADOS / RECHAZADOS</span>
              <strong className="metric-value">{d.paymentsApproved} / {d.paymentsRejected}</strong>
            </div>
            <div className="metric-box">
              <span className="metric-label">TICKET PROMEDIO</span>
              <strong className="metric-value">
                {d.paymentsApproved > 0 
                  ? ((d.totalRevenueToday || 0) / d.paymentsApproved).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })
                  : "$0"}
              </strong>
            </div>
          </div>

          {/* Filters & Search Row */}
          <div className="filters-row">
            <div className="filter-pills">
              <button className={`pill ${filterType === 'all' ? 'active' : ''}`} onClick={() => setFilterType('all')}>Todos</button>
              <button className={`pill ${filterType === 'approved' ? 'active' : ''}`} onClick={() => setFilterType('approved')}>Aprobado</button>
              <button className={`pill ${filterType === 'pending' ? 'active' : ''}`} onClick={() => setFilterType('pending')}>Pendiente</button>
              <button className={`pill ${filterType === 'rejected' ? 'active' : ''}`} onClick={() => setFilterType('rejected')}>Rechazado</button>
            </div>
            <div className="search-bar">
              <input 
                type="text" 
                placeholder="Buscar por nombre, correo..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Orders List */}
          {activeTab === 'pedidos' && (
            <div className="orders-list">
              {filteredEvents.map((ev) => {
                const email = ev.metadata?.email || "Email no disponible";
                const name = generateNameFromEmail(email);
                const edition = ev.metadata?.edition || "esencial";
                const amount = edition === "esencial" ? "$20.000" : "$28.000";
                const status = getStatusInfo(ev.type);
                const hasReceipt = !!ev.metadata?.receiptUrl;

                return (
                  <article key={ev.id} className="order-card">
                    <div className="order-header">
                      <div className="customer-info">
                        <h3>{name}</h3>
                        <p>{email} · {ev.metadata?.source || "Web"}</p>
                        <time>{new Date(ev.timestamp).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}</time>
                      </div>
                      <div className="order-pricing">
                        <span className={status.className}>{status.label}</span>
                        <div className="price-info">
                          <strong>{amount}</strong> <del className="strike">$29.900</del>
                        </div>
                      </div>
                    </div>
                    
                    <div className="order-details">
                      <p>Producto: {edition === "esencial" ? "Guía Esencial de Conservas" : "Colección Completa de Conservas"}</p>
                    </div>

                    {/* Metadata / Trust box (simulated for realism based on mockup) */}
                    {hasReceipt && (
                      <div className="order-trust-box">
                        <p className="trust-main">Comprobante enviado manualmente por el usuario. Validar en Nequi/Bancolombia antes de aprobar.</p>
                      </div>
                    )}

                    <div className="order-actions">
                      {hasReceipt && (
                        <a href={ev.metadata?.receiptUrl} target="_blank" rel="noopener noreferrer" className="btn-receipt">
                          📄 Ver comprobante
                        </a>
                      )}
                      
                      {ev.type === "payment_manual_review" && (
                        <>
                          <button onClick={() => handleManualApprove(email, edition, ev.metadata?.receiptUrl || "")} className="btn-approve">
                            ✓ Aprobar
                          </button>
                          <button onClick={() => alert("Rechazo manual aún no implementado")} className="btn-reject">
                            ✕ Rechazar
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
              
              {filteredEvents.length === 0 && (
                <div className="empty-state">No se encontraron pedidos con estos filtros.</div>
              )}
            </div>
          )}

          {activeTab !== 'pedidos' && (
            <div className="empty-state">Esta pestaña estará disponible pronto. Utiliza "Pedidos" para gestionar las ventas.</div>
          )}

        </div>
      </div>
    </main>
  );
}
