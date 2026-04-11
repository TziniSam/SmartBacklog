import json
import os
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from openai import OpenAI
except ImportError:  # pragma: no cover - only used when package is unavailable
    OpenAI = None

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
    {
        "id": 1,
        "title": "Login Page",
        "description": "Build login page with email/password and validation.",
        "status": "todo",
    },
    {
        "id": 2,
        "title": "Dashboard UI",
        "description": "Create initial dashboard widgets and routing.",
        "status": "in-progress",
    },
]

VALID_STATUSES = {"todo", "in-progress", "done"}
VALID_STORY_POINTS = {1, 2, 3, 5, 8, 13}


class TicketCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=5000)
    status: Literal["todo", "in-progress", "done"] = "todo"


class TicketUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=5000)
    status: Literal["todo", "in-progress", "done"] | None = None


class AcceptanceCriteriaRequest(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=5000)


class AcceptanceCriteriaResponse(BaseModel):
    acceptance_criteria: list[str]
    source: Literal["ai", "fallback"]


class StoryPointsRequest(BaseModel):
    title: str = Field(default="", max_length=120)
    description: str = Field(min_length=1, max_length=5000)


class StoryPointsResponse(BaseModel):
    story_points: Literal[1, 2, 3, 5, 8, 13]
    reasoning: str
    source: Literal["ai", "fallback"]


class PriorityRequest(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=5000)


class PriorityResponse(BaseModel):
    priority: Literal["normal", "urgent", "blocking"]
    is_urgent: bool
    is_blocking: bool
    reasoning: str
    source: Literal["ai", "fallback"]


def _next_ticket_id() -> int:
    return max((ticket["id"] for ticket in tickets), default=0) + 1


def _find_ticket_index(ticket_id: int) -> int:
    for index, ticket in enumerate(tickets):
        if ticket["id"] == ticket_id:
            return index
    raise HTTPException(status_code=404, detail="Ticket not found")


def _openai_client() -> OpenAI | None:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or OpenAI is None:
        return None
    return OpenAI(api_key=api_key)


def _fallback_acceptance_criteria(title: str, description: str) -> list[str]:
    scope = description.strip() or f"the {title} feature"
    return [
        f"Given a user accesses {title}, when they complete the expected action, then the system responds successfully.",
        f"Given valid input for {title}, when the request is submitted, then data is saved and confirmed to the user.",
        f"Given invalid or incomplete input in {title}, when validation runs, then clear error messages are displayed.",
        f"Given {scope}, when an unexpected error occurs, then a user-friendly fallback message is shown.",
        f"Given authorized users use {title}, when audit logging is enabled, then key actions are traceable.",
    ]


def _fallback_story_points(text: str) -> tuple[int, str]:
    lowered = text.lower()
    score = 1
    if any(word in lowered for word in ["integration", "api", "payment", "oauth", "security"]):
        score = max(score, 8)
    if any(word in lowered for word in ["migration", "architecture", "refactor", "distributed"]):
        score = max(score, 13)
    if any(word in lowered for word in ["dashboard", "workflow", "report", "search"]):
        score = max(score, 5)
    if len(text.split()) > 80:
        score = max(score, 8)
    elif len(text.split()) > 35:
        score = max(score, 5)
    elif len(text.split()) > 15:
        score = max(score, 3)
    reasoning = "Estimated from feature scope, keywords, and description size."
    return score if score in VALID_STORY_POINTS else 5, reasoning


def _fallback_priority(text: str) -> tuple[str, bool, bool, str]:
    lowered = text.lower()
    blocking_words = ["blocker", "blocking", "cannot deploy", "production down", "outage"]
    urgent_words = ["urgent", "asap", "critical", "deadline", "today", "immediately"]

    is_blocking = any(word in lowered for word in blocking_words)
    is_urgent = any(word in lowered for word in urgent_words)

    if is_blocking:
        return "blocking", True, True, "Contains blocker indicators that can halt delivery."
    if is_urgent:
        return "urgent", True, False, "Contains urgency indicators suggesting immediate attention."
    return "normal", False, False, "No blocker or urgency indicators found in ticket text."


SYSTEM_PROMPT = (
    "You are an expert Agile Coach for Scrum teams. "
    "Return concise JSON only, with practical and realistic ticket guidance."
)


