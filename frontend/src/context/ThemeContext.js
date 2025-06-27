// src/context/ThemeContext.js
import React, { createContext, useState } from "react";

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(false);
  // theme colors
  const theme = {
    background: darkMode ? "#121212" : "#f2f2f2", // Light Gray background
    cardBg: darkMode ? "#1e1e1e" : "#ffffff", // Card content bg
    headerBg: darkMode ? "#000" : "#003366", // Dark Blue header for light theme
    borderColor: darkMode ? "#333" : "#ddd", // Border color
    textColor: "#ffffff", // White
    botBg: darkMode ? "#555" : "#003366", // Bot message bg
    userBg: darkMode ? "#333" : "#0073e6", // User message bg (Light Blue)
    buttonColor: darkMode ? "#00ffcc" : "#FF7D29", // Accent (TWAD Golden Yellow in light)
    titleBg: darkMode ? "#ffffff" : "#003366",
  };

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode, theme }}>
      {children}
    </ThemeContext.Provider>
  );
};
