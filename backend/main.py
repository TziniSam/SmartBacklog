from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Allow frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # later restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dummy database
tickets = [
    {"id": 1, "title": "Login Page", "status": "todo"},
    {"id": 2, "title": "Dashboard UI", "status": "in-progress"},
]

# Routes
@app.get("/")
def root():
    return {"message": "API is running"}

@app.get("/tickets")
def get_tickets():
    return tickets

@app.post("/tickets")
def add_ticket(ticket: dict):
    ticket["id"] = len(tickets) + 1
    tickets.append(ticket)
    return ticket

@app.delete("/tickets/{ticket_id}")
def delete_ticket(ticket_id: int):
    global tickets
    tickets = [t for t in tickets if t["id"] != ticket_id]
    return {"message": "Deleted"}