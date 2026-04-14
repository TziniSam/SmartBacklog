# SmartBacklog - Sprint Reports

## Sprint 1: The App Core (MVP)

### Sprint Goal
Build a functional Kanban board with basic ticket management capabilities (Create, Read, Update, Delete).

### Sprint Duration
- **Start:** Week 1
- **End:** Week 2
- **Duration:** 2 weeks

### Planned Items
| Item | Description | Story Points | Status |
|------|-------------|--------------|--------|
| 1 | Kanban board with 3 columns (To Do, In Progress, Done) | 8 | ✅ Completed |
| 2 | Add new tickets | 5 | ✅ Completed |
| 3 | Edit existing tickets | 3 | ✅ Completed |
| 4 | Delete tickets | 2 | ✅ Completed |
| 5 | Move tickets between columns | 5 | ✅ Completed |
| 6 | Data persistence (SQLite) | 8 | ✅ Completed |
| 7 | Backend API (FastAPI) | 8 | ✅ Completed |

**Total Planned:** 39 story points

### Completed Items
All 7 planned items were completed successfully:
- Built React frontend with Tailwind CSS
- Implemented FastAPI backend with SQLite database
- Created CRUD endpoints for tickets
- Implemented column-based ticket organization
- Data persists across server restarts

### Sprint Review
**What went well:**
- FastAPI and React integration was straightforward
- SQLite provided simple, reliable data persistence
- Tailwind CSS enabled rapid UI development
- Clear separation of frontend/backend concerns

**What could be improved:**
- Initial merge conflicts in Git slowed progress
- No authentication mechanism (security concern)
- CORS configuration was too permissive (development-only)
- No error handling for edge cases in the frontend

**Demo:**
The team demonstrated a working Kanban board where users could:
- View tickets in three columns
- Add new tickets with title and description
- Edit ticket details
- Delete tickets
- Move tickets between status columns
- See data persist after page refresh

### Sprint Retrospective
**What we should continue doing:**
- Using modern tech stack (React + FastAPI)
- Keeping the database simple (SQLite for MVP)
- Writing clean, modular code
- Using version control effectively

**What we should stop doing:**
- Leaving security configurations open (CORS: "*")
- Committing sensitive data to repositories
- Skipping error handling

**What we should start doing:**
- Implement proper authentication
- Add input validation and rate limiting
- Write unit tests for critical functions
- Document API endpoints better

---

## Sprint 2: AI Integration (The Dev "Plus")

### Sprint Goal
Integrate AI capabilities to automate acceptance criteria generation, story point estimation, and priority analysis.

### Sprint Duration
- **Start:** Week 3
- **End:** Week 4
- **Duration:** 2 weeks

### Planned Items
| Item | Description | Story Points | Status |
|------|-------------|--------------|--------|
| 8 | AI-generated acceptance criteria | 8 | ✅ Completed |
| 9 | AI story point estimation (Fibonacci) | 8 | ✅ Completed |
| 10 | AI priority analysis | 5 | ✅ Completed |
| 11 | Integrate Gemini API | 8 | ✅ Completed |
| 12 | Fallback logic for AI failures | 5 | ✅ Completed |
| 13 | Show source of suggestions (AI/fallback) | 2 | ✅ Completed |

**Total Planned:** 36 story points

### Completed Items
All 6 planned items were completed successfully:
- Integrated Google Gemini API for AI features
- Implemented acceptance criteria generation endpoint
- Built story point estimation with Fibonacci scale
- Created priority analysis endpoint
- Added fallback logic for when AI is unavailable
- Labeled all suggestions with source (AI or fallback)

### Sprint Review
**What went well:**
- Gemini API was easy to integrate with Python
- Fallback logic ensured app works even without AI
- System prompt engineering produced good results
- JSON response format was consistent and parseable
- AI suggestions were practical and useful

**What could be improved:**
- API key was initially exposed in example file
- No caching for AI responses (redundant API calls)
- No rate limiting on AI endpoints
- Error messages could be more user-friendly

**Demo:**
The team demonstrated AI-powered features:
- User enters "Login Page" → AI generates 5 acceptance criteria
- User enters description → AI suggests story points (1, 2, 3, 5, 8, 13)
- User enters ticket text → AI classifies priority (normal/urgent/blocking)
- Fallback logic activates when API key is missing
- Source labels indicate whether suggestion is AI-generated or rule-based

### Sprint Retrospective
**What we should continue doing:**
- Using fallback mechanisms for reliability
- Prompt engineering for better AI outputs
- Keeping AI responses structured (JSON)
- Providing transparency on data sources

**What we should stop doing:**
- Committing API keys to version control
- Making redundant API calls for same inputs
- Using hardcoded prompts in production code

**What we should start doing:**
- Implementing response caching
- Adding rate limiting for AI endpoints
- Moving prompts to configuration files
- Adding more comprehensive error handling

---

## Process Improvement Between Sprints

### What Changed from Sprint 1 to Sprint 2

1. **Better Git Workflow**
   - Sprint 1: Experienced merge conflicts due to poor branching
   - Sprint 2: Improved by using main branch directly and resolving conflicts systematically
   - Result: Smoother collaboration and fewer integration issues

2. **API Integration Experience**
   - Sprint 1: No external APIs used
   - Sprint 2: First experience with Gemini API
   - Result: Learned proper API key management and error handling patterns

3. **Fallback Architecture**
   - Sprint 1: App fails completely if backend is down
   - Sprint 2: Implemented fallback logic for AI features
   - Result: More resilient application that degrades gracefully

4. **Documentation**
   - Sprint 1: Limited documentation
   - Sprint 2: Created .env.example and better code comments
   - Result: Easier onboarding and configuration

5. **Security Awareness**
   - Sprint 1: No security considerations
   - Sprint 2: Identified CORS issues and API key exposure
   - Result: Security improvements planned for future sprints

### Key Learnings

- **Prompt Engineering:** System prompts significantly impact AI output quality
- **Graceful Degradation:** Fallback mechanisms improve user experience
- **API Key Security:** Never commit secrets to version control
- **Git Hygiene:** Proper branching prevents merge conflicts
- **MVP Mindset:** Start simple, iterate based on feedback

### Velocity Comparison

| Sprint | Planned Points | Completed Points | Velocity |
|--------|----------------|------------------|----------|
| Sprint 1 | 39 | 39 | 39 |
| Sprint 2 | 36 | 36 | 36 |
| **Average** | - | - | **37.5** |

---

## Conclusion

Both sprints were completed successfully with all planned features delivered. The team demonstrated strong execution and continuous improvement between sprints. The application now provides a solid foundation for future enhancements including authentication, multi-project support, and advanced filtering capabilities.

**Total Project Progress:** 75 story points completed across 2 sprints
