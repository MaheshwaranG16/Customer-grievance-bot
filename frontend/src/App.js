import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import TextResponse from "./pages/TextResponse";
import "antd/dist/reset.css"; // or 'antd/dist/antd.css' for older versions

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<TextResponse />} />
      </Routes>
    </Router>
  );
}

export default App;
