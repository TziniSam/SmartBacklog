import React, { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  Wand2,
  Sparkles,
  Layout,
  MoreVertical,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Clock,
  CheckCircle2,
  BrainCircuit,
  X,
  Wifi,
  WifiOff,
} from "lucide-react";

const API_BASE = "http://localhost:8000";

const App = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [newTicket, setNewTicket] = useState({
    title: "",
    description: "",
    priority: "medium",
  });

  const columns = [
    {
      id: "todo",
      title: "me",
      icon: <AlertCircle className="w-4 h-4 text-slate-400" />,
      color: "bg-slate-100",
    },
    {
      id: "in-progress",
      title: "In Progress",
      icon: <Clock className="w-4 h-4 text-purple-400" />,
      color: "bg-purple-50",
    },
    {
      id: "done",
      title: "Done",
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
      color: "bg-emerald-50",
    },
  ];

  const saveToLocal = (data) => {
    localStorage.setItem("smartbacklog_fallback", JSON.stringify(data));
  };

  const getFromLocal = () => {
    const saved = localStorage.getItem("smartbacklog_fallback");
    return saved ? JSON.parse(saved) : [];
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/tickets`);
      if (!response.ok) throw new Error("Server error");
      const data = await response.json();
      setTickets(data);
      saveToLocal(data);
      setIsConnected(true);
    } catch (err) {
      console.warn("Backend unreachable, falling back to local storage:", err?.message);
      setTickets(getFromLocal());
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleAddTicket = async (e) => {
    e.preventDefault();
    if (!newTicket.title.trim()) return;

    const tempId = Date.now().toString();
    const ticketToAdd = { ...newTicket, id: tempId, status: "todo" };

    try {
      setTickets((prev) => [...prev, ticketToAdd]);

      const response = await fetch(`${API_BASE}/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ticketToAdd),
      });

      if (!response.ok) throw new Error("Failed to persist");

      setIsModalOpen(false);
      setNewTicket({ title: "", description: "", priority: "medium" });
      fetchTickets();
    } catch (err) {
      console.error("Error adding ticket:", err);
      saveToLocal([...tickets, ticketToAdd]);
      setIsModalOpen(false);
      setNewTicket({ title: "", description: "", priority: "medium" });
    }
  };

  const handleDelete = async (id) => {
    try {
      setTickets((prev) => prev.filter((t) => t.id !== id));
      await fetch(`${API_BASE}/tickets/${id}`, { method: "DELETE" });
    } catch (err) {
      console.error("Error deleting ticket:", err);
      saveToLocal(tickets.filter((t) => t.id !== id));
    }
  };

  const moveTicket = async (id, currentStatus, direction) => {
    const statusOrder = ["todo", "in-progress", "done"];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const newIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;

    if (newIndex >= 0 && newIndex < statusOrder.length) {
      const newStatus = statusOrder[newIndex];
      const updatedTickets = tickets.map((t) => (t.id === id ? { ...t, status: newStatus } : t));
      setTickets(updatedTickets);
      saveToLocal(updatedTickets);
    }
  };

  const handleAIGenerate = (id) => {
    alert(`Sprint 2 Feature: AI is analyzing Task #${id} to generate Acceptance Criteria...`);
  };

  return (
    <div className="min-h-screen bg-[#fcfcfd] text-slate-900 font-sans selection:bg-purple-100">
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-10 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-purple-600 p-1.5 rounded-lg shadow-sm shadow-purple-200">
              <BrainCircuit className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-800 leading-none">
                Smart<span className="text-purple-600">Backlog</span>
              </h1>
              <div className="flex items-center gap-1.5 mt-1">
                {isConnected ? (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded">
                    <Wifi className="w-2.5 h-2.5" /> Live API
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] text-amber-600 font-medium bg-amber-50 px-1.5 py-0.5 rounded">
                    <WifiOff className="w-2.5 h-2.5" /> Local Mode
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-full text-sm font-semibold transition-all shadow-md shadow-purple-100 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              New Ticket
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6">
        {!isConnected && (
          <div className="mb-6 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-3 text-amber-800 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p className="text-xs font-medium">
              Backend server at{" "}
              <code className="bg-white/50 px-1 rounded">localhost:8000</code> not detected. Running in browser-only
              mode.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {columns.map((column) => (
            <div key={column.id} className="flex flex-col min-h-[75vh]">
              <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-md ${column.color}`}>{column.icon}</div>
                  <h2 className="font-bold text-slate-700 tracking-tight">{column.title}</h2>
                  <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
                    {tickets.filter((t) => t.status === column.id).length}
                  </span>
                </div>
                <button className="text-slate-400 hover:text-slate-600 transition-colors" type="button">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 rounded-2xl bg-slate-100/40 border border-dashed border-slate-200 p-3 space-y-3">
                {tickets
                  .filter((t) => t.status === column.id)
                  .map((ticket) => (
                    <div
                      key={ticket.id}
                      className="group bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-purple-200 transition-all"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span
                          className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                            ticket.priority === "high"
                              ? "bg-red-50 text-red-600 border border-red-100"
                              : ticket.priority === "medium"
                                ? "bg-amber-50 text-amber-600 border border-amber-100"
                                : "bg-blue-50 text-blue-600 border border-blue-100"
                          }`}
                        >
                          {ticket.priority || "Medium"}
                        </span>
                        <button
                          onClick={() => handleDelete(ticket.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 text-slate-300 transition-all"
                          type="button"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <h3 className="font-bold text-slate-800 leading-tight mb-1 text-sm">{ticket.title}</h3>

                      <p className="text-[11px] text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                        {ticket.description || "Describe the requirements for this user story..."}
                      </p>

                      <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                        <button
                          onClick={() => handleAIGenerate(ticket.id)}
                          className="flex items-center gap-1.5 text-[10px] font-bold text-purple-600 hover:bg-purple-50 px-2 py-1 rounded-lg transition-colors border border-transparent hover:border-purple-100"
                          type="button"
                        >
                          <Sparkles className="w-3 h-3" />
                          AI ASSIST
                        </button>

                        <div className="flex gap-1">
                          {column.id !== "todo" && (
                            <button
                              onClick={() => moveTicket(ticket.id, ticket.status, "prev")}
                              className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                              title="Move back"
                              type="button"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                          )}
                          {column.id !== "done" && (
                            <button
                              onClick={() => moveTicket(ticket.id, ticket.status, "next")}
                              className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                              title="Move forward"
                              type="button"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                {tickets.filter((t) => t.status === column.id).length === 0 && !loading && (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-300 border-2 border-dashed border-slate-200/50 rounded-xl bg-white/30">
                    <Layout className="w-6 h-6 mb-2 opacity-10" />
                    <p className="text-[10px] font-medium tracking-wide uppercase">Empty Stack</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between p-6 border-b border-slate-50 bg-slate-50/50">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Add Story</h2>
                <p className="text-xs text-slate-500 mt-0.5">Define a new task for the backlog</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full hover:bg-slate-200 text-slate-400 transition-colors"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTicket} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Title</label>
                <input
                  autoFocus
                  required
                  type="text"
                  placeholder="e.g. Implement User Authentication"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-sm font-medium"
                  value={newTicket.title}
                  onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Context</label>
                <textarea
                  rows="3"
                  placeholder="What is the objective and technical scope?"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-sm resize-none leading-relaxed"
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Priority</label>
                  <select
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none transition-all text-sm font-bold bg-white cursor-pointer appearance-none"
                    value={newTicket.priority}
                    onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority 🔥</option>
                  </select>
                </div>
                <div className="flex flex-col justify-end">
                  <button
                    type="button"
                    onClick={() => alert("Sprint 2: AI will generate content based on your title.")}
                    className="flex items-center justify-center gap-2 h-[48px] border-2 border-purple-100 text-purple-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-purple-50 transition-colors group"
                  >
                    <Wand2 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                    AI Smart Draft
                  </button>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3.5 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-colors text-sm"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold shadow-lg shadow-purple-200 transition-all active:scale-[0.98] text-sm"
                >
                  Save Story
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;