export const getToken = () => localStorage.getItem("token");

export const authHeaders = (headers = {}) => ({
  ...headers,
  Authorization: `Bearer ${getToken()}`,
});

export const handleUnauthorized = (response) => {
  if (response.status !== 401) return false;
  localStorage.removeItem("token");
  if (window.location.pathname !== "/logsign") {
    window.location.replace("/logsign");
  }
  return true;
};
