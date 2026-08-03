import React, { useState, useEffect, useCallback } from "react";
import { Pencil, Trash2, Wifi, WifiOff, X } from "lucide-react";

const COLORS = {
  ink: "#0F1B2D",
  ink2: "#152238",
  ink3: "#1B2B45",
  parchment: "#E8E6DE",
  parchmentDim: "#B9BAB4",
  brass: "#C9A227",
  brassBright: "#DDB53A",
  teal: "#4C9490",
  rust: "#C15B4A",
  line: "rgba(232,230,222,0.14)",
  lineStrong: "rgba(232,230,222,0.28)",
};

function useGoogleFonts() {
  useEffect(() => {
    const id = "broker-ledger-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap";
    document.head.appendChild(link);
  }, []);
}

function fmtMoney(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function Toast({ toasts, remove }) {
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, display: "flex", flexDirection: "column", gap: 10, zIndex: 50 }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => remove(t.id)}
          style={{
            background: COLORS.ink3,
            border: `1px solid ${COLORS.lineStrong}`,
            borderLeft: `3px solid ${t.error ? COLORS.rust : COLORS.brass}`,
            padding: "12px 16px",
            borderRadius: 6,
            fontSize: 13.5,
            maxWidth: 320,
            boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
            color: COLORS.parchment,
            fontFamily: "'IBM Plex Sans', sans-serif",
            cursor: "pointer",
          }}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
}

function StampBadge({ top }) {
  if (!top) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 6 }}>
      <svg width="140" height="140" viewBox="0 0 140 140">
        <defs>
          <path id="stampCircle" d="M 70,70 m -52,0 a 52,52 0 1,1 104,0 a 52,52 0 1,1 -104,0" />
        </defs>
        <circle cx="70" cy="70" r="63" fill="none" stroke={COLORS.brass} strokeWidth="1" opacity="0.35" />
        <circle cx="70" cy="70" r="52" fill="none" stroke={COLORS.brass} strokeWidth="1.4" strokeDasharray="2 3" />
        <text fontFamily="IBM Plex Mono, monospace" fontSize="10.5" letterSpacing="3" fill={COLORS.brass}>
          <textPath href="#stampCircle" startOffset="2%">
            TOP PERFORMER · TOP PERFORMER ·
          </textPath>
        </text>
        <text x="70" y="64" textAnchor="middle" fontFamily="Fraunces, serif" fontSize="26" fontWeight="600" fill={COLORS.parchment}>
          #1
        </text>
        <text x="70" y="84" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="10" fill={COLORS.parchmentDim}>
          {top.totalsale} units
        </text>
      </svg>
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 15, marginTop: 10, color: COLORS.parchment }}>{top.name}</div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: COLORS.parchmentDim }}>{fmtMoney(top.totalcost)}</div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  background: COLORS.ink,
  border: `1px solid ${COLORS.lineStrong}`,
  color: COLORS.parchment,
  padding: "10px 12px",
  borderRadius: 6,
  fontFamily: "'IBM Plex Sans', sans-serif",
  fontSize: 14,
  outline: "none",
};

const labelStyle = {
  display: "block",
  fontSize: 12,
  color: COLORS.parchmentDim,
  margin: "14px 0 6px",
  letterSpacing: 0.3,
};

const panelStyle = {
  background: COLORS.ink2,
  border: `1px solid ${COLORS.line}`,
  borderRadius: 10,
  padding: 26,
};

const submitBtn = (disabled) => ({
  marginTop: 20,
  width: "100%",
  background: disabled ? COLORS.lineStrong : COLORS.brass,
  color: disabled ? COLORS.parchmentDim : COLORS.ink,
  border: "none",
  padding: "11px 14px",
  borderRadius: 6,
  fontWeight: 600,
  fontSize: 14,
  cursor: disabled ? "not-allowed" : "pointer",
});

