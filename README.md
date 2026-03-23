#  SmartStudy-AI — Personalized Offline AI Study Assistant

> A full-stack AI-powered study assistant that runs **completely offline** using Ollama.  
> Chat with an AI tutor, generate quizzes, upload PDFs, and track your learning progress — all without internet.

---

## 🔗 Repositories

| Part | Repository |
|------|-----------|
| full stack (Spring Boot) | https://github.com/syamkumarrangineedi/SmartStudy-Ai |


---

##  Features

-  **AI Tutor Chat** — Ask any question and get answers from a local LLM (phi model via Ollama)
-  **Quiz Generator** — Generate 5-question MCQ quizzes on any topic with instant answer reveal and scoring
-  **Multi-file PDF Upload** — Upload multiple PDFs or TXT files and ask questions about them
-  **Student Accounts** — Register and login with a personal account stored in MongoDB
-  **Personalized Dashboard** — Track quiz scores, topic performance, level progression, and weak areas
-  **Session History** — Previous chats are saved and can be reopened from the sidebar
-  **Copy Answers** — One-click copy button on every AI response
-  **Nature-themed UI** — Animated background slideshow, frosted glass panels, dark theme
-  **Fully Offline** — No internet required after setup. All AI runs locally via Ollama

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────┐
│              React Frontend  (port 3000)             │
│  TutorChat │ Quiz │ Dashboard │ Login │ Sidebar      │
└──────────────────────┬──────────────────────────────┘
                       │ Axios HTTP
┌──────────────────────▼──────────────────────────────┐
│           Spring Boot Backend  (port 8080)           │
│  AiController │ DocumentController │ StudentController│
│  OllamaService │ DocumentService │ StudentService    │
└──────────┬───────────────────┬────────────────────── ┘
           │                   │
┌──────────▼──────┐   ┌────────▼────────┐
│  Ollama (11434) │   │ MongoDB (27017)  │
│  phi model      │   │ students        │
│  runs offline   │   │ study_materials │
└─────────────────┘   └─────────────────┘
```

---

##  Tech Stack

### Backend
| Technology | Purpose |
|-----------|---------|
| Java 17 | Language |
| Spring Boot 3 | REST API framework |
| Spring Data MongoDB | Database ORM |
| MongoDB | Local database |
| Apache PDFBox | PDF text extraction |
| Ollama REST API | Local LLM inference |
| Lombok | Boilerplate reduction |

### Frontend
| Technology | Purpose |
|-----------|---------|
| React 18 | UI framework |
| React Router v6 | Page routing |
| Axios | HTTP client |
| Nunito + JetBrains Mono | Fonts |
| CSS Variables + Glassmorphism | Styling |

### AI Model
| Component | Detail |
|-----------|--------|
| Engine | Ollama |
| Model | phi (Microsoft) |
| Runs on | localhost:11434 |
| Internet needed |  No |

---

##  Prerequisites

Make sure you have all of these installed before starting:

| Tool | Version | Download |
|------|---------|----------|
| Java JDK | 17+ | https://adoptium.net |
| Maven | 3.8+ | https://maven.apache.org |
| Node.js | 18+ | https://nodejs.org |
| MongoDB | 6+ | https://www.mongodb.com/try/download/community |
| Ollama | Latest | https://ollama.com |

---

##  Setup & Installation

### Step 1 — Clone both repositories

```bash
# Create a project folder
mkdir SmartStudy && cd SmartStudy

# Clone backend
git clone https://github.com/syamkumarrangineedi/SmartStudy-Ai.git backend

# Clone frontend
git clone https://github.com/syamkumarrangineedi/ai-study-assistant-ui.git frontend
```

---

### Step 2 — Start MongoDB

```bash
mongod
```

MongoDB will run on `localhost:27017`.  
The app uses a database named `studyassistant` — it is created automatically.

---

### Step 3 — Install and start Ollama with phi model

```bash
# Install Ollama from https://ollama.com then run:
ollama serve

# In a new terminal, pull the phi model (one time only, ~1.6 GB)
ollama pull phi
```

Ollama will run on `localhost:11434`.

---

### Step 4 — Run the Backend

```bash
cd backend
mvn spring-boot:run
```

Spring Boot starts on `http://localhost:8080`

You should see in the terminal:
```
Started OfflineAiApplication on port 8080
```

**Verify it's working:**
```
http://localhost:8080/api/student/ping
```
Should return: `{"status":"StudentController is working"}`

---

### Step 5 — Run the Frontend

```bash
cd frontend
npm install
npm start
```

React app opens at `http://localhost:3000`

---

##  Project Structure

