import { useEffect, useState } from "react";

function App() {
  const [tickets, setTickets] = useState([]);
  const [title, setTitle] = useState("");

  // Fetch tickets
  const fetchTickets = () => {
    fetch("http://localhost:8000/tickets")
      .then(res => res.json())
      .then(data => setTickets(data));
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  // Add ticket
  const addTicket = () => {
    fetch("http://localhost:8000/tickets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, status: "todo" }),
    }).then(() => {
      setTitle("");
      fetchTickets();
    });
  };

  // Delete ticket
  const deleteTicket = (id) => {
    fetch(`http://localhost:8000/tickets/${id}`, {
      method: "DELETE",
    }).then(fetchTickets);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Kanban Board</h1>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="New ticket"
      />
      <button onClick={addTicket}>Add</button>

      <div style={{ display: "flex", gap: "20px", marginTop: "20px" }}>
        {["todo", "in-progress", "done"].map((status) => (
          <div key={status}>
            <h2>{status}</h2>

            {tickets
              .filter((t) => t.status === status)
              .map((t) => (
                <div key={t.id} style={{ border: "1px solid black", margin: "5px", padding: "5px" }}>
                  {t.title}
                  <button onClick={() => deleteTicket(t.id)}>X</button>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;