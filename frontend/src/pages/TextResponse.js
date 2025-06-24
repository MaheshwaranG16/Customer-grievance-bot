import React, { useState } from "react";
import axios from "axios";
import { Input, Card, Select, List, Spin } from "antd";
import {
  PhoneOutlined,
  MessageOutlined,
  SendOutlined,
} from "@ant-design/icons";

const { Option } = Select;

const ChatGrievance = () => {
  const [messages, setMessages] = useState([]);
  const [step, setStep] = useState("start");
  const [beneficiaryNo, setBeneficiaryNo] = useState("");
  const [input, setInput] = useState("");
  const [customer, setCustomer] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [issue, setIssue] = useState("");
  const [complaintType, setComplaintType] = useState("text");
  const [isCalling, setIsCalling] = useState(false);

  const API_BASE = "http://localhost:5003";

  const addBotMessage = (text) =>
    setMessages((prev) => [...prev, { type: "bot", text }]);

  const addUserMessage = (text) =>
    setMessages((prev) => [...prev, { type: "user", text }]);

  const handleInputSubmit = async () => {
    if (!input.trim()) return;
    addUserMessage(input);

    if (step === "start") {
      setBeneficiaryNo(input);
      try {
        const res = await axios.get(`${API_BASE}/fetch-customer/${input}`);
        const data = { ...res.data, beneficiary_no: input };
        setCustomer(data);
        addBotMessage(
          `👋 Hello ${data.name}, your Meter ID is ${data.meter_id}.`
        );
        addBotMessage(
          "Would you prefer to continue via <strong>Text</strong> or <strong>Call</strong>?"
        );
        setStep("select_type");
      } catch {
        addBotMessage(
          "❌ Customer not found. Please enter a valid Beneficiary Number."
        );
      }
    } else if (step === "choice") {
      if (input === "1") {
        try {
          const res = await axios.get(
            `${API_BASE}/pending-complaints/${beneficiaryNo}`
          );
          const data = res.data;
          if (data.pending_complaints?.length > 0) {
            setComplaints(data.pending_complaints);
            addBotMessage(
              `📄 *Pending Complaint Summary:*\n\n${data.summary_text}`
            );
            addBotMessage("📩 SMS has been sent to your registered number.");
          } else {
            addBotMessage("✅ You have no pending complaints.");
          }
          setStep("done");
        } catch {
          addBotMessage("❌ Error fetching complaints.");
        }
      } else if (input === "2") {
        addBotMessage("📝 Please select the issue from the dropdown below.");
        setStep("select_issue");
      } else {
        addBotMessage("⚠️ Please reply with 1 or 2.");
      }
    }

    setInput("");
  };

  const handleTypeSelect = (value) => {
    setComplaintType(value);
    addUserMessage(value === "text" ? "Text" : "Call");

    if (value === "call") {
      setIsCalling(true);
      addBotMessage("📞 Initiating a call. Please wait...");
      setTimeout(() => {
        setIsCalling(false);
        addBotMessage(
          "✅ Our representative is calling you shortly. Thank you!"
        );
        setStep("done");
      }, 3000);
    } else {
      addBotMessage(
        "Would you like to:\n1. View previous complaints\n2. Register new complaint?"
      );
      setStep("choice");
    }
  };

  const handleIssueSelect = async (value) => {
    setIssue(value);
    addUserMessage(value);

    const payload = {
      beneficiary_no: customer.beneficiary_no,
      name: customer.name,
      phone: customer.phone,
      meter_id: customer.meter_id,
      customer_type: customer.customer_type,
      account_number: customer.account_number,
      issue_type: value,
      complaint_type: "text",
    };

    try {
      const res = await axios.post(`${API_BASE}/new-complaint`, payload);
      addBotMessage(
        `✅ Complaint registered successfully! Complaint ID: ${res.data.complaint_id}`
      );
      addBotMessage(
        "📞 You will receive a callback shortly with a resolution summary."
      );
    } catch {
      addBotMessage("❌ Error registering complaint.");
    }
    setStep("done");
  };

  const ISSUE_OPTIONS = [
    "Over billed",
    "Meter stopped",
    "Bill not received",
    "Power failure",
    "Voltage fluctuation",
  ];

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        background: "#121212",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Card
        title="⚡ Customer Service Chatbot"
        headStyle={{
          background: "#000",
          color: "#fff",
          borderBottom: "1px solid #333",
        }}
        bodyStyle={{
          background: "#1e1e1e",
          color: "#fff",
          height: "calc(100vh - 64px)",
          display: "flex",
          flexDirection: "column",
          padding: 0,
        }}
        style={{
          height: "100vh",
          maxWidth: 450,
          width: "100%",
          margin: 0,
          borderRadius: 0,
          background: "#1e1e1e", // 👈 ensures card outer background is dark
          border: "1px solid #333", // optional: darker border
        }}
      >
        {/* Chat message area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
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
                    background: msg.type === "user" ? "#333" : "#555",
                    color: "#fff",
                    padding: "10px 14px",
                    borderRadius: 12,
                    maxWidth: "80%",
                    whiteSpace: "pre-wrap",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                  }}
                >
                  <span dangerouslySetInnerHTML={{ __html: msg.text }} />
                </div>
              </List.Item>
            )}
          />
        </div>

        {/* Input area */}
        <div style={{ padding: "10px", borderTop: "1px solid #333" }}>
          {isCalling && (
            <div style={{ textAlign: "center", marginBottom: 10 }}>
              <Spin tip="Calling..." size="large" />
            </div>
          )}

          {step === "select_type" && (
            <Select
              placeholder="Select mode: Text or Call"
              style={{ width: "100%", marginBottom: 10 }}
              onChange={handleTypeSelect}
            >
              <Option value="text">
                <MessageOutlined /> Text
              </Option>
              <Option value="call">
                <PhoneOutlined /> Call
              </Option>
            </Select>
          )}

          {step === "select_issue" && (
            <Select
              placeholder="Select an issue"
              style={{ width: "100%", marginBottom: 10 }}
              onChange={handleIssueSelect}
            >
              {ISSUE_OPTIONS.map((opt) => (
                <Option key={opt} value={opt}>
                  {opt}
                </Option>
              ))}
            </Select>
          )}

          {["start", "choice"].includes(step) && !isCalling && (
            <Input.Search
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onSearch={handleInputSubmit}
              enterButton={<SendOutlined />}
              placeholder={
                step === "start" ? "Enter Beneficiary Number" : "Type 1 or 2"
              }
            />
          )}
        </div>
      </Card>
    </div>
  );
};

export default ChatGrievance;
