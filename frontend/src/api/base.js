async function base(input, onchunk, history = [], attachments = []) {
    const token = localStorage.getItem("token");
    const body = new FormData();
    body.append("message", input);
    body.append("history", JSON.stringify(history));
    attachments.forEach((file) => body.append("files", file));
    const response = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: {"Authorization": `Bearer ${token}`},
        body
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (!response.body) throw new Error("The server returned no response stream.");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let eventData = [];
    let transcript = "";
    let finalText = "";
    let tokenCount = null;
    let errorText = "";
    let done = false;
    const files = [];

    const processLine = (line) => {
        const normalizedLine = line.endsWith("\r") ? line.slice(0, -1) : line;
        if (!normalizedLine) {
            if (eventData.length === 0) return;

            const text = eventData.join("\n");
            eventData = [];
            if (text === "[DONE]") {
                done = true;
                return;
            }

            if (text.startsWith("[Error] ")) {
                errorText = text.slice("[Error] ".length);
                return;
            }

            if (text.startsWith("[Usage] ")) {
                const parsedTokenCount = Number(text.slice("[Usage] ".length));
                if (!Number.isSafeInteger(parsedTokenCount) || parsedTokenCount < 0) {
                    errorText = "The server returned invalid token usage.";
                    return;
                }
                tokenCount = parsedTokenCount;
                return;
            }

            if (text.startsWith("[File]")) {
                try {
                    const file = JSON.parse(text.slice("[File]".length));
                    if (
                        typeof file?.name === "string" &&
                        typeof file?.url === "string" &&
                        file.url.startsWith("/files/")
                    ) {
                        files.push({
                            name: file.name,
                            url: file.url,
                            format: typeof file.format === "string" ? file.format : "",
                        });
                    }
                } catch {
                    // Ignore a malformed file event; the text answer still works.
                }
                return;
            }

            if (text.startsWith("[FinalChunk]")) {
                const chunk = text.slice("[FinalChunk]".length);
                finalText += chunk;
                transcript += chunk;
                onchunk?.(transcript, finalText);
                return;
            }

            transcript += `\n${text}`;
            if (text.startsWith("[Final] ")) {
                finalText = text.slice("[Final] ".length);
            }
            onchunk?.(transcript, finalText);
            return;
        }

        if (normalizedLine.startsWith("data:")) {
            eventData.push(normalizedLine.slice(5).replace(/^ /, ""));
        }
    };

    try {
        while (!done) {
            const { done: streamDone, value } = await reader.read();
            buffer += decoder.decode(value, { stream: !streamDone });

            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
                processLine(line);
                if (done) break;
            }

            if (streamDone) {
                if (buffer) processLine(buffer);
                processLine("");
                break;
            }
        }
    } finally {
        reader.releaseLock();
    }

    if (errorText) throw new Error(errorText);
    if (!finalText.trim()) throw new Error("The server stream ended without a final answer.");
    return { text: finalText, tokenCount, files };
}

export default base;