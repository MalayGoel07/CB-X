import axios from "axios";

export default axios.create({
    baseURL:
        import.meta.env.VITE_API_BASE_URL ||
        (import.meta.env.DEV
            ? "http://localhost:8000"
            : "https://cb-x-backend.onrender.com"),
});