import axios from "axios";
import { API_BASE as API_BASE_URL } from "./config";

export default axios.create({
    baseURL: API_BASE_URL,
});