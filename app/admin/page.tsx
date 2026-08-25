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
    paymentsManualReview?: number;
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
    paymentsManualReview?: number;
    totalRevenueToday: number;
    emailsSent?: number;
    emailsTimeout60s?: number;
    promo8k?: number;
    promo75?: number;
    promoCompletaRegular?: number;
    promoEsencialRegular?: number;
  };
  recentEvents: Array<{
    id: string;
    type: string;
    timestamp: string;
    metadata?: Record<string, string>;
  }>;
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [filterType, setFilterType] = useState<"all" | "approved_email" | "approved_no_email" | "pending" | "promo_8k" | "promo_75">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"pedidos" | "trafico" | "ventas" | "emails">("pedidos");

  // Modal para envio/reenvio manual de e-mail de acesso
  const [resendModal, setResendModal] = useState<{ open: boolean; email: string; edition: string; discount?: string } | null>(null);
  const [resendEmailInput, setResendEmailInput] = useState("");
  const [resendLoading, setResendLoading] = useState(false);

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
    const interval = setInterval(() => fetchStats(password, selectedDate), 20000);
    return () => clearInterval(interval);
  }, [authenticated, password, selectedDate, fetchStats]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthenticated(true);
    await fetchStats(password, selectedDate);
  }

  async function handleManualApprove(email: string, edition: string, receiptUrl: string, discount?: string) {
    if (!confirm(`¿Aprobar y enviar acceso a ${email}?`)) return;

    try {
      await fetch("/api/send-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, edition, discount, receiptUrl, moveReceipt: true })
      });

      alert("Pedido aprovado e acesso enviado com sucesso!");
      fetchStats(password, selectedDate);
    } catch {
      alert("Erro ao aprovar pedido");
    }
  }

  async function handleSendManualAccess(e: React.FormEvent) {
    e.preventDefault();
    if (!resendEmailInput) return;
    setResendLoading(true);
    try {
      const res = await fetch("/api/send-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: resendEmailInput,
          edition: resendModal?.edition || "completa",
          discount: resendModal?.discount
        })
      });
      if (res.ok) {
        alert(`Acesso enviado com sucesso para ${resendEmailInput}!`);
        setResendModal(null);
        setResendEmailInput("");
        fetchStats(password, selectedDate);
      } else {
        alert("Erro ao enviar e-mail");
      }
    } catch {
      alert("Falha na requisição");
    } finally {
      setResendLoading(false);
    }
  }

  if (!authenticated || !stats) {
    return (
      <main className="admin-page">
        <div className="admin-login">
          <h1>Painel de Administração</h1>
          <p>Digite sua senha para acessar o controle de vendas e pedidos</p>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha de administrador"
              autoFocus
            />
            <button type="submit" disabled={loading}>
              {loading ? "Entrando..." : "Acessar Painel →"}
            </button>
          </form>
          {error && <p className="admin-error">{error}</p>}
        </div>
      </main>
    );
  }

  const d = stats.today || {};
  const events = stats.recentEvents || [];

  // Filtrar apenas eventos relevantes para pedidos
  const orderEvents = events.filter((ev) =>
    ev.type === "payment_approved" ||
    ev.type === "payment_approved_email" ||
    ev.type === "payment_approved_no_email" ||
    ev.type === "payment_manual_review" ||
    ev.type === "payment_rejected"
  );

  const filteredOrders = orderEvents.filter((ev) => {
    const meta = ev.metadata || {};
    const email = meta.email?.toLowerCase() || "";
    const isApprovedEmail = ev.type === "payment_approved_email" || meta.emailStatus === "digitou_e_enviado" || (ev.type === "payment_approved" && !!meta.email);
    const isApprovedNoEmail = ev.type === "payment_approved_no_email" || meta.emailStatus === "nao_digitou_esperou_60s" || meta.emailStatus === "nao_digitou_clicou_direto";
    const isPending = ev.type === "payment_manual_review" || ev.type === "payment_rejected";
    const is8k = meta.discount === "8k" || meta.edition?.includes("8k") || meta.roleta?.includes("8 mil") || meta.monto === "8000";
    const is75 = meta.discount === "75" || meta.edition?.includes("75off") || meta.roleta?.includes("75%") || meta.monto === "14000";

    if (filterType === "approved_email" && !isApprovedEmail) return false;
    if (filterType === "approved_no_email" && !isApprovedNoEmail) return false;
    if (filterType === "pending" && !isPending) return false;
    if (filterType === "promo_8k" && !is8k) return false;
    if (filterType === "promo_75" && !is75) return false;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchEmail = email.includes(q);
      const matchMonto = meta.monto?.includes(q);
      const matchEdition = meta.edition?.toLowerCase().includes(q);
      const matchRoleta = meta.roleta?.toLowerCase().includes(q);
      if (!matchEmail && !matchMonto && !matchEdition && !matchRoleta) return false;
    }
    return true;
  });

  // Lista de todos os emails capturados
  const allCapturedEmails = Array.from(
    new Set(
      orderEvents
        .map((ev) => ev.metadata?.email?.trim())
        .filter((em): em is string => Boolean(em && em.includes("@")))
    )
  );

  const formatCOP = (val?: number | string) => {
    const num = typeof val === "string" ? parseInt(val, 10) : val;
    if (!num || isNaN(num)) return "$0 COP";
    return num.toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });
  };

  return (
    <main className="admin-dashboard">
      <div className="admin-container">
        
        {/* Header */}
        <header className="dashboard-header">
          <div className="header-title">
            <h1>Painel de Vendas & Pedidos</h1>
            <p>Gerenciamento em tempo real de transações, roleta, descontos e e-mails de acesso.</p>
          </div>
          <div className="header-actions">
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)} 
              className="date-picker"
            />
            <button onClick={() => fetchStats(password, selectedDate)} className="refresh-btn" disabled={loading}>
              {loading ? "Atualizando..." : "⟳ Atualizar"}
            </button>
            <button onClick={() => { setAuthenticated(false); setStats(null); }} className="logout-btn">
              → Sair
            </button>
          </div>
        </header>

        {/* Tabs */}
        <nav className="dashboard-tabs">
          <button className={`tab ${activeTab === 'pedidos' ? 'active' : ''}`} onClick={() => setActiveTab('pedidos')}>
            📦 Pedidos ({filteredOrders.length})
          </button>
          <button className={`tab ${activeTab === 'ventas' ? 'active' : ''}`} onClick={() => setActiveTab('ventas')}>
            💰 Vendas & Roleta
          </button>
          <button className={`tab ${activeTab === 'emails' ? 'active' : ''}`} onClick={() => setActiveTab('emails')}>
            ✉️ Lista de E-mails ({allCapturedEmails.length})
          </button>
          <button className={`tab ${activeTab === 'trafico' ? 'active' : ''}`} onClick={() => setActiveTab('trafico')}>
            📊 Tráfego & Funil
          </button>
        </nav>

        {/* Main Content Area */}
        <div className="dashboard-content">
          
          {/* Top Metrics Row */}
          <div className="metrics-row" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <div className="metric-box">
              <span className="metric-label">RECEITA APROVADA HOJE</span>
              <strong className="metric-value" style={{ color: "#145d3d" }}>
                {formatCOP(d.totalRevenueToday)}
              </strong>
            </div>
            <div className="metric-box">
              <span className="metric-label">TOTAL DE PEDIDOS HOJE</span>
              <strong className="metric-value">
                {orderEvents.length}
              </strong>
            </div>
            <div className="metric-box">
              <span className="metric-label">STATUS DE E-MAILS</span>
              <strong className="metric-value" style={{ fontSize: "1.4rem" }}>
                <span style={{ color: "#145d3d" }}>✓ {d.emailsSent || 0} Enviados</span>
                <span style={{ color: "#d97706", fontSize: "1.1rem", display: "block", marginTop: "4px" }}>⏱️ {d.emailsTimeout60s || 0} Aguardaram 60s</span>
              </strong>
            </div>
            <div className="metric-box">
              <span className="metric-label">VENDAS POR ROLETA</span>
              <strong className="metric-value" style={{ fontSize: "1.2rem", fontWeight: 600 }}>
                <span>🎡 8k: <strong>{d.promo8k || 0}</strong></span> · 
                <span> 75%: <strong>{d.promo75 || 0}</strong></span><br/>
                <span style={{ color: "#64748b", fontSize: "0.95rem" }}>🏷️ Normal: { (d.promoCompletaRegular || 0) + (d.promoEsencialRegular || 0) }</span>
              </strong>
            </div>
          </div>

          {/* ABA 1: PEDIDOS */}
          {activeTab === 'pedidos' && (
            <>
              {/* Filters & Search Row */}
              <div className="filters-row">
                <div className="filter-pills" style={{ flexWrap: "wrap" }}>
                  <button className={`pill ${filterType === 'all' ? 'active' : ''}`} onClick={() => setFilterType('all')}>
                    Todos ({orderEvents.length})
                  </button>
                  <button className={`pill ${filterType === 'approved_email' ? 'active' : ''}`} onClick={() => setFilterType('approved_email')} style={{ color: filterType === 'approved_email' ? '#fff' : '#145d3d' }}>
                    ✉️ Com E-mail ({d.emailsSent || 0})
                  </button>
                  <button className={`pill ${filterType === 'approved_no_email' ? 'active' : ''}`} onClick={() => setFilterType('approved_no_email')} style={{ color: filterType === 'approved_no_email' ? '#fff' : '#d97706' }}>
                    ⏱️ Sem E-mail / 60s ({d.emailsTimeout60s || 0})
                  </button>
                  <button className={`pill ${filterType === 'promo_8k' ? 'active' : ''}`} onClick={() => setFilterType('promo_8k')}>
                    🎡 Roleta $8k ({d.promo8k || 0})
                  </button>
                  <button className={`pill ${filterType === 'promo_75' ? 'active' : ''}`} onClick={() => setFilterType('promo_75')}>
                    🎡 Roleta 75% ({d.promo75 || 0})
                  </button>
                  <button className={`pill ${filterType === 'pending' ? 'active' : ''}`} onClick={() => setFilterType('pending')}>
                    ⏳ Revisão Manual ({d.paymentsManualReview || 0})
                  </button>
                </div>
                <div className="search-bar">
                  <input 
                    type="text" 
                    placeholder="Buscar e-mail, valor, roleta..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Orders List */}
              <div className="orders-list">
                {filteredOrders.map((ev) => {
                  const meta = ev.metadata || {};
                  const email = meta.email?.trim() || "";
                  const hasEmail = !!email && email.includes("@");
                  const emailStatus = meta.emailStatus || (ev.type === "payment_approved_email" ? "digitou_e_enviado" : (ev.type === "payment_approved_no_email" ? "nao_digitou_esperou_60s" : "aguardando_email"));

                  const edition = meta.edition || "completa";
                  const discount = meta.discount;
                  const is8k = discount === "8k" || edition.includes("8k") || meta.monto === "8000" || meta.roleta?.includes("8 mil");
                  const is75 = !is8k && (discount === "75" || edition.includes("75off") || meta.monto === "14000" || meta.roleta?.includes("75%"));
                  const isEsencial = edition === "esencial" || meta.monto === "20000";

                  const priceDisplay = meta.monto ? formatCOP(meta.monto) : (is8k ? "$8.000 COP" : (is75 ? "$14.000 COP" : (isEsencial ? "$20.000 COP" : "$28.000 COP")));
                  const hasReceipt = !!meta.receiptUrl;
                  const isManualReview = ev.type === "payment_manual_review";
                  const isRejected = ev.type === "payment_rejected";
                  const isApproved = !isManualReview && !isRejected;

                  return (
                    <article key={ev.id} className="order-card" style={{ borderLeft: is8k ? "5px solid #8b5cf6" : (is75 ? "5px solid #3b82f6" : (isApproved ? "5px solid #145d3d" : "5px solid #f59e0b")) }}>
                      <div className="order-header">
                        <div className="customer-info" style={{ flex: 1 }}>
                          
                          {/* Identificação do Cliente / E-mail */}
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "6px" }}>
                            {hasEmail ? (
                              <h3 style={{ margin: 0, fontSize: "17px", color: "#0f172a" }}>
                                ✉️ {email}
                              </h3>
                            ) : (
                              <h3 style={{ margin: 0, fontSize: "16px", color: "#d97706" }}>
                                ⚠️ Cliente não digitou e-mail
                              </h3>
                            )}

                            {/* Badge do Status do E-mail */}
                            {emailStatus === "digitou_e_enviado" && (
                              <span style={{ padding: "3px 8px", background: "#dcfce7", color: "#15803d", borderRadius: "6px", fontSize: "11px", fontWeight: 700 }}>
                                ✓ E-mail Enviado
                              </span>
                            )}
                            {emailStatus === "nao_digitou_esperou_60s" && (
                              <span style={{ padding: "3px 8px", background: "#fef3c7", color: "#b45309", borderRadius: "6px", fontSize: "11px", fontWeight: 700 }}>
                                ⏱️ Aguardou 60s (Acesso Liberado Direto)
                              </span>
                            )}
                            {emailStatus === "nao_digitou_clicou_direto" && (
                              <span style={{ padding: "3px 8px", background: "#fef3c7", color: "#b45309", borderRadius: "6px", fontSize: "11px", fontWeight: 700 }}>
                                ⏩ Acessou direto sem e-mail
                              </span>
                            )}
                            {emailStatus === "aguardando_email" && isApproved && (
                              <span style={{ padding: "3px 8px", background: "#e0f2fe", color: "#0369a1", borderRadius: "6px", fontSize: "11px", fontWeight: 700 }}>
                                ⏳ Aguardando entrada de e-mail
                              </span>
                            )}
                            {isManualReview && (
                              <span style={{ padding: "3px 8px", background: "#ffedd5", color: "#c2410c", borderRadius: "6px", fontSize: "11px", fontWeight: 700 }}>
                                ⏳ Comprovante em Análise Manual
                              </span>
                            )}
                          </div>

                          <p style={{ margin: "4px 0", color: "#64748b", fontSize: "13px" }}>
                            Origem: {meta.source || "Checkout Direto"} · {new Date(ev.timestamp).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium" })}
                          </p>
                        </div>

                        {/* Valor Pago e Status */}
                        <div className="order-pricing">
                          <span className={`status-pill ${isApproved ? "approved" : "pending"}`}>
                            {isApproved ? "Aprovado" : (isManualReview ? "Pendente Revisão" : "Recusado")}
                          </span>
                          <div className="price-info" style={{ marginTop: "4px" }}>
                            <strong style={{ fontSize: "20px", color: is8k ? "#8b5cf6" : "#0f172a" }}>
                              {priceDisplay}
                            </strong>
                            <del className="strike" style={{ fontSize: "12px", color: "#94a3b8" }}>
                              {is8k ? "$208.000" : (is75 ? "$167.000" : (isEsencial ? "$89.000" : "$167.000"))}
                            </del>
                          </div>
                        </div>
                      </div>
                      
                      {/* Roleta & Promoção aplicada */}
                      <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "8px", border: "1px solid #e2e8f0", margin: "14px 0" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          {is8k && (
                            <span style={{ background: "#8b5cf6", color: "#fff", padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 700 }}>
                              🎡 ROLETA 2º GIRO: Subsidio $8.000 COP (+ 7 Bonos VIP)
                            </span>
                          )}
                          {is75 && (
                            <span style={{ background: "#3b82f6", color: "#fff", padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 700 }}>
                              🎡 ROLETA 1º GIRO: 75% OFF ($14.000 COP + 4 Bonos)
                            </span>
                          )}
                          {!is8k && !is75 && isEsencial && (
                            <span style={{ background: "#64748b", color: "#fff", padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 700 }}>
                              🏷️ SEM ROLETA: Edição Essencial ($20.000 COP)
                            </span>
                          )}
                          {!is8k && !is75 && !isEsencial && (
                            <span style={{ background: "#145d3d", color: "#fff", padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 700 }}>
                              🏷️ SEM ROLETA: Coleção Completa Regular ($28.000 COP + 4 Bonos)
                            </span>
                          )}
                          <span style={{ fontSize: "13px", color: "#475569" }}>
                            Produto: <strong>{isEsencial ? "Guia Essencial de Conservas" : "Coleção Completa de Conservas Caseras"}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Ações do Pedido */}
                      <div className="order-actions" style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "12px" }}>
                        {/* Botão de Enviar/Reenviar Acesso por E-mail */}
                        <button
                          type="button"
                          onClick={() => {
                            setResendModal({
                              open: true,
                              email: email || "",
                              edition: is8k ? "completa_8k" : (is75 ? "completa_75off" : edition),
                              discount: is8k ? "8k" : (is75 ? "75" : undefined),
                            });
                            setResendEmailInput(email || "");
                          }}
                          style={{ background: "#145d3d", color: "#fff", border: "none" }}
                        >
                          ✉️ {hasEmail ? "Reenviar Acesso" : "Cadastrar E-mail & Enviar Acesso"}
                        </button>

                        {hasReceipt && (
                          <a href={meta.receiptUrl} target="_blank" rel="noopener noreferrer" className="btn-receipt">
                            📄 Ver comprovante
                          </a>
                        )}
                        
                        {isManualReview && (
                          <button
                            onClick={() => handleManualApprove(email, edition, meta.receiptUrl || "", discount)}
                            className="btn-approve"
                          >
                            ✓ Aprovar Manualmente
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
                
                {filteredOrders.length === 0 && (
                  <div className="empty-state">
                    Nenhum pedido encontrado com estes filtros na data selecionada.
                  </div>
                )}
              </div>
            </>
          )}

          {/* ABA 2: VENDAS & ROLETA */}
          {activeTab === 'ventas' && (
            <div className="sales-breakdown-tab" style={{ background: "#fff", padding: "28px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
              <h2 style={{ fontSize: "1.4rem", margin: "0 0 16px", color: "#0f172a" }}>Detalhamento de Vendas por Promoção e Roleta</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginTop: "20px" }}>
                
                <div style={{ padding: "20px", borderRadius: "10px", background: "#f5f3ff", border: "1px solid #ddd6fe" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#7c3aed", textTransform: "uppercase" }}>🎡 Roleta: 2º Giro (Subsidio $8.000)</span>
                  <p style={{ fontSize: "2rem", fontWeight: 700, margin: "10px 0 4px", color: "#5b21b6" }}>{d.promo8k || 0} vendas</p>
                  <small style={{ color: "#6d28d9" }}>Faturamento: {formatCOP((d.promo8k || 0) * 8000)}</small>
                </div>

                <div style={{ padding: "20px", borderRadius: "10px", background: "#eff6ff", border: "1px solid #bfdbfe" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#2563eb", textTransform: "uppercase" }}>🎡 Roleta: 1º Giro (75% OFF - $14.000)</span>
                  <p style={{ fontSize: "2rem", fontWeight: 700, margin: "10px 0 4px", color: "#1e40af" }}>{d.promo75 || 0} vendas</p>
                  <small style={{ color: "#1d4ed8" }}>Faturamento: {formatCOP((d.promo75 || 0) * 14000)}</small>
                </div>

                <div style={{ padding: "20px", borderRadius: "10px", background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#16a34a", textTransform: "uppercase" }}>🏷️ Coleção Completa Regular ($28.000)</span>
                  <p style={{ fontSize: "2rem", fontWeight: 700, margin: "10px 0 4px", color: "#14532d" }}>{d.promoCompletaRegular || 0} vendas</p>
                  <small style={{ color: "#15803d" }}>Faturamento: {formatCOP((d.promoCompletaRegular || 0) * 28000)}</small>
                </div>

                <div style={{ padding: "20px", borderRadius: "10px", background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>🏷️ Guia Essencial ($20.000)</span>
                  <p style={{ fontSize: "2rem", fontWeight: 700, margin: "10px 0 4px", color: "#1e293b" }}>{d.promoEsencialRegular || 0} vendas</p>
                  <small style={{ color: "#475569" }}>Faturamento: {formatCOP((d.promoEsencialRegular || 0) * 20000)}</small>
                </div>

              </div>
            </div>
          )}

          {/* ABA 3: LISTA DE EMAILS */}
          {activeTab === 'emails' && (
            <div className="emails-tab" style={{ background: "#fff", padding: "28px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <h2 style={{ fontSize: "1.4rem", margin: "0 0 6px", color: "#0f172a" }}>E-mails Capturados dos Clientes</h2>
                  <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>Lista de e-mails de compradores para exportação e atendimento.</p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(allCapturedEmails.join("\n"));
                    alert(`${allCapturedEmails.length} e-mails copiados para a área de transferência!`);
                  }}
                  style={{ padding: "10px 18px", background: "#145d3d", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}
                >
                  📋 Copiar todos os e-mails
                </button>
              </div>

              {allCapturedEmails.length > 0 ? (
                <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0", maxHeight: "400px", overflowY: "auto", fontFamily: "monospace", fontSize: "14px", lineHeight: "1.8" }}>
                  {allCapturedEmails.map((em, i) => (
                    <div key={em} style={{ borderBottom: "1px solid #e2e8f0", padding: "6px 0", display: "flex", justifyContent: "space-between" }}>
                      <span><strong>{i + 1}.</strong> {em}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">Nenhum e-mail registrado ainda nesta data.</div>
              )}
            </div>
          )}

          {/* ABA 4: TRÁFEGO & FUNIL */}
          {activeTab === 'trafico' && (
            <div className="traffic-tab" style={{ background: "#fff", padding: "28px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
              <h2 style={{ fontSize: "1.4rem", margin: "0 0 20px", color: "#0f172a" }}>Funil de Conversão (Hoje)</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
                <div style={{ padding: "18px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>1. VISITAS (PAGEVIEWS)</span>
                  <p style={{ fontSize: "1.8rem", fontWeight: 700, margin: "8px 0 0", color: "#0f172a" }}>{d.pageViews || 0}</p>
                </div>
                <div style={{ padding: "18px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>2. CLIQUES DE OFERTA</span>
                  <p style={{ fontSize: "1.8rem", fontWeight: 700, margin: "8px 0 0", color: "#0f172a" }}>{(d.clicksEsencial || 0) + (d.clicksCompleta || 0)}</p>
                </div>
                <div style={{ padding: "18px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>3. VISTAS DE CHECKOUT</span>
                  <p style={{ fontSize: "1.8rem", fontWeight: 700, margin: "8px 0 0", color: "#0f172a" }}>{(d.checkoutViewsEsencial || 0) + (d.checkoutViewsCompleta || 0)}</p>
                </div>
                <div style={{ padding: "18px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>4. COMPROVANTES ENVIADOS</span>
                  <p style={{ fontSize: "1.8rem", fontWeight: 700, margin: "8px 0 0", color: "#0f172a" }}>{d.receiptsUploaded || 0}</p>
                </div>
                <div style={{ padding: "18px", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                  <span style={{ fontSize: "12px", color: "#16a34a", fontWeight: 600 }}>5. VENDAS APROVADAS</span>
                  <p style={{ fontSize: "1.8rem", fontWeight: 700, margin: "8px 0 0", color: "#14532d" }}>{d.paymentsApproved || 0}</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Modal de Reenvio / Cadastro de E-mail de Acesso */}
      {resendModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: "20px" }}>
          <div style={{ background: "#fff", borderRadius: "14px", padding: "28px", maxWidth: "480px", width: "100%", boxShadow: "0 20px 40px rgba(0,0,0,0.25)" }}>
            <h3 style={{ margin: "0 0 10px", fontSize: "1.3rem", color: "#0f172a" }}>✉️ Enviar Acesso ao Cliente</h3>
            <p style={{ margin: "0 0 20px", fontSize: "14px", color: "#64748b" }}>
              Digite ou confirme o e-mail do cliente para disparar o acesso vitalício ao material de Conservas Caseras.
            </p>
            <form onSubmit={handleSendManualAccess}>
              <input
                type="email"
                required
                placeholder="cliente@email.com"
                value={resendEmailInput}
                onChange={(e) => setResendEmailInput(e.target.value)}
                style={{ width: "100%", padding: "12px 16px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "15px", marginBottom: "16px", outline: "none" }}
                autoFocus
              />
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setResendModal(null)}
                  style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#f8fafc", color: "#475569", cursor: "pointer", fontWeight: 600 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={resendLoading}
                  style={{ padding: "10px 20px", borderRadius: "8px", border: "none", background: "#145d3d", color: "#fff", cursor: "pointer", fontWeight: 700 }}
                >
                  {resendLoading ? "Enviando..." : "Disparar Acesso →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  );
}