export default function BrokerLedger() {
  useGoogleFonts();

  const [apiBase, setApiBase] = useState("http://localhost:3000");
  const [apiBaseInput, setApiBaseInput] = useState("http://localhost:3000");
  const [connected, setConnected] = useState(false);
  const [connPanelOpen, setConnPanelOpen] = useState(false);

  const [brokers, setBrokers] = useState([]);
  const [sales, setSales] = useState([]);
  const [leaderboard, setLeaderboard] = useState(null);

  const [toasts, setToasts] = useState([]);

  const [brokerForm, setBrokerForm] = useState({ name: "", phone: "", email: "" });
  const [brokerError, setBrokerError] = useState("");
  const [brokerSubmitting, setBrokerSubmitting] = useState(false);
  const [editingBrokerId, setEditingBrokerId] = useState(null);

  const [saleForm, setSaleForm] = useState({ broker: "", Product_name: "", Product_quantity: "", Product_cost_per: "" });
  const [saleError, setSaleError] = useState("");
  const [saleSubmitting, setSaleSubmitting] = useState(false);

  const pushToast = (msg, error = false) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, error }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  };
  const removeToast = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  const apiCall = useCallback(
    async (path, options = {}) => {
      const res = await fetch(apiBase + path, {
        headers: { "Content-Type": "application/json" },
        ...options,
      });
      let data = null;
      try {
        data = await res.json();
      } catch (e) {}
      if (!res.ok) {
        const msg = (data && (data.error || data.msg)) || `Request failed (${res.status})`;
        throw new Error(msg);
      }
      return data;
    },
    [apiBase]
  );

  const refreshAll = useCallback(async () => {
    try {
      const [brokerList, sold, board] = await Promise.all([
        apiCall("/fetchbroker"),
        apiCall("/fetchsales").catch(() => []), // older backends may not have this route yet
        apiCall("/decode"),
      ]);
      setBrokers(brokerList || []);
      setSales(sold || []);
      setLeaderboard(board);
      setConnected(true);
    } catch (err) {
      setConnected(false);
      pushToast("Could not reach the backend: " + err.message + ". If this is a CORS error, add app.use(cors()) on the server.", true);
    }
  }, [apiCall]);

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase]);

  const handleConnSave = () => {
    const val = apiBaseInput.trim().replace(/\/$/, "");
    if (val) {
      setApiBase(val);
      setConnPanelOpen(false);
    }
  };

  const resetBrokerForm = () => {
    setBrokerForm({ name: "", phone: "", email: "" });
    setEditingBrokerId(null);
    setBrokerError("");
  };

  const submitBroker = async (e) => {
    e.preventDefault();
    setBrokerError("");
    const { name, phone, email } = brokerForm;
    if (!name.trim() || !phone.trim() || !email.trim()) {
      setBrokerError("All fields are required.");
      return;
    }
    setBrokerSubmitting(true);
    try {
      if (editingBrokerId) {
        await apiCall(`/broker/${editingBrokerId}`, {
          method: "PUT",
          body: JSON.stringify({ name: name.trim(), phone: phone.trim(), email: email.trim() }),
        });
        pushToast(`Broker "${name}" updated.`);
      } else {
        await apiCall("/add", {
          method: "POST",
          body: JSON.stringify({ name: name.trim(), phone: phone.trim(), email: email.trim() }),
        });
        pushToast(`Broker "${name}" added.`);
      }
      resetBrokerForm();
      await refreshAll();
    } catch (err) {
      setBrokerError(err.message);
    } finally {
      setBrokerSubmitting(false);
    }
  };

  const startEditBroker = (b) => {
    setEditingBrokerId(b._id);
    setBrokerForm({ name: b.name || "", phone: String(b.phone ?? b.Phone ?? ""), email: b.email || "" });
    setBrokerError("");
  };

  const deleteBroker = async (b) => {
    if (!window.confirm(`Delete broker "${b.name}"? Their sales records will be removed too.`)) return;
    try {
      await apiCall(`/broker/${b._id}`, { method: "DELETE" });
      pushToast(`Broker "${b.name}" deleted.`);
      if (editingBrokerId === b._id) resetBrokerForm();
      await refreshAll();
    } catch (err) {
      pushToast(err.message, true);
    }
  };

  const saleTotal =
    (parseFloat(saleForm.Product_quantity) || 0) * (parseFloat(saleForm.Product_cost_per) || 0);

  const submitSale = async (e) => {
    e.preventDefault();
    setSaleError("");
    const { broker, Product_name, Product_quantity, Product_cost_per } = saleForm;
    const qty = parseFloat(Product_quantity);
    const cost = parseFloat(Product_cost_per);
    if (!broker) return setSaleError("Select a broker first.");
    if (!Product_name.trim()) return setSaleError("Enter a product name.");
    if (!qty || qty <= 0) return setSaleError("Quantity must be greater than 0.");
    if (isNaN(cost) || cost < 0) return setSaleError("Cost per unit cannot be negative.");

    setSaleSubmitting(true);
    try {
      await apiCall("/sale", {
        method: "POST",
        body: JSON.stringify({ broker, Product_name: Product_name.trim(), Product_quantity: qty, Product_cost_per: cost }),
      });
      pushToast(`Sale recorded for ${Product_name}.`);
      setSaleForm({ broker: "", Product_name: "", Product_quantity: "", Product_cost_per: "" });
      await refreshAll();
    } catch (err) {
      setSaleError(err.message);
    } finally {
      setSaleSubmitting(false);
    }
  };

  const deleteSale = async (s) => {
    if (!window.confirm(`Delete this sale of "${s.Product_name}"?`)) return;
    try {
      await apiCall(`/sale/${s._id}`, { method: "DELETE" });
      pushToast("Sale deleted.");
      await refreshAll();
    } catch (err) {
      pushToast(err.message, true);
    }
  };

  const allRanked = leaderboard && leaderboard.allBrokers ? leaderboard.allBrokers : [];
  const topBroker = leaderboard && leaderboard.topBroker ? leaderboard.topBroker : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `radial-gradient(1200px 600px at 15% -10%, rgba(201,162,39,0.08), transparent 60%), ${COLORS.ink}`,
        color: COLORS.parchment,
        fontFamily: "'IBM Plex Sans', sans-serif",
      }}
    >
      {/* Header */}
      <header style={{ padding: "40px 24px 28px", borderBottom: `1px solid ${COLORS.line}` }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                border: `1.5px solid ${COLORS.brass}`,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "'Fraunces', serif",
                fontSize: 19,
                color: COLORS.brass,
                flexShrink: 0,
              }}
            >
              B
            </div>
            <div>
              <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 30, margin: 0 }}>Broker Ledger</h1>
              <p style={{ margin: "4px 0 0", color: COLORS.parchmentDim, fontSize: 14 }}>Brokers, sales &amp; standings — kept in one book</p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5, color: COLORS.parchmentDim }}>
              {connected ? <Wifi size={14} color="#7BC67E" /> : <WifiOff size={14} color={COLORS.rust} />}
              <span>{connected ? apiBase.replace(/^https?:\/\//, "") : "not connected"}</span>
              <button
                onClick={() => setConnPanelOpen((v) => !v)}
                style={{
                  background: "none",
                  border: `1px solid ${COLORS.lineStrong}`,
                  color: COLORS.parchmentDim,
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11.5,
                  padding: "5px 10px",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                edit
              </button>
            </div>
            {connPanelOpen && (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  value={apiBaseInput}
                  onChange={(e) => setApiBaseInput(e.target.value)}
                  style={{ ...inputStyle, width: 220, padding: "6px 8px", fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}
                  spellCheck={false}
                />
                <button onClick={handleConnSave} style={{ ...submitBtn(false), margin: 0, padding: "6px 12px", width: "auto" }}>
                  connect
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 80px" }}>
        {/* Leaderboard */}
        <section style={{ paddingTop: 56 }}>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: 2, fontSize: 11, color: COLORS.brass, margin: "0 0 8px" }}>
            Standings
          </p>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 26, margin: "0 0 28px" }}>Performance ledger</h2>

          <div style={{ display: "grid", gridTemplateColumns: allRanked.length ? "260px 1fr" : "1fr", gap: 32, alignItems: "start" }}>
            {allRanked.length > 0 && (
              <div style={{ display: "flex", justifyContent: "center" }}>
                <StampBadge top={topBroker} />
              </div>
            )}

            <div>
              {allRanked.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "40px 1fr auto auto", gap: 16, padding: "0 4px 10px" }}>
                  <span />
                  <span style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: 1, color: COLORS.parchmentDim }}>Broker</span>
                  <span style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: 1, color: COLORS.parchmentDim, textAlign: "right" }}>Units sold</span>
                  <span style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: 1, color: COLORS.parchmentDim, textAlign: "right" }}>Total value</span>
                </div>
              )}
              <div style={{ borderTop: allRanked.length ? `1px solid ${COLORS.lineStrong}` : "none" }}>
                {allRanked.length === 0 ? (
                  <div style={{ padding: "28px 4px", color: COLORS.parchmentDim, fontSize: 14, borderTop: `1px solid ${COLORS.line}` }}>
                    <strong style={{ color: COLORS.parchment }}>The ledger is empty.</strong>
                    <br />
                    Add a broker and record a sale below to open the standings.
                  </div>
                ) : (
                  allRanked.map((b, i) => (
                    <div
                      key={b.brokerId}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "40px 1fr auto auto",
                        gap: 16,
                        alignItems: "center",
                        padding: "16px 4px",
                        borderBottom: `1px solid ${COLORS.line}`,
                      }}
                    >
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: i === 0 ? COLORS.brass : COLORS.parchmentDim, fontWeight: i === 0 ? 600 : 400, fontSize: 14 }}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span style={{ fontWeight: 500 }}>{b.name}</span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", textAlign: "right", minWidth: 64 }}>{b.totalsale}</span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", textAlign: "right", color: COLORS.teal, minWidth: 100 }}>{fmtMoney(b.totalcost)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Forms */}
        <section style={{ paddingTop: 56 }}>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: 2, fontSize: 11, color: COLORS.brass, margin: "0 0 8px" }}>
            Entries
          </p>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 26, margin: "0 0 28px" }}>Add to the book</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
            {/* Broker form */}
            <div style={panelStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 19, margin: "0 0 4px" }}>
                  {editingBrokerId ? "Edit broker" : "New broker"}
                </h3>
                {editingBrokerId && (
                  <button onClick={resetBrokerForm} style={{ background: "none", border: "none", color: COLORS.parchmentDim, cursor: "pointer" }}>
                    <X size={16} />
                  </button>
                )}
              </div>
              <p style={{ color: COLORS.parchmentDim, fontSize: 12.5, margin: "0 0 20px" }}>
                {editingBrokerId ? "Update this broker's details." : "Register a broker before recording their sales."}
              </p>
              <form onSubmit={submitBroker}>
                <label style={labelStyle}>Name</label>
                <input
                  style={inputStyle}
                  type="text"
                  value={brokerForm.name}
                  onChange={(e) => setBrokerForm({ ...brokerForm, name: e.target.value })}
                  placeholder="e.g. Rohan Mehta"
                />
                <label style={labelStyle}>Phone</label>
                <input
                  style={inputStyle}
                  type="tel"
                  value={brokerForm.phone}
                  onChange={(e) => setBrokerForm({ ...brokerForm, phone: e.target.value })}
                  placeholder="e.g. 9876543210"
                />
                <label style={labelStyle}>Email</label>
                <input
                  style={inputStyle}
                  type="email"
                  value={brokerForm.email}
                  onChange={(e) => setBrokerForm({ ...brokerForm, email: e.target.value })}
                  placeholder="e.g. rohan@brokerage.in"
                />
                <div style={{ color: COLORS.rust, fontSize: 12, marginTop: 6, minHeight: 14 }}>{brokerError}</div>
                <button type="submit" disabled={brokerSubmitting} style={submitBtn(brokerSubmitting)}>
                  {brokerSubmitting ? "Saving…" : editingBrokerId ? "Update broker" : "Add broker"}
                </button>
              </form>
            </div>

            {/* Sale form */}
            <div style={panelStyle}>
              <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 19, margin: "0 0 4px" }}>Record a sale</h3>
              <p style={{ color: COLORS.parchmentDim, fontSize: 12.5, margin: "0 0 20px" }}>Log a product sale against a registered broker.</p>
              <form onSubmit={submitSale}>
                <label style={labelStyle}>Broker</label>
                <select
                  style={inputStyle}
                  value={saleForm.broker}
                  onChange={(e) => setSaleForm({ ...saleForm, broker: e.target.value })}
                >
                  <option value="" disabled>
                    Select a broker
                  </option>
                  {brokers.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                    </option>
                  ))}
                </select>

                <label style={labelStyle}>Product name</label>
                <input
                  style={inputStyle}
                  type="text"
                  value={saleForm.Product_name}
                  onChange={(e) => setSaleForm({ ...saleForm, Product_name: e.target.value })}
                  placeholder="e.g. Solar Panel Kit"
                />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Quantity</label>
                    <input
                      style={inputStyle}
                      type="number"
                      min="1"
                      step="1"
                      value={saleForm.Product_quantity}
                      onChange={(e) => setSaleForm({ ...saleForm, Product_quantity: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Cost per unit (₹)</label>
                    <input
                      style={inputStyle}
                      type="number"
                      min="0"
                      step="0.01"
                      value={saleForm.Product_cost_per}
                      onChange={(e) => setSaleForm({ ...saleForm, Product_cost_per: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 16,
                    padding: "12px 14px",
                    background: COLORS.ink,
                    border: `1px dashed ${COLORS.lineStrong}`,
                    borderRadius: 6,
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 13,
                    color: COLORS.parchmentDim,
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>Total value</span>
                  <strong style={{ color: COLORS.brass, fontWeight: 600 }}>{fmtMoney(saleTotal)}</strong>
                </div>

                <div style={{ color: COLORS.rust, fontSize: 12, marginTop: 6, minHeight: 14 }}>{saleError}</div>
                <button type="submit" disabled={saleSubmitting} style={submitBtn(saleSubmitting)}>
                  {saleSubmitting ? "Recording…" : "Record sale"}
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* Broker directory */}
        <section style={{ paddingTop: 56 }}>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: 2, fontSize: 11, color: COLORS.brass, margin: "0 0 8px" }}>
            Registry
          </p>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 26, margin: "0 0 28px" }}>Broker directory</h2>

          {brokers.length === 0 ? (
            <div style={{ padding: "28px 4px", color: COLORS.parchmentDim, fontSize: 14, borderTop: `1px solid ${COLORS.line}` }}>
              <strong style={{ color: COLORS.parchment }}>No brokers registered yet.</strong>
              <br />
              Use the form above to add your first broker.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Name", "Phone", "Email", ""].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        fontSize: 10.5,
                        textTransform: "uppercase",
                        letterSpacing: 1,
                        color: COLORS.parchmentDim,
                        fontWeight: 500,
                        padding: "0 10px 10px",
                        borderBottom: `1px solid ${COLORS.lineStrong}`,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {brokers.map((b) => (
                  <tr key={b._id}>
                    <td style={{ padding: "13px 10px", borderBottom: `1px solid ${COLORS.line}`, fontSize: 14 }}>{b.name}</td>
                    <td style={{ padding: "13px 10px", borderBottom: `1px solid ${COLORS.line}`, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5, color: COLORS.parchmentDim }}>
                      {b.phone ?? b.Phone ?? "—"}
                    </td>
                    <td style={{ padding: "13px 10px", borderBottom: `1px solid ${COLORS.line}`, fontSize: 14 }}>{b.email}</td>
                    <td style={{ padding: "13px 10px", borderBottom: `1px solid ${COLORS.line}`, textAlign: "right" }}>
                      <button onClick={() => startEditBroker(b)} style={{ background: "none", border: "none", color: COLORS.parchmentDim, cursor: "pointer", marginRight: 10 }} title="Edit">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => deleteBroker(b)} style={{ background: "none", border: "none", color: COLORS.rust, cursor: "pointer" }} title="Delete">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Sales history */}
        <section style={{ paddingTop: 56 }}>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: 2, fontSize: 11, color: COLORS.brass, margin: "0 0 8px" }}>
            History
          </p>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 26, margin: "0 0 28px" }}>Sales recorded</h2>

          {sales.length === 0 ? (
            <div style={{ padding: "28px 4px", color: COLORS.parchmentDim, fontSize: 14, borderTop: `1px solid ${COLORS.line}` }}>
              <strong style={{ color: COLORS.parchment }}>No sales recorded yet.</strong>
              <br />
              Once you record a sale above, it'll show up here.
              <br />
              <span style={{ fontSize: 12 }}>(Needs the new <code>/fetchsales</code> route — see the backend fix notes.)</span>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Broker", "Product", "Qty", "Cost/unit", "Total", ""].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: h === "Qty" || h === "Cost/unit" || h === "Total" ? "right" : "left",
                        fontSize: 10.5,
                        textTransform: "uppercase",
                        letterSpacing: 1,
                        color: COLORS.parchmentDim,
                        fontWeight: 500,
                        padding: "0 10px 10px",
                        borderBottom: `1px solid ${COLORS.lineStrong}`,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s._id}>
                    <td style={{ padding: "13px 10px", borderBottom: `1px solid ${COLORS.line}`, fontSize: 14 }}>{s.broker?.name || "—"}</td>
                    <td style={{ padding: "13px 10px", borderBottom: `1px solid ${COLORS.line}`, fontSize: 14 }}>{s.Product_name}</td>
                    <td style={{ padding: "13px 10px", borderBottom: `1px solid ${COLORS.line}`, textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}>
                      {s.Product_quantity}
                    </td>
                    <td style={{ padding: "13px 10px", borderBottom: `1px solid ${COLORS.line}`, textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}>
                      {fmtMoney(s.Product_cost_per)}
                    </td>
                    <td style={{ padding: "13px 10px", borderBottom: `1px solid ${COLORS.line}`, textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: COLORS.teal }}>
                      {fmtMoney(s.Product_quantity * s.Product_cost_per)}
                    </td>
                    <td style={{ padding: "13px 10px", borderBottom: `1px solid ${COLORS.line}`, textAlign: "right" }}>
                      <button onClick={() => deleteSale(s)} style={{ background: "none", border: "none", color: COLORS.rust, cursor: "pointer" }} title="Delete">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <p style={{ textAlign: "center", color: COLORS.parchmentDim, fontSize: 12, marginTop: 60, fontFamily: "'IBM Plex Mono', monospace" }}>— end of book —</p>
      </div>

      <Toast toasts={toasts} remove={removeToast} />
    </div>
  );
}