### Backend — `SmartStudy-Ai`
```
src/main/java/com/studyassistant/offlineai/
│
├── OfflineAiApplication.java          # Entry point
│
├── config/
│   └── MongoConfig.java               # MongoDB connection
│
├── controller/
│   ├── AiController.java              # /api/ai/tutor, /api/ai/quiz
│   ├── DocumentController.java        # /api/document/upload
│   └── StudentController.java         # /api/student/register, login, profile
│
├── service/
│   ├── OllamaService.java             # Calls Ollama, manages session memory
│   ├── DocumentService.java           # PDF/TXT extraction, multi-file support
│   └── StudentService.java            # Student CRUD, quiz result saving
│
├── model/
│   ├── Student.java                   # Student document with topic stats
│   └── StudyMaterial.java             # Study material document
│
└── repository/
    ├── StudentRepository.java         # MongoDB queries for students
    └── StudyMaterialRepository.java   # MongoDB queries for materials
```

### Frontend — `ai-study-assistant-ui`
```
src/
│
├── App.js                             # Routes: /, /quiz, /dashboard, /login
├── App.css                            # Nature theme, glassmorphism, animations
│
├── pages/
│   ├── TutorChat.js                   # Main chat page with sidebar + file upload
│   ├── Quiz.js                        # Quiz generator with answer reveal + scoring
│   ├── Dashboard.js                   # Progress charts, topic stats, history
│   └── Login.js                       # Register / Sign in / Guest mode
│
└── services/
    └── api.js                         # All Axios API calls
```

---

##  API Endpoints

### AI
| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/api/ai/tutor?question=&sessionKey=` | Ask the AI tutor |
| GET | `/api/ai/quiz?topic=` | Generate a quiz |
| DELETE | `/api/ai/memory?sessionKey=` | Clear session memory |

### Documents
| Method | Endpoint | Description |
|--------|---------|-------------|
| POST | `/api/document/upload` | Upload one or more PDF/TXT files |
| GET | `/api/document/status` | List loaded files |
| GET | `/api/document/debug` | Preview extracted text |
| DELETE | `/api/document/remove?filename=` | Remove a specific file |
| DELETE | `/api/document/clear` | Remove all files |

### Students
| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/api/student/ping` | Health check |
| POST | `/api/student/register` | Create account |
| POST | `/api/student/login` | Sign in |
| GET | `/api/student/profile/{id}` | Get full profile + stats |
| POST | `/api/student/quiz-result` | Save quiz score |

---

##  How to Use

1. **Open** `http://localhost:3000`
2. **Register** an account or click **Continue as Guest**
3. **Chat** — type any question and press Enter
4. **Upload files** — click 📎 to attach PDFs, then ask questions about them
5. **Quiz** — click  Quiz, enter a topic, generate and answer questions
6. **Dashboard** — click  My Progress to see your performance charts
7. **History** — previous chats appear in the sidebar and can be reopened

---

##  Configuration

### Change the AI model
In `OllamaService.java`, change `"phi"` to any model you have installed:
```java
req.put("model", "phi");        // fast, small
// req.put("model", "llama3");  // smarter, slower
// req.put("model", "mistral"); // good balance
```

### Change MongoDB database name
In `MongoConfig.java`:
```java
return new MongoTemplate(mongoClient(), "studyassistant"); // change this name
```

### Change backend port
In `src/main/resources/application.properties`:
```properties
server.port=8080
```

### Change frontend API URL
In `src/services/api.js`:
```javascript
const API = axios.create({ baseURL: "http://localhost:8080/api" });
```

---

##  Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| `Cannot reach Spring Boot` | Backend not running | Run `mvn spring-boot:run` in backend folder |
| `Error reaching Ollama` | Ollama not running | Run `ollama serve` in a terminal |
| `No response from model` | phi not installed | Run `ollama pull phi` |
| `MongoDB connection failed` | MongoDB not running | Run `mongod` in a terminal |
| `PDF no text found` | Scanned/image PDF | Only text-based PDFs are supported |
| `Quiz format error` | phi gave bad JSON | Try a simpler topic name |
| `Register fails 500` | MongoDB not running | Start MongoDB first |

---

## 🗺 Roadmap

- [ ] Upgrade to a smarter model (llama3, mistral)
- [ ] Streaming AI responses word by word
- [ ] Export quiz results as PDF
- [ ] Dark / light theme toggle
- [ ] Deploy backend to Railway or Render
- [ ] Deploy frontend to Vercel or Netlify

---

##  Author

**Syam Kumar Rangineedi**  
GitHub: https://github.com/syamkumarrangineedi

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
