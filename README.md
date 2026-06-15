# CB-X 🤖

**An intelligent AI-powered chatbot application with advanced reasoning capabilities and a modern web interface.**

> CB-X is a full-stack web application that combines a React-based frontend with a FastAPI backend, enabling seamless interaction with AI models that showcase their reasoning process through real-time thought streaming.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [Architecture](#architecture)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

CB-X is a sophisticated chatbot application designed to demonstrate advanced AI reasoning capabilities. It features:

- **Real-time thought streaming** - Watch the AI's reasoning process in real-time as it works through problems
- **Multi-model support** - Switch between different AI models within the same conversation
- **Persistent chat history** - All conversations are saved and can be retrieved later
- **User authentication** - Secure login system with JWT token-based authentication
- **Modern UI/UX** - Sleek, responsive interface built with React and Tailwind CSS
- **Session management** - Manage multiple chat sessions and settings

---

## ✨ Features

### User Management
- User registration and authentication
- JWT token-based secure sessions
- User profiles with customizable settings
- Password encryption using Argon2

### Chat Interface
- Real-time chat with streaming responses
- AI thought visualization modal
- Chat history panel with conversation management
- Clear chat functionality
- Responsive design for multiple screen sizes

### Model Management
- Support for multiple AI models
- Model selection interface
- Model-specific configuration
- Easy switching between models mid-conversation

### Advanced Features
- **Streaming Thoughts** - View the AI's step-by-step reasoning
- **Final Response Extraction** - Clean separation of reasoning from final answers
- **Persistent Storage** - MongoDB integration for history and user data
- **Settings Panel** - Customize application behavior and preferences

---

## 🛠️ Tech Stack

### Frontend (77.4%)
- **React 19** - UI library with hooks
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Axios** - HTTP client for API requests
- **React Router DOM** - Client-side routing
- **JavaScript** - Primary language

### Backend (21.4%)
- **FastAPI** - Modern Python web framework
- **Python 3.x** - Backend runtime
- **PyMongo** - MongoDB driver
- **PyJWT** - JWT token handling
- **Uvicorn** - ASGI server
- **Pydantic** - Data validation
- **python-dotenv** - Environment configuration

### Database
- **MongoDB** - Document database for storing users, history, and configurations

### Security
- **Argon2** - Password hashing
- **JWT** - Token-based authentication
- **CORS** - Cross-origin resource sharing

---

## 📁 Project Structure

```
Qbot-X/
├── frontend/                 # React application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── api/              # API integration
│   │   ├── App.jsx           # Main application component
│   │   └── index.css         # Global styles
│   ├── package.json          # Frontend dependencies
│   └── vite.config.js        # Vite configuration
│
├── backend/                  # FastAPI application
│   ├── app.py                # Main application entry point
│   ├── requirements.txt       # Python dependencies
│   └── .env                  # Environment variables (not included)
│
├── README.md                 # This file
└── .gitignore               # Git ignore rules
```

### Frontend Components
- **HistoryPanel** - Display and manage chat history
- **ModelsPanel** - Model selection and configuration
- **ThoughtsModal** - Display AI reasoning process
- **OutputBox** - Display AI responses
- **InputBar** - User input interface
- **ActionBar** - Action buttons (thoughts, history, models, new chat)
- **TopBar** - Navigation and profile access
- **ProfilePanel** - User profile information
- **SettingPanel** - Application settings

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16.0.0 or higher) - For frontend
- **Python** (v3.8 or higher) - For backend
- **MongoDB** (v4.0 or higher) - For database
- **npm** (v8.0.0 or higher) - Package manager for Node.js
- **pip** (v21.0 or higher) - Package manager for Python

---

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/MalayGoel07/Qbot-X.git
cd Qbot-X
```

### 2. Backend Setup

#### Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

#### Environment Configuration

Create a `.env` file in the `backend` directory:

```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017
DATABASE_NAME=qbot_x

# Server Configuration
HOST=localhost
PORT=8000

# JWT Configuration
SECRET_KEY=your_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

#### Start the Backend Server

```bash
# From the backend directory
python -m uvicorn app:app --reload --host localhost --port 8000
```

The backend will be available at `http://localhost:8000`

### 3. Frontend Setup

#### Install Node Dependencies

```bash
cd frontend
npm install
```

#### Start the Development Server

```bash
# From the frontend directory
npm run dev
```

The frontend will be available at `http://localhost:5173`

---

## ⚙️ Configuration

### Frontend Configuration

The frontend connects to the backend via the API base URL defined in `src/api/base.js`:

