# CB-X 🤖

CB-X is a full-stack AI chatbot with a React frontend and FastAPI backend. It
supports streaming responses, visible reasoning, multiple model workers,
file-aware conversations, document generation, and optional local Ollama
inference.

## Features

- Stream AI responses and inspect worker thoughts as they are generated.
- Route work through dedicated Router, Research, Writer, Coder, Maths, and
  Merger workers.
- Save and switch between multiple chat sessions.
- Upload images and documents (`PDF`, `DOCX`, `TXT`, `MD`, code, `CSV`, and
  common web formats) for context.
- Create, download, list, and delete generated files.
- Configure hosted provider API keys per worker or use a shared key.
- Run workers locally with Ollama and select an installed model for each role.
- Guided first-run tutorial and responsive layouts for desktop and smaller
  screens.
- JWT authentication, editable profile instructions, and MongoDB persistence.

## Tech stack

- **Frontend:** React 19, Vite, Tailwind CSS, Axios, React Router, and
  `react-markdown`
- **Backend:** Python 3, FastAPI, Pydantic, Uvicorn, PyMongo, and PyJWT
- **AI/runtime:** Ollama plus configurable hosted providers
- **Storage:** MongoDB
- **Security:** Argon2 password hashing, JWT bearer tokens, and CORS

## Project structure

```text
CB-X/
├── frontend/                 # React application
│   ├── src/
│   │   ├── api/              # API and local Ollama clients
│   │   └── components/       # Chat, setup, profile, history, and settings UI
│   └── package.json
├── backend/                  # FastAPI application
│   ├── main.py               # API entry point
│   ├── general.py            # Model orchestration and streaming
│   ├── db.py                 # MongoDB access
│   ├── doc_agent.py          # Document generation and parsing
│   └── requirements.txt
└── README.md
```

## Prerequisites

- Node.js 16 or newer and npm
- Python 3.8 or newer and pip
- A MongoDB database
- API credentials for the providers/models you plan to use, or Ollama for
  local mode

## Installation

Clone the repository and install both sets of dependencies:

```bash
git clone https://github.com/MalayGoel07/CB-X.git
cd CB-X

python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r backend/requirements.txt

cd frontend
npm install
```

Create `backend/.env` before starting the API:

```env
MONGO_USERNAME=your_mongodb_username
MONGO_PASSWORD=your_mongodb_password
MONGO_CLUSTER=your_cluster.mongodb.net
MONGO_MAX_FILE=20

SECRET_KEY=replace_with_a_long_random_secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
ALLOWED_ORIGINS=http://localhost:5173

# Worker model names. A1-A6 are used by the main worker roles.
A1=your_router_model
A2=your_research_model
A3=your_writer_model
A4=your_coder_model
A5=your_maths_model
A6=your_merger_model
```

The exact model and provider variables depend on the configured deployment.
Keep secrets in `.env`; do not commit them.

## Run locally

Start the backend from the repository root:

```bash
source .venv/bin/activate
cd backend
python -m uvicorn main:app --reload --host localhost --port 8000
```

In another terminal, start the frontend:

```bash
cd frontend
npm run dev
```

Open <http://localhost:5173>.

### Local Ollama mode

Open **Settings → Local mode**, enable local mode, enter the Ollama address
(usually `http://localhost:11434`), test the connection, and choose a model for
each worker. Ollama must be running on the same machine or reachable from the
browser. The in-app setup guide includes platform-specific `OLLAMA_ORIGINS`
commands.

## Usage

1. Sign up or log in.
2. Complete the guided tutorial, or open it again from settings.
3. Select hosted models/API keys or configure local Ollama workers.
4. Start a chat, attach files when needed, and inspect streamed thoughts.
5. Use History to switch chats and Collections to manage generated files.

## API overview

### Authentication and profile

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/auth/signup` | Create an account |
| `POST` | `/auth/login` | Obtain a JWT |
| `GET` / `PUT` | `/me` | Read or update the signed-in profile |
| `POST` | `/me/tutorial` | Mark the tutorial complete |
| `DELETE` | `/me` | Delete the account and owned files |

### Chat, models, and files

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/chat` | Stream a response with optional attachments |
| `GET` / `POST` | `/history` | Read or save chat history |
| `GET` / `POST` | `/chats` | Read or save chat sessions |
| `GET` | `/models` | List configured worker models |
| `GET` / `PUT` | `/me/models` | Read or save model/API-key settings |
| `GET` | `/models/installed` | List installed local models |
| `POST` | `/documents` | Generate a downloadable document |
| `GET` | `/files` | List the user's generated files |
| `GET` / `DELETE` | `/files/{file_id}` | Download or delete a file |

## Development

```bash
cd frontend
npm run lint
npm run build
```

Backend tests are located in `backend/` and can be run with:

```bash
python -m pytest backend
```

## License

This project is open source. See `LICENSE` for details.

**Last updated:** November 2, 2026
**Repository:** <https://github.com/MalayGoel07/CB-X>
