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
  const [filterType, setFilterType] = useState<"all" | "approved" | "pending" | "rejected">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"pedidos"|"trafico"|"ventas"|"emails">("pedidos");
  const fetchStats = useCallback(async (pwd: string, dateStr: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/track/stats?date=${dateStr}&t=${Date.now()}`, {
        headers: { "x-admin-password": pwd },
        cache: "no-store"
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

  const generateNameFromEmail = (email: string) => {
    if (!email) return "Cliente Anônimo";
    const namePart = email.split('@')[0];
    return namePart.replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getStatusInfo = (type: string) => {
    if (type.includes("approved")) return { label: "Aprovado", className: "status-pill approved" };
    if (type === "payment_rejected" || type === "payment_manual_review") return { label: "Pendente", className: "status-pill pending" };
    return { label: "Outro", className: "status-pill default" };
  };

  // If stats doesn't have the expected shape, show a debug view
  if (!stats.today || !stats.total || !stats.recentEvents) {
    return (
      <main className="admin-dashboard" style={{ padding: 40 }}>
        <h2>Erro de Formato de Dados</h2>
        <p>A API não retornou os dados no formato esperado. Talvez o cache esteja desatualizado.</p>
        <pre style={{ background: '#f1f5f9', padding: 20, borderRadius: 8, overflow: 'auto' }}>
          {JSON.stringify(stats, null, 2)}
        </pre>
        <button onClick={() => fetchStats(password, selectedDate)} className="refresh-btn">Tentar Novamente</button>
      </main>
    );
  }

  const d = stats.today;

  const filteredEvents = (stats.recentEvents || []).filter((ev) => {
    if (filterType === "approved" && !ev.type.includes("approved")) return false;
    if (filterType === "pending" && ev.type !== "payment_rejected" && ev.type !== "payment_manual_review") return false;
    if (filterType === "rejected" && ev.type !== "payment_rejected") return false;
    
    if (searchTerm) {
      const email = ev.metadata?.email?.toLowerCase() || "";
      if (!email.includes(searchTerm.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <main className="admin-dashboard">
      <div className="admin-container">
        
        {/* Header */}
        <header className="dashboard-header">
          <div className="header-title">
            <h1>Painel de Vendas</h1>
            <p>Pedidos, verificação de pagamentos e comprovantes.</p>
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
              → Sair
            </button>
          </div>
        </header>

        {/* Tabs */}
        <nav className="dashboard-tabs">
          <button className={`tab ${activeTab === 'pedidos' ? 'active' : ''}`} onClick={() => setActiveTab('pedidos')}>Pedidos</button>
          <button className={`tab ${activeTab === 'trafico' ? 'active' : ''}`} onClick={() => setActiveTab('trafico')}>Tráfego e funil</button>
          <button className={`tab ${activeTab === 'ventas' ? 'active' : ''}`} onClick={() => setActiveTab('ventas')}>Vendas por dia</button>
          <button className={`tab ${activeTab === 'emails' ? 'active' : ''}`} onClick={() => setActiveTab('emails')}>Emails</button>
        </nav>

        {/* Main Content Area */}
        <div className="dashboard-content">
          
          {/* Top Metrics Row */}
          <div className="metrics-row">
            <div className="metric-box">
              <span className="metric-label">RECEITA APROVADA</span>
              <strong className="metric-value">
                {(d.totalRevenueToday || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
              </strong>
            </div>
            <div className="metric-box">
              <span className="metric-label">PEDIDOS</span>
              <strong className="metric-value">{d.paymentsApproved + d.paymentsRejected}</strong>
            </div>
            <div className="metric-box">
              <span className="metric-label">APROVADOS / RECUSADOS</span>
              <strong className="metric-value">{d.paymentsApproved} / {d.paymentsRejected}</strong>
            </div>
            <div className="metric-box">
              <span className="metric-label">TICKET MÉDIO</span>
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
              <button className={`pill ${filterType === 'approved' ? 'active' : ''}`} onClick={() => setFilterType('approved')}>Aprovado</button>
              <button className={`pill ${filterType === 'pending' ? 'active' : ''}`} onClick={() => setFilterType('pending')}>Pendente</button>
              <button className={`pill ${filterType === 'rejected' ? 'active' : ''}`} onClick={() => setFilterType('rejected')}>Recusado</button>
            </div>
            <div className="search-bar">
              <input 
                type="text" 
                placeholder="Buscar por nome, e-mail..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Orders List */}
          {activeTab === 'pedidos' && (
            <div className="orders-list">
              {filteredEvents.map((ev) => {
                const email = ev.metadata?.email || "E-mail indisponível";
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
                        <time>{new Date(ev.timestamp).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</time>
                      </div>
                      <div className="order-pricing">
                        <span className={status.className}>{status.label}</span>
                        <div className="price-info">
                          <strong>{amount}</strong> <del className="strike">$29.900</del>
                        </div>
                      </div>
                    </div>
                    
                    <div className="order-details">
                      <p>Produto: {edition === "esencial" ? "Guia Essencial de Conservas" : "Coleção Completa de Conservas"}</p>
                    </div>

                    {/* Metadata / Trust box (simulated for realism based on mockup) */}
                    {hasReceipt && (
                      <div className="order-trust-box">
                        <p className="trust-main">Comprovante enviado manualmente pelo usuário. Valide o recebimento na sua conta antes de aprovar.</p>
                      </div>
                    )}

                    <div className="order-actions">
                      {hasReceipt && (
                        <a href={ev.metadata?.receiptUrl} target="_blank" rel="noopener noreferrer" className="btn-receipt">
                          📄 Ver comprovante
                        </a>
                      )}
                      
                      {ev.type === "payment_manual_review" && (
                        <>
                          <button onClick={() => handleManualApprove(email, edition, ev.metadata?.receiptUrl || "")} className="btn-approve">
                            ✓ Aprovar
                          </button>
                          <button onClick={() => alert("Recusa manual ainda não implementada")} className="btn-reject">
                            ✕ Recusar
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
              
              {filteredEvents.length === 0 && (
                <div className="empty-state">Nenhum pedido encontrado com estes filtros.</div>
              )}
            </div>
          )}

          {activeTab !== 'pedidos' && (
            <div className="empty-state">Esta aba estará disponível em breve. Use "Pedidos" para gerenciar as vendas.</div>
          )}

        </div>
      </div>
    </main>
  );
}