```javascript
// Default backend URL
const API_BASE_URL = 'http://localhost:8000';
```

### Backend Configuration

Key environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017` |
| `DATABASE_NAME` | Database name | `qbot_x` |
| `SECRET_KEY` | JWT secret key | Required |
| `ALLOWED_ORIGINS` | CORS allowed origins | `http://localhost:5173` |
| `PORT` | Server port | `8000` |

---

## 💬 Usage

### Running the Application

1. **Start MongoDB** (if running locally):
   ```bash
   mongod
   ```

2. **Start the Backend** (from `backend` directory):
   ```bash
   python -m uvicorn app:app --reload
   ```

3. **Start the Frontend** (from `frontend` directory):
   ```bash
   npm run dev
   ```

4. **Open your browser** and navigate to `http://localhost:5173`

### User Registration & Login

1. Register a new account with your email and password
2. Log in with your credentials
3. You'll receive a JWT token stored in localStorage

### Starting a Chat

1. Type your question or prompt in the input bar
2. Press Enter or click the send button
3. Watch the AI's thought process in the "Thoughts" panel
4. View the final response in the output box

### Managing Chat History

- Click the **History** button to view all previous conversations
- Select a conversation to continue chatting
- Click **Clear Chat** to start fresh
- History is automatically saved to the server

### Switching Models

- Click the **Models** button to see available AI models
- Select a different model to switch
- The change applies to subsequent messages

---

## 🔌 API Endpoints

### Authentication
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login and receive JWT token

### Chat
- `POST /chat` - Send a message and receive streaming response

### History
- `GET /history` - Retrieve user's chat history
- `POST /history` - Save or update chat history
- `DELETE /history` - Clear chat history

### Models
- `GET /models` - List available AI models
- `GET /models/{model_id}` - Get model details

### User Profile
- `GET /profile` - Get user profile information
- `PUT /profile` - Update user profile

---

## 🏗️ Architecture

### Frontend Architecture

The frontend follows a **component-based architecture** with:

- **State Management**: React hooks (useState, useEffect)
- **API Communication**: Axios with custom base configuration
- **Routing**: React Router for navigation
- **Styling**: Tailwind CSS with custom animations
- **Local Storage**: For token and history persistence

### Backend Architecture

The backend uses a **layered architecture** with:

- **API Layer**: FastAPI endpoints
- **Business Logic**: Model reasoning and streaming
- **Data Access**: MongoDB integration
- **Authentication**: JWT-based security
- **Validation**: Pydantic models

### Data Flow

```
User Input → Frontend → API Request → Backend Processing 
→ Streaming Response → Thought Display → Final Output
```

---

## 🔧 Development

### Building for Production

#### Frontend
```bash
cd frontend
npm run build
# Output in frontend/dist/
```

#### Backend
For production deployment, use:
```bash
uvicorn app:app --host 0.0.0.0 --port 8000
```

### Linting & Code Quality

#### Frontend
```bash
cd frontend
npm run lint
```

### Adding New Components

1. Create a new component file in `frontend/src/components/`
2. Import and use in `App.jsx` or other components
3. Style using Tailwind CSS classes

### Adding New API Endpoints

1. Define the endpoint in `backend/app.py`
2. Use Pydantic models for request/response validation
3. Implement JWT authentication where needed
4. Test with curl or Postman

---

## 📝 License

This project is open source. Please check the LICENSE file for details.

---

## 🐛 Troubleshooting

### Backend Connection Issues
- Ensure MongoDB is running
- Check that `MONGODB_URI` is correct
- Verify backend is running on port 8000

### Frontend Build Issues
- Clear `node_modules` and reinstall: `npm install`
- Clear Vite cache: `rm -rf .vite`
- Ensure Node.js version is compatible

### CORS Errors
- Check `ALLOWED_ORIGINS` in backend `.env`
- Ensure frontend URL is included in allowed origins

### Authentication Issues
- Clear localStorage: `localStorage.clear()`
- Check JWT token expiration
- Verify `SECRET_KEY` matches between requests

---

## 📞 Support

For issues, questions, or suggestions, please:

1. Check existing issues on GitHub
2. Create a new issue with detailed information
3. Include error messages and steps to reproduce

---

## 🎉 Acknowledgments

Built with modern technologies and best practices for a seamless AI chatbot experience.

---

**Last Updated**: June 1, 2026  
**Repository**: [MalayGoel07/Qbot-X](https://github.com/MalayGoel07/Qbot-X)
