import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Button, Switch } from "antd";
import {
  MessageOutlined,
  HomeFilled,
  BulbFilled,
  BulbOutlined,
  AudioOutlined,
} from "@ant-design/icons";
import { ThemeContext } from "../context/ThemeContext"; // ✅ Import context
import "./TextResponse.css";

const Home = () => {
  const navigate = useNavigate();

  // ✅ Get darkMode and theme from context
  const { darkMode, setDarkMode, theme } = useContext(ThemeContext);

  const handleMessageClick = () => {
    navigate("/Text");
  };

  const handleVoiceClick = () => {
    navigate("/Voice");
  };

  const handleAdminLogin = () => {
    navigate("/admin");
  };

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        background: theme.background,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
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
            <span style={{ marginLeft: 30 }}>Grievance Bot</span>
          </div>
        }
        extra={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Button
              type="text"
              icon={<HomeFilled />}
              title="Admin Login"
              style={{ color: theme.textColor }}
              onClick={handleAdminLogin}
            />
            <Switch
              checkedChildren={<BulbFilled />}
              unCheckedChildren={<BulbOutlined />}
              onChange={(checked) => setDarkMode(checked)}
              checked={darkMode}
              title="Toggle light/dark mode"
            />
          </div>
        }
        headStyle={{
          background: theme.headerBg,
          color: theme.textColor,
          borderBottom: `1px solid ${theme.borderColor}`,
        }}
        bodyStyle={{
          background: theme.cardBg,
          height: "calc(90vh - 64px)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
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
        <div style={{ width: "80%", textAlign: "center" }}>
          <h2 style={{ color: theme.titleBg, marginBottom: 30 }}>
            Welcome to Bonton Grievance Bot
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <Button
              icon={<MessageOutlined />}
              type="primary"
              size="middle"
              block
              onClick={handleMessageClick}
              style={{
                backgroundColor: theme.botBg,
                borderColor: theme.botBg,
              }}
            >
              Message
            </Button>

            <Button
              icon={<AudioOutlined />}
              type="primary"
              size="middle"
              block
              onClick={handleVoiceClick}
              style={{
                backgroundColor: theme.buttonColor,
                borderColor: theme.buttonColor,
                color: darkMode ? "#000" : "#000",
              }}
            >
              Voice
            </Button>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 1,
            textAlign: "center",
            color: "orange",
            fontSize: 12,
            width: "100%",
            fontWeight: "500",
          }}
        >
          ©2025 Bonton Software
        </div>
      </Card>
    </div>
  );
};

export default Home;