def _ai_json(task_prompt: str) -> dict | None:
    client = _openai_client()
    if client is None:
        return None

    model = os.getenv("OPENAI_MODEL", "gpt-4o")
    response = client.chat.completions.create(
        model=model,
        temperature=0.2,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": task_prompt},
        ],
        response_format={"type": "json_object"},
    )

    content = response.choices[0].message.content
    if not content:
        return None
    return json.loads(content)

# Routes
@app.get("/")
def root():
    return {"message": "API is running"}

@app.get("/tickets")
def get_tickets():
    return tickets

@app.post("/tickets")
def add_ticket(ticket: TicketCreate):
    new_ticket = {
        "id": _next_ticket_id(),
        "title": ticket.title,
        "description": ticket.description,
        "status": ticket.status,
    }
    tickets.append(new_ticket)
    return new_ticket


@app.put("/tickets/{ticket_id}")
def update_ticket(ticket_id: int, ticket: TicketUpdate):
    ticket_index = _find_ticket_index(ticket_id)
    updated_ticket = tickets[ticket_index].copy()

    incoming = ticket.model_dump(exclude_none=True)
    for field_name, value in incoming.items():
        updated_ticket[field_name] = value

    if updated_ticket["status"] not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid ticket status")

    tickets[ticket_index] = updated_ticket
    return updated_ticket

@app.delete("/tickets/{ticket_id}")
def delete_ticket(ticket_id: int):
    ticket_index = _find_ticket_index(ticket_id)
    tickets.pop(ticket_index)
    return {"message": "Deleted"}


@app.post("/ai/acceptance-criteria", response_model=AcceptanceCriteriaResponse)
def generate_acceptance_criteria(payload: AcceptanceCriteriaRequest):
    prompt = (
        "Generate acceptance criteria for a Scrum user story. "
        "Return JSON: {\"acceptance_criteria\": [string, ...]} with exactly 5 items.\n"
        f"Title: {payload.title}\n"
        f"Description: {payload.description}"
    )

    try:
        result = _ai_json(prompt)
        if result and isinstance(result.get("acceptance_criteria"), list):
            criteria = [str(item).strip() for item in result["acceptance_criteria"] if str(item).strip()]
            if criteria:
                return {"acceptance_criteria": criteria[:5], "source": "ai"}
    except Exception:
        pass

    fallback = _fallback_acceptance_criteria(payload.title, payload.description)
    return {"acceptance_criteria": fallback, "source": "fallback"}


@app.post("/ai/story-points", response_model=StoryPointsResponse)
def estimate_story_points(payload: StoryPointsRequest):
    text = f"{payload.title} {payload.description}".strip()
    prompt = (
        "Estimate Scrum story points using Fibonacci scale [1,2,3,5,8,13]. "
        "Return JSON: {\"story_points\": number, \"reasoning\": string}.\n"
        f"Ticket text: {text}"
    )

    try:
        result = _ai_json(prompt)
        if result:
            points = int(result.get("story_points"))
            reasoning = str(result.get("reasoning", "AI estimation based on complexity.")).strip()
            if points in VALID_STORY_POINTS:
                return {"story_points": points, "reasoning": reasoning, "source": "ai"}
    except Exception:
        pass

    points, reasoning = _fallback_story_points(text)
    return {"story_points": points, "reasoning": reasoning, "source": "fallback"}


@app.post("/ai/priority", response_model=PriorityResponse)
def analyze_priority(payload: PriorityRequest):
    text = f"{payload.title} {payload.description}".strip()
    prompt = (
        "Classify this Scrum ticket priority. "
        "Return JSON with keys: priority (normal|urgent|blocking), is_urgent (bool), is_blocking (bool), reasoning (string).\n"
        f"Ticket text: {text}"
    )

    try:
        result = _ai_json(prompt)
        if result:
            priority = str(result.get("priority", "normal")).strip().lower()
            is_urgent = bool(result.get("is_urgent", False))
            is_blocking = bool(result.get("is_blocking", False))
            reasoning = str(result.get("reasoning", "AI priority analysis.")).strip()

            if priority in {"normal", "urgent", "blocking"}:
                return {
                    "priority": priority,
                    "is_urgent": is_urgent,
                    "is_blocking": is_blocking,
                    "reasoning": reasoning,
                    "source": "ai",
                }
    except Exception:
        pass

    priority, is_urgent, is_blocking, reasoning = _fallback_priority(text)
    return {
        "priority": priority,
        "is_urgent": is_urgent,
        "is_blocking": is_blocking,
        "reasoning": reasoning,
        "source": "fallback",
    }