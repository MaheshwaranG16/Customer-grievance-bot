import React, { useState, useRef, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, Button, Switch, List } from "antd";
import {
  ReloadOutlined,
  BulbOutlined,
  BulbFilled,
  AudioOutlined,
} from "@ant-design/icons";
import { ThemeContext } from "../context/ThemeContext";
import "./TextResponse.css";
import stringSimilarity from "string-similarity";

const Voice = () => {
  const [isListening, setIsListening] = useState(false);
  const [timer, setTimer] = useState(0);
  const [cancelled, setCancelled] = useState(false);
  const [step, setStep] = useState("await_beneficiary");
  const [matchedBeneficiary, setMatchedBeneficiary] = useState(null);
  const [messages, setMessages] = useState([]);
  const [expectingCustomIssue, setExpectingCustomIssue] = useState(false);

  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const startY = useRef(null);
  const tapTimeoutRef = useRef(null);
  const tapStartTime = useRef(null);
  const messageSentRef = useRef(false);
  const chatContainerRef = useRef(null);
  const [issueOptions, setIssueOptions] = useState([]);

  const { darkMode, setDarkMode, theme } = useContext(ThemeContext);

  const navigate = useNavigate();
  const API_BASE = "http://localhost:5003";

  useEffect(() => {
    if (!messageSentRef.current) {
      setMessages([
        {
          type: "bot",
          text: "👋 Hi, please speak your Beneficiary Number to proceed.",
        },
      ]);
      messageSentRef.current = true;
    }
  }, []);

  const handleRefresh = () => {
    navigate("/");
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleVoiceIssueInput = async (inputText) => {
    const cleaned = inputText
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .trim();

    const matches = stringSimilarity.findBestMatch(
      cleaned,
      issueOptions.map((i) => i.toLowerCase())
    );

    const { bestMatch } = matches;
    const bestScore = bestMatch.rating;
    const bestMatchText = bestMatch.target;

    const MATCH_THRESHOLD = 0.6;
    const matchedIssue =
      bestScore >= MATCH_THRESHOLD
        ? issueOptions.find((i) => i.toLowerCase() === bestMatchText)
        : "Others";

    const isCustom = matchedIssue === "Others";
    const customDesc = isCustom && inputText?.trim() ? inputText.trim() : null;

    // 🧠 Show matched issue or custom fallback message
    setMessages((prev) => [
      ...prev,
      {
        type: "user",
        text: isCustom
          ? customDesc
            ? "📝 Couldn't match exactly. Registered your description as a custom issue."
            : "❌ Could not understand the issue. Please try again."
          : matchedIssue,
      },
    ]);

    if (isCustom && !customDesc) {
      return; // don't proceed if custom issue is null/empty
    }

    await registerComplaint(matchedBeneficiary, matchedIssue, customDesc);
  };

  const handleUserTranscript = (text) => {
    if (!text || cancelled) return;

    const normalized = text
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9 ]/gi, "");

    if (expectingCustomIssue) {
      setExpectingCustomIssue(false);
      setMessages((prev) => [...prev, { type: "user", text }]); // Only show raw input when entering custom issue
      registerComplaint(matchedBeneficiary, normalized);
      return;
    }

    // ✅ Only add raw user message if NOT in these input steps
    if (step !== "await_beneficiary" && step !== "await_issue") {
      setMessages((prev) => [...prev, { type: "user", text }]);
    }

    handleStep(normalized);
  };

  const startRecording = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support speech recognition.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = true;

    recognition.onresult = (e) =>
      handleUserTranscript(e.results[0][0].transcript);
    recognition.onerror = () =>
      setMessages((m) => [
        ...m,
        { type: "bot", text: "❌ Error capturing voice" },
      ]);
    recognition.onend = () => {
      setIsListening(false);
      stopTimer();
    };

    recognitionRef.current = recognition;
    setCancelled(false);
    recognition.start();
    setIsListening(true);
    startTimer();
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    stopTimer();
  };

  const startTimer = () => {
    clearInterval(timerRef.current);
    setTimer(0);
    timerRef.current = setInterval(() => setTimer((prev) => prev + 1), 1000);
  };

  const stopTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const mapVoiceToChoice = (input) => {
    const cleaned = input
      .toLowerCase()
      .replace(/[^\w\s]/gi, "")
      .trim();

    const words = cleaned.split(/\s+/);
    const fullPhrase = words.join("");

    const choiceMap = {
      view: [
        "view",
        "viewcomplaints",
        "viewcomplaint",
        "check",
        "checkcomplaints",
        "seecomplaints",
        "oldcomplaints",
        "previouscomplaints",
        "pastcomplaints",
      ],
      register: [
        "register",
        "raisecomplaint",
        "filecomplaint",
        "newcomplaint",
        "logcomplaint",
        "submit",
        "complaint",
      ],
      continue: [
        "1",
        "one",
        "optionone",
        "first",
        "yes",
        "continue",
        "ok",
        "go",
      ],
      exit: [
        "2",
        "two",
        "optiontwo",
        "second",
        "no",
        "exit",
        "stop",
        "quit",
        "end",
        "cancel",
      ],
    };

    for (const [choice, variants] of Object.entries(choiceMap)) {
      for (const variant of variants) {
        if (
          fullPhrase.includes(variant) ||
          words.some((w) => variant.includes(w) || w.includes(variant))
        ) {
          return choice;
        }
      }
    }

    return null;
  };

  const handleMicPress = (e) => {
    startY.current = e.touches?.[0]?.clientY || e.clientY;
    tapStartTime.current = Date.now();
    tapTimeoutRef.current = setTimeout(startRecording, 150);
  };

  const handleMicRelease = (e) => {
    const endY = e.changedTouches?.[0]?.clientY || e.clientY;
    clearTimeout(tapTimeoutRef.current);
    const duration = Date.now() - tapStartTime.current;

    if (isListening) {
      if (startY.current - endY > 50) {
        setMessages((m) => [
          ...m,
          { type: "bot", text: "❌ Recording canceled" },
        ]);
        setCancelled(true);
      }
      stopRecording();
    } else if (duration < 150) {
      startRecording();
    }
  };

  const handleStep = async (normalized) => {
    try {
      const mappedChoice = mapVoiceToChoice(normalized);

      if (step === "await_beneficiary") {
        const res = await fetch(`${API_BASE}/fetch-customer/${normalized}`);
        if (!res.ok) throw new Error("Beneficiary not found");

        const data = await res.json();
        const matchedBen =
          data.matched_beneficiary_no || normalized.toUpperCase();
        setMatchedBeneficiary(matchedBen);

        setMessages((prev) => [
          ...prev,
          { type: "user", text: matchedBen },
          {
            type: "bot",
            text: `👋 Hello ${data.name}, your Meter ID is ${data.meter_id}.`,
          },
        ]);

        setStep("await_option");

        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              type: "bot",
              text: "Would you like to:\n✔ say 'view complaints'\n✔ or say 'register' to raise a new one.",
            },
          ]);
        }, 1500);
      } else if (step === "await_option") {
        if (mappedChoice === "view") {
          fetchPreviousComplaints(matchedBeneficiary);
        } else if (mappedChoice === "register") {
          const res = await axios.get(`${API_BASE}/issue-types`);
          const seen = new Set();
          const issues = res.data.filter((item) => {
            const lowered = item.toLowerCase();
            if (lowered === "others" || seen.has(lowered)) return false;
            seen.add(lowered);
            return true;
          });
          setIssueOptions(issues);

          const issueListText = issues.map((i) => `• ${i}`).join("\n");

          setMessages((prev) => [
            ...prev,
            {
              type: "bot",
              text: `📝 Please say the issue (e.g., one of the following):\n${issueListText}`,
            },
          ]);
          setStep("await_issue");
        } else {
          setMessages((prev) => [
            ...prev,
            {
              type: "bot",
              text: `⚠ Unrecognized response: "${normalized}". Please say 'view complaints' or 'register'.`,
            },
          ]);
        }
      } else if (step === "await_continue") {
        if (mappedChoice === "register") {
          const res = await axios.get(`${API_BASE}/issue-types`);
          const issues = res.data.filter(
            (item) => item.toLowerCase() !== "others"
          );
          setIssueOptions(issues);

          const issueListText = issues.map((i) => `• ${i}`).join("\n");

          setMessages((prev) => [
            ...prev,
            {
              type: "bot",
              text: `📝 Please say the issue (e.g., one of the following):\n${issueListText}`,
            },
          ]);
          setStep("await_issue");
        } else if (mappedChoice === "exit") {
          setMessages((prev) => [
            ...prev,
            {
              type: "bot",
              text: "👋 Thank you. Session ended.",
            },
          ]);
          setStep("done");
        } else {
          setMessages((prev) => [
            ...prev,
            {
              type: "bot",
              text: `⚠ Unrecognized response: "${normalized}". Please say something like 'register' or 'exit'.`,
            },
          ]);
        }
      } else if (step === "await_issue") {
        await handleVoiceIssueInput(normalized);
      }
    } catch (err) {
      console.error("❌ Error:", err);
      setMessages((prev) => [
        ...prev,
        {
          type: "bot",
          text: "❌ Could not process your response. Please try again...",
        },
      ]);
    }
  };

  const fetchPreviousComplaints = async (beneficiaryNo) => {
    try {
      const res = await fetch(
        `${API_BASE}/pending-complaints/${beneficiaryNo}`
      );
      const data = await res.json();
      if (data.pending_complaints?.length > 0) {
        setMessages((m) => [
          ...m,
          {
            type: "bot",
            text:
              "📄 You have " +
              data.pending_complaints.length +
              " pending complaint(s).\n📩 SMS sent to your registered number.",
          },
        ]);
      } else {
        setMessages((m) => [
          ...m,
          { type: "bot", text: "✅ You have no pending complaints." },
        ]);
      }
    } catch {
      setMessages((m) => [
        ...m,
        { type: "bot", text: "❌ Error fetching complaints." },
      ]);
    } finally {
      setStep("await_continue");
      setTimeout(() => {
        setMessages((m) => [
          ...m,
          {
            type: "bot",
            text: "🔄 Would you like to continue?\n✔ Say 'register' to file a new complaint\n✔ Or say 'exit' to end the session.",
          },
        ]);
      }, 2000);
    }
  };

  const registerComplaint = async (
    beneficiaryNo,
    issueType,
    customDesc = null
  ) => {
    try {
      const payload = {
        beneficiary_no: beneficiaryNo,
        issue_type: issueType,
        complaint_type: "voice",
      };
      if (customDesc) payload.custom_issue_description = customDesc;

      const res = await fetch(`${API_BASE}/new-complaint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setMessages((m) => [
          ...m,
          {
            type: "bot",
            text: `✅ Complaint registered successfully! Complaint ID: ${data.complaint_id}`,
          },
        ]);
        setTimeout(() => {
          setMessages((m) => [
            ...m,
            {
              type: "bot",
              text: "📩 You will receive a resolution update via SMS.",
            },
          ]);
        }, 1500);
      } else {
        setMessages((m) => [
          ...m,
          { type: "bot", text: "❌ Failed to register complaint." },
        ]);
      }
    } catch {
      setMessages((m) => [
        ...m,
        { type: "bot", text: "❌ Server error while registering complaint." },
      ]);
    } finally {
      setStep("await_continue");
      setTimeout(() => {
        setMessages((m) => [
          ...m,
          {
            type: "bot",
            text: "🔄 Would you like to continue?\n✔ Say 'register' to file a new complaint\n✔ Or say 'exit' to end the session.",
          },
        ]);
      }, 2000);
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        background: theme.background,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        color: "#ffffff",
        position: "relative",
      }}
    >
      <Card
        title={
          <div style={{ display: "flex", alignItems: "center" }}>
            <img
              src="/logo.png"
              alt="Logo"
              style={{ maxWidth: 100, height: 35 }}
            />
            <span style={{ marginLeft: 30, fontWeight: 600 }}>
              Grievance Bot
            </span>
          </div>
        }
        extra={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Button
              type="text"
              icon={<ReloadOutlined />}
              title="Start new session"
              style={{ color: theme.textColor }}
              onClick={handleRefresh}
            />
            <Switch
              checked={darkMode}
              onChange={setDarkMode}
              checkedChildren={<BulbFilled />}
              unCheckedChildren={<BulbOutlined />}
              title="Toggle light/dark mode"
            />
          </div>
        }
        headStyle={{ background: theme.headerBg, color: theme.textColor }}
        bodyStyle={{
          background: theme.cardBg,
          color: theme.textColor,
          display: "flex",
          flexDirection: "column",
          height: "calc(90vh - 64px)",
          padding: 0,
        }}
        style={{
          height: "90vh",
          width: "100%",
          maxWidth: 450,
          borderRadius: 0,
          background: theme.cardBg,
          border: `1px solid ${theme.borderColor}`,
        }}
      >
        {/* Chat Display Area */}
        <div
          ref={chatContainerRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px 16px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <List
            dataSource={messages}
            renderItem={(msg) => (
              <List.Item
                style={{
                  justifyContent:
                    msg.type === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    backgroundColor:
                      msg.type === "user" ? theme.userBg : theme.botBg,
                    color: "#ffffff",
                    padding: "10px 14px",
                    borderRadius: 12,
                    maxWidth: "80%",
                    whiteSpace: "pre-wrap",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                  }}
                >
                  <span dangerouslySetInnerHTML={{ __html: msg.text }} />
                </div>
              </List.Item>
            )}
          />
        </div>

        <hr
          style={{
            margin: 0,
            width: "100%",
            borderTop: `1px solid ${theme.borderColor}`,
            borderBottom: "none",
          }}
        />

        {/* Voice Control Section */}
        {step !== "done" && (
          <div
            style={{
              height: 200,
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-end",
              position: "relative",
              paddingBottom: 12,
            }}
          >
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              {isListening && (
                <div
                  style={{
                    fontSize: 14,
                    color: theme.titleBg,
                    fontWeight: 500,
                    marginBottom: 4,
                  }}
                >
                  ⏱️ {timer}s Recording...
                </div>
              )}
              <div
                style={{
                  fontSize: 13,
                  color: darkMode ? "#aaa" : "#888",
                  fontWeight: 500,
                }}
              >
                Tap to record, Re-tap to cancel
              </div>
            </div>

            {/* Mic Button */}
            <div
              role="button"
              aria-label="Hold to record"
              onMouseDown={handleMicPress}
              onMouseUp={handleMicRelease}
              onTouchStart={handleMicPress}
              onTouchEnd={handleMicRelease}
              style={{
                width: 90,
                height: 90,
                borderRadius: "50%",
                backgroundColor: theme.buttonColor,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                boxShadow: isListening
                  ? "0 0 20px 6px rgba(255,165,0,0.5)"
                  : "0 0 10px rgba(0,0,0,0.2)",
                cursor: "pointer",
                animation: isListening ? "pulse-glow 1.5s infinite" : "none",
                transition: "all 0.3s ease-in-out",
                touchAction: "none",
                zIndex: 1,
              }}
            >
              <AudioOutlined style={{ fontSize: 32, color: "#fff" }} />
            </div>

            {/* Footer */}
            <div
              style={{
                marginTop: 12,
                textAlign: "center",
                color: "#ffa500",
                fontSize: 12,
                fontWeight: 500,
                zIndex: 2,
              }}
            >
              ©2025 Bonton Software
            </div>
          </div>
        )}
      </Card>

      <style>
        {`
        @keyframes pulse-glow {
          0% { box-shadow: 0 0 0 0 rgba(255,165,0, 0.7); }
          70% { box-shadow: 0 0 0 15px rgba(255,165,0, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255,165,0, 0); }
        }
      `}
      </style>
    </div>
  );
};

export default Voice;
