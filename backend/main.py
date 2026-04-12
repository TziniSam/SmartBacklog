import json
import os
import sqlite3
from pathlib import Path
from typing import Any, Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = Path(__file__).resolve().parent / "smartbacklog.db"
VALID_STATUSES = {"todo", "in-progress", "done"}
VALID_POINTS = {1, 2, 3, 5, 8, 13}


class TicketCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=5000)
    status: Literal["todo", "in-progress", "done"] = "todo"
    auto_ai: bool = True


class TicketUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=5000)
    status: Literal["todo", "in-progress", "done"] | None = None


def db_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with db_conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS tickets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                status TEXT NOT NULL,
                acceptance_criteria TEXT,
                story_points INTEGER,
                priority TEXT,
                ai_source TEXT
            )
            """
        )
        count = conn.execute("SELECT COUNT(*) FROM tickets").fetchone()[0]
        if count == 0:
            seeds = [
                ("Login Page", "Build login page with email and password.", "todo"),
                ("Dashboard UI", "Create dashboard widgets and navigation.", "in-progress"),
                ("Stripe Payment Integration", "Integrate Stripe checkout with webhook confirmation and error handling.", "todo"),
            ]
            for title, description, status in seeds:
                ai = generate_ai_fields(title, description)
                conn.execute(
                    """
                    INSERT INTO tickets(title, description, status, acceptance_criteria, story_points, priority, ai_source)
                    VALUES(?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        title,
                        description,
                        status,
                        json.dumps(ai["acceptance_criteria"]),
                        ai["story_points"],
                        ai["priority"],
                        ai["ai_source"],
                    ),
                )


@app.on_event("startup")
def startup() -> None:
    init_db()


def row_to_ticket(row: sqlite3.Row) -> dict:
    criteria = json.loads(row["acceptance_criteria"]) if row["acceptance_criteria"] else []
    return {
        "id": row["id"],
        "title": row["title"],
        "description": row["description"],
        "status": row["status"],
        "acceptance_criteria": criteria,
        "story_points": row["story_points"],
        "priority": row["priority"],
        "ai_source": row["ai_source"],
    }


def _openai_client() -> Any | None:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or OpenAI is None:
        return None
    return OpenAI(api_key=api_key)


def fallback_ai(title: str, description: str) -> dict:
    text = f"{title} {description}".lower()
    criteria = [
        f"Given a user accesses {title}, when input is valid, then the action succeeds.",
        f"Given invalid input in {title}, when submitted, then clear validation errors are shown.",
        f"Given the operation for {title}, when backend fails, then the user sees a safe error message.",
    ]
    points = 3
    if len(text.split()) > 30:
        points = 5
    if any(word in text for word in ["security", "payment", "oauth", "integration"]):
        points = 8
    if points not in VALID_POINTS:
        points = 5

    priority = "normal"
    if any(word in text for word in ["urgent", "critical", "asap", "today"]):
        priority = "urgent"
    if any(word in text for word in ["blocker", "blocking", "production down", "outage"]):
        priority = "blocking"

    return {
        "acceptance_criteria": criteria,
        "story_points": points,
        "priority": priority,
        "ai_source": "fallback",
    }


def generate_ai_fields(title: str, description: str) -> dict:
    client = _openai_client()
    if client is None:
        return fallback_ai(title, description)

    prompt = (
        "You are an Agile coach. Return valid JSON only with keys: "
        "acceptance_criteria (array of 3 strings), story_points (one of 1,2,3,5,8,13), "
        "priority (normal|urgent|blocking). "
        f"Title: {title}. Description: {description}"
    )

    try:
        model = os.getenv("OPENAI_MODEL", "gpt-4o")
        response = client.chat.completions.create(
            model=model,
            temperature=0.2,
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert Scrum Agile coach. Return concise JSON only.",
                },
                {"role": "user", "content": prompt},
            ],
        )
        content = response.choices[0].message.content
        parsed = json.loads(content) if content else {}
        criteria = parsed.get("acceptance_criteria", [])
        points = int(parsed.get("story_points", 5))
        priority = str(parsed.get("priority", "normal")).lower().strip()

        if not isinstance(criteria, list) or not criteria:
            raise ValueError("invalid acceptance criteria")
        if points not in VALID_POINTS:
            raise ValueError("invalid story points")
        if priority not in {"normal", "urgent", "blocking"}:
            raise ValueError("invalid priority")

        return {
            "acceptance_criteria": [str(item).strip() for item in criteria[:3] if str(item).strip()],
            "story_points": points,
            "priority": priority,
            "ai_source": "ai",
        }
    except Exception:
        return fallback_ai(title, description)


@app.get("/")
def root() -> dict:
    return {"message": "API is running"}


@app.get("/tickets")
def get_tickets() -> list[dict]:
    with db_conn() as conn:
        rows = conn.execute("SELECT * FROM tickets ORDER BY id").fetchall()
    return [row_to_ticket(row) for row in rows]


@app.get("/tickets/{ticket_id}")
def get_ticket(ticket_id: int) -> dict:
    with db_conn() as conn:
        row = conn.execute("SELECT * FROM tickets WHERE id = ?", (ticket_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return row_to_ticket(row)


@app.post("/tickets")
def add_ticket(ticket: TicketCreate) -> dict:
    if ticket.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid ticket status")

    ai_fields = {
        "acceptance_criteria": [],
        "story_points": None,
        "priority": None,
        "ai_source": None,
    }
    if ticket.auto_ai:
        ai_fields = generate_ai_fields(ticket.title, ticket.description)

    with db_conn() as conn:
        cursor = conn.execute(
            """
            INSERT INTO tickets(title, description, status, acceptance_criteria, story_points, priority, ai_source)
            VALUES(?, ?, ?, ?, ?, ?, ?)
            """,
            (
                ticket.title,
                ticket.description,
                ticket.status,
                json.dumps(ai_fields["acceptance_criteria"]),
                ai_fields["story_points"],
                ai_fields["priority"],
                ai_fields["ai_source"],
            ),
        )
        ticket_id = cursor.lastrowid
        row = conn.execute("SELECT * FROM tickets WHERE id = ?", (ticket_id,)).fetchone()

    return row_to_ticket(row)


@app.put("/tickets/{ticket_id}")
def update_ticket(ticket_id: int, ticket: TicketUpdate) -> dict:
    with db_conn() as conn:
        existing = conn.execute("SELECT * FROM tickets WHERE id = ?", (ticket_id,)).fetchone()
        if existing is None:
            raise HTTPException(status_code=404, detail="Ticket not found")

        title = ticket.title if ticket.title is not None else existing["title"]
        description = ticket.description if ticket.description is not None else existing["description"]
        status = ticket.status if ticket.status is not None else existing["status"]

        if status not in VALID_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid ticket status")

        conn.execute(
            "UPDATE tickets SET title = ?, description = ?, status = ? WHERE id = ?",
            (title, description, status, ticket_id),
        )
        row = conn.execute("SELECT * FROM tickets WHERE id = ?", (ticket_id,)).fetchone()

    return row_to_ticket(row)


@app.delete("/tickets/{ticket_id}")
def delete_ticket(ticket_id: int) -> dict:
    with db_conn() as conn:
        deleted = conn.execute("DELETE FROM tickets WHERE id = ?", (ticket_id,))
        if deleted.rowcount == 0:
            raise HTTPException(status_code=404, detail="Ticket not found")
    return {"message": "Deleted"}