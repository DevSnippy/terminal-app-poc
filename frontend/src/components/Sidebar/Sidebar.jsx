"use client";

import React, { useState, useEffect } from "react";
import Cookies from "js-cookie";

export default function Sidebar({
  isCollapsed,
  handleToggleCollapse,
  showNewConnectionDropdown,
  handleNewConnectionClick,
  ports,
  handlePortSelect,
  telnetHost,
  telnetPort,
  handleTelnetHostChange,
  handleTelnetPortChange,
  handleTelnetConnect,
  handleClearLog,
  handleSaveLog,
  handleSavedConnectionConnect,
}) {
  const [selectedConnectionType, setSelectedConnectionType] =
    useState("Serial");
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const [saveConnection, setSaveConnection] = useState(false);
  const [saveSessionName, setSaveSessionName] = useState("");
  const [showSavedConnectionsModal, setShowSavedConnectionsModal] =
    useState(false);
  const [savedConnections, setSavedConnections] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  // Added state variables for "Save to Database" modal
  const [showSaveToDatabaseModal, setShowSaveToDatabaseModal] = useState(false);
  const [project, setProject] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("");
  const [deviceVersion, setDeviceVersion] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [databaseError, setDatabaseError] = useState(""); // To display errors
  const [databaseSuccess, setDatabaseSuccess] = useState(""); // To display success message

  // Helper functions to manage cookies
  const getSavedConnections = () => {
    const connections = Cookies.get("savedConnections");
    return connections ? JSON.parse(connections) : [];
  };

  const saveConnectionToCookies = (connection) => {
    const connections = getSavedConnections();
    const exists = connections.find(
      (conn) => conn.sessionName === connection.sessionName,
    );
    if (!exists) {
      connections.push(connection);
      Cookies.set("savedConnections", JSON.stringify(connections), {
        expires: 365,
      });
      setSavedConnections(connections);
    } else {
      alert("A connection with this session name already exists.");
    }
  };

  const removeConnectionFromCookies = (sessionNameToRemove) => {
    let connections = getSavedConnections();
    connections = connections.filter(
      (conn) => conn.sessionName !== sessionNameToRemove,
    );
    Cookies.set("savedConnections", JSON.stringify(connections), {
      expires: 365,
    });
    setSavedConnections(connections);
  };

  // Load saved connections on component mount
  useEffect(() => {
    setSavedConnections(getSavedConnections());
  }, []);

  const handleConnectionTypeChange = (type) => {
    setSelectedConnectionType(type);
  };

  const openSettingsModal = () => {
    setShowSettingsModal(true);
  };

  const closeSettingsModal = () => {
    setShowSettingsModal(false);
  };

  const handleSessionNameSubmit = (e) => {
    e.preventDefault();
    if (sessionName.trim() !== "") {
      document.title = sessionName;
      closeSettingsModal();
    }
  };

  const openSavedConnectionsModal = () => {
    setShowSavedConnectionsModal(true);
  };

  const closeSavedConnectionsModal = () => {
    setShowSavedConnectionsModal(false);
  };

  const handleSavedConnectionSelect = (connection) => {
    handleTelnetHostChange({ target: { value: connection.host } });
    handleTelnetPortChange({ target: { value: connection.port.toString() } });

    handleSavedConnectionConnect(connection.host, connection.port);

    closeSavedConnectionsModal();
  };

  const handleTelnetConnectWithSave = () => {
    if (saveConnection && saveSessionName.trim() === "") {
      setErrorMessage("You must enter a session name");
      return;
    }

    setErrorMessage("");

    handleTelnetConnect();

    if (saveConnection) {
      saveConnectionToCookies({
        sessionName: saveSessionName.trim(),
        host: telnetHost,
        port: telnetPort,
      });
      setSaveConnection(false);
      setSaveSessionName("");
    }
  };

  // Functions for "Save to Database" modal
  const openSaveToDatabaseModal = () => setShowSaveToDatabaseModal(true);
  const closeSaveToDatabaseModal = () => {
    setShowSaveToDatabaseModal(false);
    setDatabaseError("");
    setDatabaseSuccess("");
  };

  const handleSaveToDatabaseSubmit = async (e) => {
    e.preventDefault();
    setDatabaseError("");
    setDatabaseSuccess("");

    // Validate inputs
    if (
      !project.trim() ||
      !location.trim() ||
      !type.trim() ||
      !deviceVersion.trim() ||
      !serialNumber.trim()
    ) {
      setDatabaseError("All fields are required.");
      return;
    }

    // Prepare data
    const data = {
      project: project.trim(),
      location: location.trim(),
      type: type.trim(),
      deviceVersion: deviceVersion.trim(),
      serialNumber: serialNumber.trim(),
    };

    try {
      // Send POST request to the backend
      const response = await fetch("http://localhost:3005/database", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        // Handle HTTP errors
        const errorData = await response.json();
        setDatabaseError(errorData.message || "Failed to save data.");
      } else {
        const result = await response.json();
        setDatabaseSuccess("Data saved successfully.");
        // Reset form fields
        setProject("");
        setLocation("");
        setType("");
        setDeviceVersion("");
        setSerialNumber("");
        // Optionally, close the modal after a delay
        setTimeout(() => {
          closeSaveToDatabaseModal();
        }, 2000);
      }
    } catch (error) {
      setDatabaseError("An error occurred while saving data.");
      console.error("Error saving to database:", error);
    }
  };

  return (
    <>
      <div
        className={`bg-[#1e1e1e] p-6 sticky top-14 h-[calc(100vh-3.5rem)] overflow-auto transition-width duration-300 ${
          isCollapsed ? "w-20" : "w-64"
        } flex flex-col justify-between`}
      >
        <div>
          {/* Settings */}
          <div
            className={`mb-4 flex items-center gap-2 cursor-pointer ${
              isCollapsed ? "justify-center" : ""
            }`}
            onClick={openSettingsModal}
            aria-label="Settings"
          >
            {!isCollapsed && (
              <span className="text-sm font-medium text-white">Settings</span>
            )}
          </div>

          {/* Terminal */}
          <div
            className={`mb-4 flex items-center gap-2 cursor-pointer ${
              isCollapsed ? "justify-center" : ""
            }`}
            onClick={handleToggleCollapse}
            aria-label="Terminal"
          >
            {!isCollapsed && (
              <span className="text-sm font-medium text-white">Terminal</span>
            )}
          </div>

          {/* Files */}
          <div
            className={`mb-4 flex items-center gap-2 cursor-pointer ${
              isCollapsed ? "justify-center" : ""
            }`}
            onClick={handleToggleCollapse}
            aria-label="Files"
          >
            {!isCollapsed && (
              <span className="text-sm font-medium text-white">Files</span>
            )}
          </div>

          {/* New Connection */}
          <div className="mt-6">
            <button
              onClick={handleNewConnectionClick}
              className={`flex items-center gap-2 text-sm font-medium hover:text-[#9cdcfe] p-2 bg-gray-700 rounded w-full ${
                isCollapsed ? "justify-center" : ""
              }`}
              aria-label="New Connection"
            >
              {!isCollapsed && <span>New Connection</span>}
            </button>
            {/* Dropdown Menu */}
            {showNewConnectionDropdown && !isCollapsed && (
              <div className="mt-2 bg-[#2d2d2d] p-4 rounded-md shadow-lg">
                {/* Connection Type Selection */}
                <div className="flex justify-around mb-4">
                  <button
                    onClick={() => handleConnectionTypeChange("Serial")}
                    className={`p-2 rounded ${
                      selectedConnectionType === "Serial"
                        ? "bg-[#3e3e3e] text-white"
                        : "bg-transparent text-[#d4d4d4]"
                    }`}
                  >
                    Serial
                  </button>
                  <button
                    onClick={() => handleConnectionTypeChange("Telnet")}
                    className={`p-2 rounded ${
                      selectedConnectionType === "Telnet"
                        ? "bg-[#3e3e3e] text-white"
                        : "bg-transparent text-[#d4d4d4]"
                    }`}
                  >
                    Telnet
                  </button>
                </div>
                {/* Serial Ports List */}
                {selectedConnectionType === "Serial" && (
                  <div>
                    <h4 className="text-white mb-2">Available Serial Ports:</h4>
                    {ports.length > 0 ? (
                      <ul>
                        {ports.map((port, index) => (
                          <li
                            key={index}
                            className="p-2 hover:bg-[#3e3e3e] cursor-pointer rounded mb-1 text-sm text-gray-200"
                            onClick={() => handlePortSelect(port)}
                          >
                            {port}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-400">
                        No ports available
                      </p>
                    )}
                  </div>
                )}
                {/* Telnet Inputs */}
                {selectedConnectionType === "Telnet" && (
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      placeholder="Hostname"
                      value={telnetHost}
                      onChange={handleTelnetHostChange}
                      className="p-2 bg-[#3e3e3e] rounded text-sm text-white"
                    />
                    <input
                      type="text"
                      placeholder="Port"
                      value={telnetPort}
                      onChange={handleTelnetPortChange}
                      className="p-2 bg-[#3e3e3e] rounded text-sm text-white"
                    />
                    {/* Save Connection Checkbox */}
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="saveConnection"
                        checked={saveConnection}
                        onChange={(e) => setSaveConnection(e.target.checked)}
                        className="mr-2"
                      />
                      <label
                        htmlFor="saveConnection"
                        className="text-sm text-gray-300"
                      >
                        Save Connection
                      </label>
                    </div>
                    {/* Session Name Input (Visible only if Save Connection is checked) */}
                    {saveConnection && (
                      <div className="flex flex-col">
                        <label
                          htmlFor="sessionName"
                          className="text-sm text-gray-300"
                        >
                          Session Name:
                        </label>
                        <input
                          type="text"
                          id="sessionName"
                          value={saveSessionName}
                          onChange={(e) => {
                            setSaveSessionName(e.target.value);
                            if (errorMessage) setErrorMessage("");
                          }}
                          className="mt-1 p-2 bg-[#3e3e3e] rounded text-sm text-white"
                          placeholder="Enter session name"
                          required
                        />
                      </div>
                    )}
                    {errorMessage && (
                      <p className="text-red-500 text-sm mt-1">
                        {errorMessage}
                      </p>
                    )}
                    <button
                      onClick={handleTelnetConnectWithSave}
                      className="mt-2 p-2 bg-blue-500 hover:bg-blue-600 text-red rounded text-sm"
                    >
                      Connect
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Clear Log Button */}
          <div className="mt-6">
            <button
              onClick={handleClearLog}
              className={`w-full flex items-center gap-2 text-sm font-medium hover:text-red-500 p-2 bg-gray-700 rounded ${
                isCollapsed ? "justify-center" : ""
              }`}
              aria-label="Clear Log"
            >
              {!isCollapsed && <span>Clear Log</span>}
            </button>
          </div>

          {/* Save Log Button */}
          <div className="mt-4">
            <button
              onClick={handleSaveLog}
              className={`w-full flex items-center gap-2 text-sm font-medium hover:text-green-500 p-2 bg-gray-700 rounded ${
                isCollapsed ? "justify-center" : ""
              }`}
              aria-label="Save Log"
            >
              {!isCollapsed && <span>Save Log</span>}
            </button>
          </div>

          {/* Save to Database Button */}
          <div className="mt-4">
            <button
              onClick={openSaveToDatabaseModal}
              className={`w-full flex items-center gap-2 text-sm font-medium hover:text-green-500 p-2 bg-gray-700 rounded ${
                isCollapsed ? "justify-center" : ""
              }`}
              aria-label="Save to Database"
            >
              {!isCollapsed && <span>Save to Database</span>}
            </button>
          </div>

          {/* Saved Connections Button */}
          <div className="mt-6">
            <button
              onClick={openSavedConnectionsModal}
              className={`w-full flex items-center gap-2 text-sm font-medium hover:text-yellow-500 p-2 bg-gray-700 rounded ${
                isCollapsed ? "justify-center" : ""
              }`}
              aria-label="Saved Connections"
            >
              {!isCollapsed && <span>Saved Connections</span>}
            </button>
          </div>
        </div>

        {/* Toggle Collapse Button */}
        <div className="mt-6">
          <button
            onClick={handleToggleCollapse}
            className="flex items-center justify-center w-full p-2 bg-gray-700 rounded hover:bg-gray-600"
            aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {/* Custom SVG Icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-5 w-5 text-white transform transition-transform duration-300 ${
                isCollapsed ? "rotate-180" : "rotate-0"
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8.70710678,12 L19.5,12 C19.7761424,12 20,12.2238576 20,12.5 C20,12.7761424 19.7761424,13 19.5,13 L8.70710678,13 L11.8535534,16.1464466 C12.0488155,16.3417088 12.0488155,16.6582912 11.8535534,16.8535534 C11.6582912,17.0488155 11.3417088,17.0488155 11.1464466,16.8535534 L7.14644661,12.8535534 C6.95118446,12.6582912 6.95118446,12.3417088 7.14644661,12.1464466 L11.1464466,8.14644661 C11.3417088,7.95118446 11.6582912,7.95118446 11.8535534,8.14644661 C12.0488155,8.34170876 12.0488155,8.65829124 11.8535534,8.85355339 L8.70710678,12 L8.70710678,12 Z M4,5.5 C4,5.22385763 4.22385763,5 4.5,5 C4.77614237,5 5,5.22385763 5,5.5 L5,19.5 C5,19.7761424 4.77614237,20 4.5,20 C4.22385763,20 4,19.7761424 4,19.5 L4,5.5 Z" />
            </svg>
            {!isCollapsed && (
              <span className="ml-2 text-sm text-white">Collapse</span>
            )}
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-[#1e1e1e] p-6 rounded-lg shadow-lg w-80">
            <h2 className="text-xl text-white mb-4">Settings</h2>
            <form
              onSubmit={handleSessionNameSubmit}
              className="flex flex-col gap-4"
            >
              <div>
                <label htmlFor="sessionName" className="text-sm text-gray-300">
                  Session Name:
                </label>
                <input
                  type="text"
                  id="sessionName"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  className="mt-1 p-2 w-full bg-[#3e3e3e] rounded text-sm text-white"
                  placeholder="Enter session name"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeSettingsModal}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Saved Connections Modal */}
      {showSavedConnectionsModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-[#1e1e1e] p-6 rounded-lg shadow-lg w-80 max-h-[80vh] overflow-auto">
            <h2 className="text-xl text-white mb-4">Saved Connections</h2>
            {savedConnections.length > 0 ? (
              <ul>
                {savedConnections.map((conn, index) => (
                  <li
                    key={index}
                    className="flex justify-between items-center p-2 bg-[#2d2d2d] rounded mb-2"
                  >
                    <div>
                      <p className="text-sm text-gray-200">
                        <strong>{conn.sessionName}</strong>
                      </p>
                      <p className="text-sm text-gray-200">Host: {conn.host}</p>
                      <p className="text-sm text-gray-200">Port: {conn.port}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => handleSavedConnectionSelect(conn)}
                        className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs"
                      >
                        Connect
                      </button>
                      <button
                        onClick={() =>
                          removeConnectionFromCookies(conn.sessionName)
                        }
                        className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">
                No saved connections found.
              </p>
            )}
            <div className="flex justify-end mt-4">
              <button
                onClick={closeSavedConnectionsModal}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save to Database Modal */}
      {showSaveToDatabaseModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-[#1e1e1e] p-6 rounded-lg shadow-lg w-80">
            <h2 className="text-xl text-white mb-4">Save to Database</h2>
            <form
              onSubmit={handleSaveToDatabaseSubmit}
              className="flex flex-col gap-4"
            >
              <div>
                <label htmlFor="project" className="text-sm text-gray-300">
                  Project:
                </label>
                <input
                  type="text"
                  id="project"
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  className="mt-1 p-2 w-full bg-[#3e3e3e] rounded text-sm text-white"
                  placeholder="Enter project name"
                  required
                />
              </div>
              <div>
                <label htmlFor="location" className="text-sm text-gray-300">
                  Location:
                </label>
                <input
                  type="text"
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="mt-1 p-2 w-full bg-[#3e3e3e] rounded text-sm text-white"
                  placeholder="Enter location"
                  required
                />
              </div>
              <div>
                <label htmlFor="type" className="text-sm text-gray-300">
                  Type:
                </label>
                <input
                  type="text"
                  id="type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="mt-1 p-2 w-full bg-[#3e3e3e] rounded text-sm text-white"
                  placeholder="Enter type"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="deviceVersion"
                  className="text-sm text-gray-300"
                >
                  Device Version:
                </label>
                <input
                  type="text"
                  id="deviceVersion"
                  value={deviceVersion}
                  onChange={(e) => setDeviceVersion(e.target.value)}
                  className="mt-1 p-2 w-full bg-[#3e3e3e] rounded text-sm text-white"
                  placeholder="Enter device version"
                  required
                />
              </div>
              <div>
                <label htmlFor="serialNumber" className="text-sm text-gray-300">
                  Serial Number:
                </label>
                <input
                  type="text"
                  id="serialNumber"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="mt-1 p-2 w-full bg-[#3e3e3e] rounded text-sm text-white"
                  placeholder="Enter serial number"
                  required
                />
              </div>
              {/* Display success or error messages */}
              {databaseError && (
                <p className="text-red-500 text-sm mt-1">{databaseError}</p>
              )}
              {databaseSuccess && (
                <p className="text-green-500 text-sm mt-1">{databaseSuccess}</p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeSaveToDatabaseModal}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
