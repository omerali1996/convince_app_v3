import React, { useState, useRef, useEffect } from "react";
import { useGame } from "../context/GameContext";
import api from "../api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function GameScreen() {
  const { currentScenario, exitGame } = useGame();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [chatEnded, setChatEnded] = useState(false);
  const scrollRef = useRef();
  const recognitionRef = useRef(null);
  const textareaRef = useRef(null);

  const norm = (s = "") =>
    s
      .normalize("NFC")
      .toLowerCase()
      .replace(/\*|_|`|~|”|“|″|„|«|»|’|‘|"/g, "")
      .replace(/\s+/g, " ")
      .trim();

  // Speech
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "tr-TR";

    recognition.onstart = () => {
      setListening(true);
      setInterimText("");
    };

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += transcript + " ";
        else interim += transcript;
      }

      if (final) setInput((prev) => prev + final);
      setInterimText(interim);
    };

    recognition.onerror = () => {
      setListening(false);
      setInterimText("");
    };

    recognition.onend = () => {
      setListening(false);
      setInterimText("");
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (currentScenario?.first_message) {
      setMessages([{ sender: "ai", text: currentScenario.first_message }]);
    } else {
      setMessages([]);
    }
    setInput("");
  }, [currentScenario?.id]);

  useEffect(() => {
    if (!listening && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [listening]);

  if (!currentScenario) return <div style={empty}>Senaryo seçilmedi.</div>;

  const startListening = () => {
    if (!recognitionRef.current) {
      alert("Tarayıcınız ses tanımayı desteklemiyor. Chrome veya Edge kullanın.");
      return;
    }
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch (error) {}
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      setInterimText("");
    }
  };

  const toggleMic = () => {
    if (listening) stopListening();
    else startListening();
  };

  const sendMessage = async () => {
    const userMessage = input.trim();
    if (!userMessage || loading || chatEnded) return;

    stopListening();
    setMessages((prev) => [...prev, { sender: "user", text: userMessage }]);
    setInput("");
    setInterimText("");
    setLoading(true);

    try {
      const res = await api.post("/api/ask", {
        user_input: userMessage,
        scenario_id: currentScenario.id,
        history: messages,
      });

      const aiText = (res.data?.answer || "").trim();
      setMessages((prev) => [...prev, { sender: "ai", text: aiText }]);

      const goal = currentScenario?.goal || currentScenario?.Goal;
      if (goal && norm(aiText).includes(norm(goal))) {
        setChatEnded(true);
        setMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            text:
              "🎯 **Senaryo başarıyla tamamlandı!**\n\n" +
              "Hedef cümleye ulaşıldı. Diğer senaryolara göz atmak için **Çıkış** ya da **Yeni Oturum** seçeneklerini kullanabilirsiniz.",
          },
        ]);
      }

      if (aiText.toLowerCase().includes("görüşmeyi burada sonlandırıyorum")) {
        setChatEnded(true);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: "Cevap alınamadı." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const resetChat = () => {
    stopListening();
    if (currentScenario?.first_message) {
      setMessages([{ sender: "ai", text: currentScenario.first_message }]);
    } else setMessages([]);
    setInput("");
    setInterimText("");
    setChatEnded(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <style>{animationStyles}</style>
      <div style={container}>
        <div style={topCard}>
          <div style={story}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {currentScenario.story}
            </ReactMarkdown>
          </div>
        </div>

        <div className="scroll-area" style={chatContainer}>
          {messages.map((m, idx) => (
            <div
              key={idx}
              style={{
                ...(m.sender === "user" ? userMessage : aiMessage),
                animation: `slideIn 0.6s ease-out ${idx * 0.08}s both`,
              }}
            >
              <strong style={{ opacity: 0.85 }}>
                {m.sender === "user" ? "Sen" : "Karşı Taraf"}:
              </strong>
              <div style={{ marginTop: 6 }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {m.text}
                </ReactMarkdown>
              </div>
            </div>
          ))}
          <div ref={scrollRef}></div>
        </div>

        <div style={inputSection}>
          <div style={{ position: "relative" }}>
            <textarea
              ref={textareaRef}
              value={input + (interimText ? " " + interimText : "")}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                chatEnded
                  ? "Görüşme sonlandırıldı."
                  : listening
                  ? "Konuşun..."
                  : "Mesajınızı yazın…"
              }
              disabled={loading || chatEnded}
              rows={2}
              style={{
                ...inputStyle,
                color: listening ? "var(--accent)" : "var(--text)",
                fontStyle: interimText ? "italic" : "normal",
                resize: "none",
              }}
            />
            {listening && !chatEnded && (
              <button
                onClick={stopListening}
                style={stopButton}
                title="Konuşmayı bitir"
                className="btn btn-success"
              >
                ✓
              </button>
            )}
          </div>

          <div style={buttonGroup}>
            <button
              onClick={sendMessage}
              disabled={loading || chatEnded}
              className="btn btn-primary"
            >
              {loading ? "Gönderiliyor..." : "Gönder"}
            </button>
            <button onClick={resetChat} className="btn btn-secondary">
              Yeni Oturum
            </button>
            <button
              onClick={toggleMic}
              disabled={chatEnded}
              className="btn btn-secondary"
              style={{
                background: listening ? "#2e8b57" : undefined,
                opacity: chatEnded ? 0.6 : 1,
                cursor: chatEnded ? "not-allowed" : "pointer",
              }}
            >
              {chatEnded
                ? "🔒 Görüşme bitti"
                : listening
                ? "🔴 Dinleniyor..."
                : "🗣️ Konuşun"}
            </button>
            <button onClick={exitGame} className="btn btn-secondary">
              Çıkış
            </button>
          </div>
        </div>

        {listening && !chatEnded && (
          <div style={listeningIndicator}>
            <div style={pulse}></div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Konuşun...</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                ✓ işaretine basarak veya Enter ile bitirin
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ---------- Styles ---------- */
const animationStyles = `
  @keyframes slideIn {
    from { opacity: 0; transform: translateY(40px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 0.8; }
    50% { transform: scale(1.3); opacity: 0.4; }
  }
`;

const container = { display: "flex", flexDirection: "column", gap: 12 };

const topCard = {
  background: "var(--card)",
  border: "1px solid rgba(255,255,255,.06)",
  borderRadius: 16,
  padding: 14,
};

const story = { marginTop: 6, color: "var(--text)", opacity: 0.95, lineHeight: 1.6 };

const chatContainer = {
  flex: 1,
  padding: 12,
  border: "1px solid rgba(255,255,255,.06)",
  borderRadius: 16,
  background: "var(--card)",
  minHeight: 260,
  maxHeight: 420,
  display: "flex",
  flexDirection: "column",
  gap: 10,
  overflowY: "auto",
};

const bubbleBase = {
  padding: "10px 14px",
  borderRadius: 16,
  maxWidth: "85%",
  boxShadow: "0 8px 24px rgba(0,0,0,.22)",
};

const userMessage = {
  ...bubbleBase,
  alignSelf: "flex-end",
  background: "linear-gradient(180deg, var(--accent), var(--accent-2))",
  color: "#101010",
  borderTopRightRadius: 4,
};

const aiMessage = {
  ...bubbleBase,
  alignSelf: "flex-start",
  background: "#121a34",
  color: "var(--text)",
  borderTopLeftRadius: 4,
  border: "1px solid rgba(255,255,255,.06)",
};

const inputSection = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  marginTop: 12,
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  paddingRight: "50px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.15)",
  background: "#0f162f",
  color: "var(--text)",
  fontSize: 15,
};

const stopButton = {
  position: "absolute",
  right: 10,
  top: "50%",
  transform: "translateY(-50%)",
  borderRadius: "50%",
  width: 32,
  height: 32,
  cursor: "pointer",
  fontSize: 18,
  fontWeight: "bold",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const buttonGroup = { display: "flex", flexDirection: "column", gap: 8 };

const empty = {
  textAlign: "center",
  fontSize: 18,
  color: "var(--muted)",
  marginTop: 40,
};

const listeningIndicator = {
  position: "fixed",
  top: 20,
  right: 20,
  background: "rgba(46,139,87,0.95)",
  color: "white",
  padding: "12px 20px",
  borderRadius: 30,
  display: "flex",
  alignItems: "center",
  gap: 10,
  boxShadow: "0 4px 20px rgba(46,139,87,0.4)",
  zIndex: 1000,
};

const pulse = {
  width: 12,
  height: 12,
  borderRadius: "50%",
  background: "#ff4444",
  animation: "pulse 1.5s ease-in-out infinite",
};
