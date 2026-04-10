# SmartBacklog - Intelligent Agile Task Management

A web-based Kanban-style task management application with AI-powered features for product teams.

## Project Overview

**Sprint 1 (MVP):** Core Kanban board with CRUD operations for tickets.  
**Sprint 2 (AI Integration):** Auto-generation of acceptance criteria, story point estimation, and priority analysis using GPT-4o or Mistral AI.

## Tech Stack

- **Backend:** FastAPI (Python 3.14)
- **Frontend:** React + Vite (JavaScript)
- **Styling:** Tailwind CSS (via CDN)
- **API Communication:** CORS-enabled REST API

## Project Structure

```
SmartBacklog/
├── backend/
│   ├── venv/              # Python virtual environment
│   ├── main.py            # FastAPI app with routes
│   └── requirements.txt    # Python dependencies
├── frontend/
│   ├── node_modules/      # Node packages (not in git)
│   ├── src/
│   │   ├── App.jsx        # Main React component
│   │   ├── main.jsx       # React entry point
│   │   └── ...
│   ├── index.html         # HTML template
│   ├── package.json       # Node dependencies
│   └── vite.config.js     # Vite configuration
├── .gitignore             # Git ignore rules
└── README.md              # This file
```

## Setup Instructions

### Prerequisites

- Python 3.10+
- Node.js 18+
- npm or yarn

### Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

Backend runs on: http://localhost:8000

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: http://localhost:5173

## API Endpoints (Sprint 1)

| Method | Endpoint        | Description       |
| ------ | --------------- | ----------------- |
| GET    | `/tickets`      | List all tickets  |
| POST   | `/tickets`      | Create new ticket |
| DELETE | `/tickets/{id}` | Delete ticket     |

## Features Implemented

✅ Kanban board with 3 columns (To Do, In Progress, Done)  
✅ Add tickets  
✅ Delete tickets  
✅ Move tickets between columns  
✅ Frontend-Backend API integration  
✅ CORS middleware for cross-origin requests

## Running the Application

**Terminal 1 - Backend:**

```bash
cd backend
source venv/bin/activate
python -m uvicorn main:app --reload
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
```

Then open: http://localhost:5173

## Next Steps (Sprint 2)

- [ ] Add AI integration for acceptance criteria generation
- [ ] Add story point estimation using AI
- [ ] Add priority analysis
- [ ] Persist tickets to database (SQLite or PostgreSQL)
- [ ] Add authentication
- [ ] Deploy to production

## Notes

- Tickets are stored in-memory (reset on server restart). Use a database for persistence.
- CORS is open to all origins (`allow_origins=["*"]`). Restrict in production.
- API key management and `.env` file setup needed for Sprint 2 AI features.

## Contributing

For changes, create a feature branch and submit a pull request.

## License

MIT
