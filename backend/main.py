# SmartBacklog Backend API
# A FastAPI-based REST API for managing Kanban tickets with AI-powered features

import json
import os
import sqlite3
from pathlib import Path
from typing import Any, Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# OpenAI integration for AI features (optional dependency)
try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

# Initialize FastAPI application
app = FastAPI()

# Configure CORS middleware to allow frontend requests
# NOTE: In production, restrict allow_origins to your frontend domain only
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Restrict to specific domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database configuration
DB_PATH = Path(__file__).resolve().parent / "smartbacklog.db"

# Valid ticket statuses for Kanban board columns
VALID_STATUSES = {"todo", "in-progress", "done"}

# Valid story points following Fibonacci sequence for agile estimation
VALID_POINTS = {1, 2, 3, 5, 8, 13}

# Pydantic models for request/response validation

class TicketCreate(BaseModel):
    """Schema for creating a new ticket."""
    title: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=5000)
    status: Literal["todo", "in-progress", "done"] = "todo"
    auto_ai: bool = True  # Whether to auto-generate AI fields (acceptance criteria, story points, priority)

class TicketUpdate(BaseModel):
    """Schema for updating an existing ticket. All fields are optional."""
    title: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=5000)
    status: Literal["todo", "in-progress", "done"] | None = None

# Database connection functions

def db_conn() -> sqlite3.Connection:
    """Create a new SQLite database connection with Row factory for dict-like access."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db() -> None:
    """Initialize the database schema and seed with sample data if empty."""
    with db_conn() as conn:
        # Create tickets table if it doesn't exist
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
        
        # Seed initial data only if table is empty
        count = conn.execute("SELECT COUNT(*) FROM tickets").fetchone()[0]
        if count == 0:
            seeds = [
                ("Login Page", "Build login page with email and password.", "todo"),
                ("Dashboard UI", "Create dashboard widgets and navigation.", "in-progress"),
                ("Stripe Payment Integration", "Integrate Stripe checkout with webhook confirmation and error handling.", "todo"),
            ]
            for title, description, status in seeds:
                # Generate AI fields for each seed ticket
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

# Application lifecycle events

@app.on_event("startup")
def startup() -> None:
    """Initialize database when the application starts."""
    init_db()

# Data transformation helpers

def row_to_ticket(row: sqlite3.Row) -> dict:
    """Convert a database row to a ticket dictionary with parsed JSON fields."""
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

# AI integration functions

def _openai_client() -> Any | None:
    """Create and return an OpenAI client if API key is configured."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or OpenAI is None:
        return None
    return OpenAI(api_key=api_key)

def fallback_ai(title: str, description: str) -> dict:
    """Generate AI fields using rule-based logic when OpenAI API is unavailable.
    
    This provides a fallback mechanism so the app works even without AI.
    """
    text = f"{title} {description}".lower()
    
    # Generate generic acceptance criteria
    criteria = [
        f"Given a user accesses {title}, when input is valid, then the action succeeds.",
        f"Given invalid input in {title}, when submitted, then clear validation errors are shown.",
        f"Given the operation for {title}, when backend fails, then the user sees a safe error message.",
    ]
    
    # Estimate story points based on description length and keywords
    points = 3
    if len(text.split()) > 30:
        points = 5
    if any(word in text for word in ["security", "payment", "oauth", "integration"]):
        points = 8
    if points not in VALID_POINTS:
        points = 5

    # Determine priority based on keywords
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
    """Generate AI-powered fields for a ticket using OpenAI API.
    
    Returns acceptance criteria, story points, and priority.
    Falls back to rule-based logic if AI API fails.
    """
    client = _openai_client()
    if client is None:
        return fallback_ai(title, description)

    # Construct prompt for AI
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
            temperature=0.2,  # Low temperature for consistent outputs
            response_format={"type": "json_object"},  # Force JSON response
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

        # Validate AI response
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
        # Fallback to rule-based logic if AI fails
        return fallback_ai(title, description)

# API Routes

@app.get("/")
def root() -> dict:
    """Health check endpoint to verify API is running."""
    return {"message": "API is running"}

@app.get("/tickets")
def get_tickets() -> list[dict]:
    """Get all tickets ordered by ID."""
    with db_conn() as conn:
        rows = conn.execute("SELECT * FROM tickets ORDER BY id").fetchall()
    return [row_to_ticket(row) for row in rows]

@app.get("/tickets/{ticket_id}")
def get_ticket(ticket_id: int) -> dict:
    """Get a specific ticket by ID. Returns 404 if not found."""
    with db_conn() as conn:
        row = conn.execute("SELECT * FROM tickets WHERE id = ?", (ticket_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return row_to_ticket(row)

@app.post("/tickets")
def add_ticket(ticket: TicketCreate) -> dict:
    """Create a new ticket with optional AI-generated fields."""
    if ticket.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid ticket status")

    # Generate AI fields if requested
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
    """Update an existing ticket. Only updates fields that are provided."""
    with db_conn() as conn:
        existing = conn.execute("SELECT * FROM tickets WHERE id = ?", (ticket_id,)).fetchone()
        if existing is None:
            raise HTTPException(status_code=404, detail="Ticket not found")

        # Use existing values for fields not provided in update
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
    """Delete a ticket by ID. Returns 404 if ticket doesn't exist."""
    with db_conn() as conn:
        deleted = conn.execute("DELETE FROM tickets WHERE id = ?", (ticket_id,))
        if deleted.rowcount == 0:
            raise HTTPException(status_code=404, detail="Ticket not found")
    return {"message": "Deleted"}