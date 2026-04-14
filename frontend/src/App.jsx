// SmartBacklog Frontend
// A React-based Kanban board for managing Agile tickets with AI-powered features

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

// Backend API endpoint configuration
const API_BASE = "http://localhost:8000";

const App = () => {
  // State management for tickets and UI
  const [tickets, setTickets] = useState([]); // All tickets from backend
  const [loading, setLoading] = useState(true); // Loading state for initial fetch
  const [isModalOpen, setIsModalOpen] = useState(false); // Add ticket modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); // Edit ticket modal
  const [isConnected, setIsConnected] = useState(false); // Backend connection status
  const [selectedTicket, setSelectedTicket] = useState(null); // Currently selected ticket for details
  const [editingTicket, setEditingTicket] = useState(null); // Ticket being edited
  const [newTicket, setNewTicket] = useState({
    title: "",
    description: "",
    priority: "medium",
  });

  // Kanban board column definitions
  const columns = [
    {
      id: "todo",
      title: "To Do",
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

  // Local storage fallback functions (used when backend is unreachable)
  const saveToLocal = (data) => {
    localStorage.setItem("smartbacklog_fallback", JSON.stringify(data));
  };

  const getFromLocal = () => {
    const saved = localStorage.getItem("smartbacklog_fallback");
    return saved ? JSON.parse(saved) : [];
  };

  // Fetch all tickets from backend API
  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/tickets`);
      if (!response.ok) throw new Error("Server error");
      const data = await response.json();
      setTickets(data);
      saveToLocal(data); // Save to local storage as backup
      setIsConnected(true);
    } catch (err) {
      console.warn("Backend unreachable, falling back to local storage:", err?.message);
      setTickets(getFromLocal()); // Use local storage if backend is down
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch on component mount
  useEffect(() => {
    fetchTickets();
  }, []);

  // Handle adding a new ticket
  const handleAddTicket = async (e) => {
    e.preventDefault();
    if (!newTicket.title.trim()) return;

    const tempId = Date.now().toString();
    const ticketToAdd = { ...newTicket, id: tempId, status: "todo" };

    try {
      // Optimistically update UI first
      setTickets((prev) => [...prev, ticketToAdd]);

      // Persist to backend
      const response = await fetch(`${API_BASE}/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ticketToAdd),
      });

      if (!response.ok) throw new Error("Failed to persist");

      setIsModalOpen(false);
      setNewTicket({ title: "", description: "", priority: "medium" });
      fetchTickets(); // Refresh to get AI-generated fields
    } catch (err) {
      console.error("Error adding ticket:", err);
      saveToLocal([...tickets, ticketToAdd]); // Save to local storage if backend fails
      setIsModalOpen(false);
      setNewTicket({ title: "", description: "", priority: "medium" });
    }
  };

  // Handle deleting a ticket
  const handleDelete = async (id) => {
    try {
      // Optimistically update UI
      setTickets((prev) => prev.filter((t) => t.id !== id));
      await fetch(`${API_BASE}/tickets/${id}`, { method: "DELETE" });
    } catch (err) {
      console.error("Error deleting ticket:", err);
      saveToLocal(tickets.filter((t) => t.id !== id)); // Save to local storage if backend fails
    }
  };

  // Handle moving a ticket between columns (left/right)
  const moveTicket = async (id, currentStatus, direction) => {
    const statusOrder = ["todo", "in-progress", "done"];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const newIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;

    if (newIndex >= 0 && newIndex < statusOrder.length) {
      const newStatus = statusOrder[newIndex];
      const updatedTickets = tickets.map((t) => (t.id === id ? { ...t, status: newStatus } : t));
      setTickets(updatedTickets);
      saveToLocal(updatedTickets);
      try {
        await fetch(`${API_BASE}/tickets/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
      } catch {
        // Stay on local update if backend unreachable
      }
    }
  };

  // Fetch and display AI-generated ticket details
  const handleAIGenerate = async (id) => {
    try {
      const response = await fetch(`${API_BASE}/tickets/${id}`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      setSelectedTicket(data); // Show ticket with AI-generated fields
    } catch {
      // Fallback to local ticket if backend is down
      const local = tickets.find((t) => t.id === id);
      setSelectedTicket(local || null);
    }
  };

  // Open edit modal with ticket data
  const openEditModal = (ticket) => {
    setEditingTicket({ ...ticket });
    setIsEditModalOpen(true);
  };

  // Handle editing a ticket
  const handleEditTicket = async (e) => {
    e.preventDefault();
    if (!editingTicket.title.trim()) return;

    const updatedTickets = tickets.map((t) => (t.id === editingTicket.id ? editingTicket : t));
    setTickets(updatedTickets);
    saveToLocal(updatedTickets);

    try {
      await fetch(`${API_BASE}/tickets/${editingTicket.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editingTicket.title,
          description: editingTicket.description,
          status: editingTicket.status,
        }),
      });
      setIsEditModalOpen(false);
      setEditingTicket(null);
      setSelectedTicket(null);
      fetchTickets(); // Refresh to get updated AI fields
    } catch (err) {
      console.error("Error editing ticket:", err);
      setIsEditModalOpen(false);
      setEditingTicket(null);
    }
  };

  // Render main application
  return (
    <div className="min-h-screen bg-[#fcfcfd] text-slate-900 font-sans selection:bg-purple-100">
      {/* Navigation bar with logo and connection status */}
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

      {/* Main content area */}
      <main className="max-w-7xl mx-auto p-6">
        {/* Warning banner when backend is unreachable */}
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

        {/* Kanban board columns */}
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
                      onClick={() => handleAIGenerate(ticket.id)}
                      className="group bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-purple-200 transition-all cursor-pointer"
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
                          onClick={(e) => { e.stopPropagation(); handleDelete(ticket.id); }}
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
                          onClick={(e) => { e.stopPropagation(); handleAIGenerate(ticket.id); }}
                          className="flex items-center gap-1.5 text-[10px] font-bold text-purple-600 hover:bg-purple-50 px-2 py-1 rounded-lg transition-colors border border-transparent hover:border-purple-100"
                          type="button"
                        >
                          <Sparkles className="w-3 h-3" />
                          AI ASSIST
                        </button>

                        <div className="flex gap-1">
                          {column.id !== "todo" && (
                            <button
                              onClick={(e) => { e.stopPropagation(); moveTicket(ticket.id, ticket.status, "prev"); }}
                              className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                              title="Move back"
                              type="button"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                          )}
                          {column.id !== "done" && (
                            <button
                              onClick={(e) => { e.stopPropagation(); moveTicket(ticket.id, ticket.status, "next"); }}
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

      {/* Ticket details modal (shows AI-generated fields) */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="flex items-start justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex-1 pr-4">
                <h2 className="text-lg font-bold text-slate-800">{selectedTicket.title}</h2>
                <p className="text-xs text-slate-500 mt-1">{selectedTicket.description || "No description provided."}</p>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="p-2 rounded-full hover:bg-slate-200 text-slate-400 transition-colors" type="button">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-purple-50 border border-purple-100 rounded-2xl p-3 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-1">Story Points</p>
                  <p className="text-2xl font-black text-purple-700">{selectedTicket.story_points ?? "—"}</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-1">Priority</p>
                  <p className="text-sm font-black text-amber-700 capitalize">{selectedTicket.priority ?? "—"}</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">Source</p>
                  <p className="text-sm font-black text-emerald-700 capitalize">{selectedTicket.ai_source ?? "—"}</p>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Acceptance Criteria</h3>
                </div>
                {selectedTicket.acceptance_criteria && selectedTicket.acceptance_criteria.length > 0 ? (
                  <ul className="space-y-2">
                    {selectedTicket.acceptance_criteria.map((criterion, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-slate-700 bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{criterion}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-400 italic">No acceptance criteria generated yet.</p>
                )}
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setSelectedTicket(null)} className="flex-1 py-3 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-sm transition-all active:scale-[0.98]">
                Close
              </button>
              <button onClick={() => openEditModal(selectedTicket)} className="flex-1 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm transition-all shadow-lg shadow-purple-200 active:scale-[0.98]">
                Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit ticket modal */}
      {isEditModalOpen && editingTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between p-6 border-b border-slate-50 bg-slate-50/50">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Edit Story</h2>
                <p className="text-xs text-slate-500 mt-0.5">Update task details</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 rounded-full hover:bg-slate-200 text-slate-400 transition-colors"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditTicket} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Title</label>
                <input
                  autoFocus
                  required
                  type="text"
                  placeholder="e.g. Implement User Authentication"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-sm font-medium"
                  value={editingTicket.title}
                  onChange={(e) => setEditingTicket({ ...editingTicket, title: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Context</label>
                <textarea
                  rows="3"
                  placeholder="What is the objective and technical scope?"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-sm resize-none leading-relaxed"
                  value={editingTicket.description}
                  onChange={(e) => setEditingTicket({ ...editingTicket, description: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Status</label>
                <select
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none transition-all text-sm font-bold bg-white cursor-pointer appearance-none"
                  value={editingTicket.status}
                  onChange={(e) => setEditingTicket({ ...editingTicket, status: e.target.value })}
                >
                  <option value="todo">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-3.5 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold shadow-lg shadow-purple-200 transition-all active:scale-[0.98] text-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add new ticket modal */}
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
                    <option value="high">High Priority</option>
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