import React, { useState, useEffect } from "react";
import {
  Layout,
  Menu,
  Table,
  Button,
  Modal,
  Input,
  Typography,
  message,
  Space,
  Row,
  Col,
  Card,
  Statistic,
} from "antd";
import {
  HomeOutlined,
  FileExclamationOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  CheckOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Label,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
  LineChart,
  Area,
  Line,
} from "recharts";
// import { CheckOutlined, CloseOutlined } from '@ant-design/icons';

const { TextArea, Search } = Input;
const { Title } = Typography;
const { Sider, Content, Header } = Layout;

const AdminPage = () => {
  const [currentView, setCurrentView] = useState("home");
  const [complaints, setComplaints] = useState([]);
  const [filteredComplaints, setFilteredComplaints] = useState([]);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [customDescription, setCustomDescription] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");
  const [estimatedRestoration, setEstimatedRestoration] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [chartData, setChartData] = useState([]);
  const [counts, setCounts] = useState({ total: 0, resolved: 0, pending: 0 });
  const [issueTypeData, setIssueTypeData] = useState([]);
  const [complaintTypeCounts, setComplaintTypeCounts] = useState({
    text: 0,
    voice: 0,
  });
  const [isRestorationModalVisible, setIsRestorationModalVisible] =
    useState(false);
  const [selectedRestorationComplaint, setSelectedRestorationComplaint] =
    useState(null);
  const [newRestorationTime, setNewRestorationTime] = useState("");
  const [restorationSuccess, setRestorationSuccess] = useState(false);

  const API_BASE = "http://localhost:5003";

  useEffect(() => {
    if (currentView === "home") {
      axios
        .get(`${API_BASE}/admin/complaint-counts`)
        .then((res) => setCounts(res.data))
        .catch(() => message.error("❌ Failed to fetch complaint counts"));

      axios
        .get(`${API_BASE}/admin/complaint-summary`)
        .then((res) => setChartData(res.data))
        .catch(() => message.error("❌ Failed to load chart data"));

      axios
        .get(`${API_BASE}/admin/issue-type-counts`)
        .then((res) => setIssueTypeData(res.data))
        .catch(() => message.error("❌ Failed to load issue type chart"));

      axios
        .get(`${API_BASE}/admin/complaint-type-counts`)
        .then((res) => {
          const counts = { text: 0, voice: 0 };
          res.data.forEach((item) => {
            if (item.complaint_type === "text") counts.text = item.count;
            if (item.complaint_type === "voice") counts.voice = item.count;
          });
          setComplaintTypeCounts(counts);
        })
        .catch(() => message.error("❌ Failed to load complaint type counts"));
    }
  }, [currentView]);

  useEffect(() => {
    axios
      .get(`${API_BASE}/admin/pending-complaints`)
      .then((res) => {
        setComplaints(res.data);
        setFilteredComplaints(res.data);
      })
      .catch(() => message.error("❌ Failed to fetch complaints"));
  }, []);

  const handleSearch = (value) => {
    setSearchText(value);
    const filtered = complaints.filter((c) =>
      c.complaint_id.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredComplaints(filtered);
  };

  const columns = [
    { title: "Complaint ID", dataIndex: "complaint_id", key: "complaint_id" },
    { title: "Issue", dataIndex: "issue_type", key: "issue_type" },
    { title: "Status", dataIndex: "status", key: "status" },
    { title: "Created At", dataIndex: "created_at", key: "created_at" },
    {
      title: "Estimated Restoration",
      key: "estimated_restoration_time",
      render: (_, record) => {
        const isEditing =
          selectedRestorationComplaint?.complaint_id === record.complaint_id;

        if (isEditing) {
          const [amount, unit] = (newRestorationTime || "1 Day").split(" ");

          return (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <select
                value={amount}
                onChange={(e) =>
                  setNewRestorationTime(`${e.target.value} ${unit}`)
                }
              >
                {Array.from({ length: 31 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>

              <select
                value={unit}
                onChange={(e) =>
                  setNewRestorationTime(`${amount} ${e.target.value}`)
                }
              >
                <option value="Hrs">Hrs</option>
                <option value="Day">Day</option>
                <option value="Month">Month</option>
              </select>

              <Button
                type="primary"
                shape="circle"
                icon="✔️"
                onClick={async () => {
                  await handleRestorationSubmit(record);
                }}
                style={{ backgroundColor: "green", color: "#fff" }}
              />

              <Button
                shape="circle"
                icon="❌"
                onClick={() => {
                  setSelectedRestorationComplaint(null);
                  setNewRestorationTime("");
                }}
              />
            </div>
          );
        }

        return (
          <div
            style={{
              cursor: "pointer",
              color: record.estimated_restoration_time ? "#000" : "#aaa",
              border: "1px dashed #ccc",
              padding: "4px 8px",
              minWidth: 140,
            }}
            onClick={() => {
              setSelectedRestorationComplaint(record);
              setNewRestorationTime(
                record.estimated_restoration_time || "1 Day"
              );
            }}
          >
            {record.estimated_restoration_time || "Click to set"}
          </div>
        );
      },
    },

    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Button type="primary" onClick={() => showModal(record)}>
          Update
        </Button>
      ),
    },
  ];

  const showModal = (complaint) => {
    setSelectedComplaint(complaint);
    setCustomDescription("");
    setResolutionNote("");
    setEstimatedRestoration("");
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setSelectedComplaint(null);
  };
  const handleRestorationSubmit = async (record) => {
    try {
      await axios.post(
        `${API_BASE}/admin/set-restoration-time/${record.complaint_id}`,
        { estimated_restoration_time: newRestorationTime }
      );

      const updated = complaints.map((c) =>
        c.complaint_id === record.complaint_id
          ? { ...c, estimated_restoration_time: newRestorationTime }
          : c
      );
      setComplaints(updated);
      setFilteredComplaints(updated);

      // ✅ show the modal!
      setIsRestorationModalVisible(true);
      setRestorationSuccess(true);

      setTimeout(() => {
        setRestorationSuccess(false);
        setIsRestorationModalVisible(false);
      }, 1500);

      setSelectedRestorationComplaint(null);
      setNewRestorationTime("");
    } catch {
      message.error("❌ Failed to update restoration time");
    }
  };

  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    try {
      const response = await axios.post(
        `${API_BASE}/admin/resolve-complaint/${selectedComplaint.complaint_id}`,
        {
          custom_issue_description: customDescription,
          resolution_note: resolutionNote,
        }
      );
      message.success(response.data.message);
      const updated = complaints.filter(
        (c) => c.complaint_id !== selectedComplaint.complaint_id
      );
      setComplaints(updated);
      setFilteredComplaints(
        updated.filter((c) =>
          c.complaint_id.toLowerCase().includes(searchText.toLowerCase())
        )
      );
      setSuccess(true); // ✅ Show success GIF
      setTimeout(() => {
        setSuccess(false);
        handleCancel();
      }, 2000); // Auto-close after 2 seconds
    } catch (error) {
      message.error(
        error.response?.data?.message || "Error occurred while updating"
      );
    }
  };

  const showRestorationModal = (complaint) => {
    setSelectedRestorationComplaint(complaint);
    setNewRestorationTime(complaint.estimated_restoration_time || "");
    setIsRestorationModalVisible(true);
  };

  const renderHomeDashboard = () => (
    <>
      <Title level={3}>Dashboard Overview</Title>
      <Row gutter={16}>
        <Col span={6}>
          <Card style={{ backgroundColor: "rgba(255, 165, 0, 0.1)" }}>
            <Statistic
              title="Total Complaints"
              value={counts.total}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ backgroundColor: "rgba(255, 165, 0, 0.1)" }}>
            <Statistic
              title="Resolved"
              value={counts.resolved}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: "green" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ backgroundColor: "rgba(255, 165, 0, 0.1)" }}>
            <Statistic
              title="Pending"
              value={counts.pending}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: "orange" }}
            />
          </Card>
        </Col>

        {/* 📌 New Combined Card */}
        <Col span={6}>
          <Card
            style={{
              backgroundColor: "rgba(255, 165, 0, 0.1)",
              height: "100%",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                height: "100%",
              }}
            >
              <div style={{ flex: 1, textAlign: "center" }}>
                <Title level={5} style={{ margin: 0 }}>
                  Text
                </Title>
                <Title level={3} style={{ margin: 0 }}>
                  {complaintTypeCounts.text}
                </Title>
              </div>

              {/* Vertical divider */}
              <div
                style={{
                  width: "1px",
                  backgroundColor: "#ccc",
                  height: "50px",
                }}
              />

              <div style={{ flex: 1, textAlign: "center" }}>
                <Title level={5} style={{ margin: 0 }}>
                  Voice
                </Title>
                <Title level={3} style={{ margin: 0 }}>
                  {complaintTypeCounts.voice}
                </Title>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Title level={4} style={{ marginTop: 30 }}>
        Complaint Statistics
      </Title>
      <Row gutter={24}>
        <Col span={12}>
          <Card title="Daily Complaint Trend" bordered={false}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={chartData.slice(-7)}
                margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
              >
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  axisLine={{ stroke: "#ccc" }}
                  tickLine={false}
                >
                  <Label
                    value="Day"
                    offset={-5}
                    position="insideBottom"
                    style={{ textAnchor: "middle", fontWeight: 600 }}
                  />
                </XAxis>

                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12 }}
                  axisLine={{ stroke: "#ccc" }}
                  tickLine={false}
                >
                  <Label
                    value="Complaints"
                    angle={-90}
                    position="insideLeft"
                    style={{ textAnchor: "middle", fontWeight: 600 }}
                  />
                </YAxis>

                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #ccc",
                  }}
                  labelStyle={{ fontWeight: "bold" }}
                />

                {/* ✅ Removed CartesianGrid */}

                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#FF8C00"
                  fill="rgba(255, 165, 0, 0.1)"
                />

                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#FF8C00"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#FF8C00" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col span={12}>
          <Card title="Complaint Distribution by Issue Type" bordered={false}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Tooltip
                  formatter={(value, name, props) => {
                    const issue = props.payload.issue_type || name;
                    return [`${issue}: ${value} complaints`];
                  }}
                  contentStyle={{ fontWeight: "bold" }}
                />
                <Pie
                  data={issueTypeData}
                  dataKey="count"
                  nameKey="issue_type"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) =>
                    `${name} (${(percent * 100).toFixed(0)}%)`
                  }
                >
                  {issueTypeData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        [
                          "#8884d8",
                          "#82ca9d",
                          "#ffc658",
                          "#ff7f50",
                          "#00c49f",
                          "#ffbb28",
                        ][index % 6]
                      }
                    />
                  ))}
                </Pie>
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    </>
  );

  const renderPendingComplaints = () => (
    <>
      <Title level={3}>Pending Complaints</Title>
      <Space direction="vertical" style={{ marginBottom: 20, width: "20%" }}>
        <Search
          placeholder="Search Complaint ID"
          allowClear
          onSearch={handleSearch}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </Space>
      <Table
        columns={columns}
        dataSource={[...filteredComplaints].sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        )}
        rowKey="complaint_id"
        bordered
      />

      <Modal
        title={`Update Complaint: ${selectedComplaint?.complaint_id}`}
        open={isModalVisible}
        footer={null}
        onCancel={handleCancel}
      >
        {success ? (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <img
              src="/tick.gif"
              alt="Success"
              style={{ width: 80, height: 80 }}
            />
            <Title level={4} style={{ color: "green", marginTop: 20 }}>
              Successfully Updated
            </Title>
          </div>
        ) : (
          <>
            <TextArea
              rows={4}
              placeholder="Enter resolution note here..."
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              style={{ marginBottom: "1rem" }}
            />

            <div style={{ marginTop: 24, textAlign: "right" }}>
              <Button
                type="primary"
                onClick={handleSubmit}
                style={{ width: 120 }}
              >
                Submit
              </Button>
              <div style={{ marginTop: 10, textAlign: "right" }}>
                <Button onClick={handleCancel} style={{ width: 80 }}>
                  Cancel
                </Button>
              </div>
            </div>
          </>
        )}
      </Modal>

      <Modal
        title={`Set Restoration Time: ${selectedRestorationComplaint?.complaint_id}`}
        open={isRestorationModalVisible}
        footer={null}
        onCancel={() => setIsRestorationModalVisible(false)}
      >
        {restorationSuccess ? (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <img
              src="/tick.gif"
              alt="Success"
              style={{ width: 80, height: 80 }}
            />
            <Title level={4} style={{ color: "green", marginTop: 20 }}>
              Successfully Updated
            </Title>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <select
              value={newRestorationTime.split(" ")[0] || "1"}
              onChange={(e) =>
                setNewRestorationTime(
                  `${e.target.value} ${
                    newRestorationTime.split(" ")[1] || "Day"
                  }`
                )
              }
              style={{ width: 80 }}
            >
              {Array.from({ length: 31 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>

            <select
              value={newRestorationTime.split(" ")[1] || "Day"}
              onChange={(e) =>
                setNewRestorationTime(
                  `${newRestorationTime.split(" ")[0] || "1"} ${e.target.value}`
                )
              }
              style={{ width: 100 }}
            >
              <option value="Hrs">Hrs</option>
              <option value="Day">Day</option>
              <option value="Month">Month</option>
            </select>

            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={async () => {
                await handleRestorationSubmit(selectedRestorationComplaint);
              }}
              style={{
                backgroundColor: "green",
                borderColor: "green",
                color: "white",
              }}
            />

            <Button
              type="default"
              icon={<CloseOutlined />}
              onClick={() => setIsRestorationModalVisible(false)}
            />
          </div>
        )}
      </Modal>
    </>
  );

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider style={{ background: "#003366" }}>
        <div style={{ padding: "20px", textAlign: "center" }}>
          <img src="/logo.png" alt="Logo" style={{ height: 40 }} />
        </div>

        <div style={{ marginTop: "30px" }}>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[currentView]}
            onClick={({ key }) => {
              if (key !== "spacer") setCurrentView(key);
            }}
            style={{ background: "#003366" }}
            items={[
              { key: "home", icon: <HomeOutlined />, label: "Home" },
              {
                key: "spacer",
                type: "group",
                label: "",
                style: { height: "20px" },
              },
              {
                key: "pending",
                icon: <FileExclamationOutlined />,
                label: "Pending Complaints",
              },
            ]}
          />
        </div>
      </Sider>

      <Layout>
        <Header style={{ background: "#003366", padding: "0 20px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-start",
              alignItems: "center",
              height: "100%",
            }}
          >
            <Title level={4} style={{ color: "#fff", margin: 0 }}>
              {currentView === "pending"
                ? "Admin Dashboard"
                : "Admin Dashboard"}
            </Title>
          </div>
        </Header>

        <Content style={{ margin: 20, background: "#fff", padding: 20 }}>
          {currentView === "home"
            ? renderHomeDashboard()
            : renderPendingComplaints()}
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminPage;
