import "../styles/admin-base.css";
import { useEffect, useState } from "react";
import api from "../api/admin";

export default function TicketDetail() {
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  // read ticket id from ?id= query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    let mounted = true;
    const load = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await api.getTicket(id);
        if (!mounted) return;
        setTicket(res.data.ticket || res.data || null);
        // fetch messages are returned from same endpoint
        setMessages(res.data.messages || []);
      } catch (err) {
        console.error('Unable to load ticket', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return <div className="admin-page"><div className="admin-empty-state"><p>Loading…</p></div></div>;
  }

  if (!ticket) {
    return (
      <div className="admin-page">
        <div className="admin-empty-state">
          <p>No ticket selected. Open a ticket from the Tickets list or add ?id=&lt;ticketId&gt; to the URL.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page admin-stack-lg">
      <header className="admin-row">
        <div>
          <h1>Ticket Detail</h1>
          <p className="admin-muted">Review the ticket and conversation history.</p>
        </div>
        <span className="admin-pill is-blue">{ticket.ticketNo ?? ticket.ticket_no ?? `#${ticket.id}`}</span>
      </header>

      <section className="admin-surface admin-stack-md">
        <div className="admin-detail-grid">
          <div className="admin-card">
            <div className="admin-card__label">Category</div>
            <div className="admin-card__value" style={{ fontSize: "20px" }}>
              {ticket.category}
            </div>
            <div className="admin-card__meta">Priority: {ticket.priority}</div>
          </div>
          <div className="admin-card">
            <div className="admin-card__label">Assigned to</div>
            <div className="admin-card__value">{ticket.assignedTo ?? ticket.assigned_to}</div>
            <div className="admin-card__meta">Status: {ticket.status}</div>
          </div>
          <div className="admin-card">
            <div className="admin-card__label">Member</div>
              <div className="admin-card__value">{ticket.user?.name || ticket.userName || ticket.userEmail || 'Member'}</div>
            <div className="admin-card__meta">Member ID: {ticket.user?.id ?? ticket.userId ?? '—'}</div>
          </div>
        </div>
      </section>

      <section className="admin-surface admin-stack-md">
        <h2>Conversation</h2>
        <div className="admin-stack-sm">
          {messages.length ? messages.map((m) => (
            <div key={m.id} className="admin-card">
              <div className="admin-card__meta">{m.createdAt}</div>
              <div><strong>{m.authorAdminId ? (m.authorAdminName || `Admin ${m.authorAdminId}`) : (m.authorUserName || m.authorUserId)}</strong></div>
              <div>{m.message}</div>
            </div>
          )) : <div className="admin-empty-state"><p>No messages yet.</p></div>}
        </div>
      </section>
    </div>
  );
}
