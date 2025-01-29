"use client";

import React, { useState, useEffect, useRef } from "react";
import wsManager from "../services/wsService";
import Navbar from "../components/Navbar/Navbar";
import Sidebar from "../components/Sidebar/Sidebar";
import TerminalOutput from "../components/Terminal/TerminalOutput";
import TerminalPrompt from "../components/Terminal/TerminalPrompt";
import QuickCommands from "../components/QuickCommands/QuickCommands";

function EditorModal({ show, onClose, onSave, filePath, initialContent }) {
  const [content, setContent] = useState(initialContent || "");
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedContent, setHighlightedContent] = useState("");
  const [searchMatches, setSearchMatches] = useState([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

  const textareaRef = useRef(null);
  const highlightRef = useRef(null);

  useEffect(() => {
    setContent(initialContent || "");
    setSearchTerm("");
    setSearchMatches([]);
    setCurrentMatchIndex(-1);
  }, [initialContent, show]);

  useEffect(() => {
    if (!searchTerm) {
      let plainContent = escapeHtml(content);
      // Do not replace \n with <br>, we rely on pre-wrap now
      setHighlightedContent(plainContent);
      setSearchMatches([]);
      setCurrentMatchIndex(-1);
      return;
    }

    const matches = [];
    const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escapedTerm, "gi");
    let match;

    while ((match = regex.exec(content)) !== null) {
      matches.push({ start: match.index, end: match.index + match[0].length });
    }

    if (matches.length === 0) {
      // No matches, just show normal content
      let plainContent = escapeHtml(content);
      setHighlightedContent(plainContent);
      setSearchMatches([]);
      setCurrentMatchIndex(-1);
      return;
    }

    let highlighted = "";
    let lastIndex = 0;
    matches.forEach((m) => {
      highlighted += escapeHtml(content.slice(lastIndex, m.start));
      highlighted += `<mark>${escapeHtml(content.slice(m.start, m.end))}</mark>`;
      lastIndex = m.end;
    });
    highlighted += escapeHtml(content.slice(lastIndex));

    // No newline replacement here either; rely on pre-wrap.
    setHighlightedContent(highlighted);
    setSearchMatches(matches);
    setCurrentMatchIndex(0);
  }, [searchTerm, content]);

  const handleSave = () => {
    onSave(content);
  };

  const handleNextMatch = () => {
    if (searchMatches.length === 0) return;
    setCurrentMatchIndex((prev) =>
      prev < searchMatches.length - 1 ? prev + 1 : 0,
    );
  };

  const handlePrevMatch = () => {
    if (searchMatches.length === 0) return;
    setCurrentMatchIndex((prev) =>
      prev > 0 ? prev - 1 : searchMatches.length - 1,
    );
  };

  const escapeHtml = (unsafe) => {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const handleScroll = () => {
    if (highlightRef.current && textareaRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
      style={{ backdropFilter: "blur(4px)" }}
    >
      <div className="bg-[#1e1e1e] text-[#d4d4d4] p-4 rounded w-3/4 h-3/4 flex flex-col">
        <h2 className="text-xl font-bold mb-2">Editing: {filePath}</h2>
        <div className="mb-2 flex gap-2">
          <input
            type="text"
            placeholder="Search..."
            className="px-2 py-1 rounded bg-[#2d2d2d] text-[#d4d4d4] border border-[#555]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button
            className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded"
            onClick={handlePrevMatch}
            disabled={searchMatches.length === 0}
          >
            Prev
          </button>
          <button
            className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded"
            onClick={handleNextMatch}
            disabled={searchMatches.length === 0}
          >
            Next
          </button>
        </div>
        <div className="flex-1 overflow-auto relative">
          {/* Highlighted Content */}
          <div
            ref={highlightRef}
            className="absolute top-0 left-0 w-full h-full p-2 pointer-events-none break-words"
            style={{
              backgroundColor: "#2d2d2d",
              color: "#d4d4d4",
              overflow: "hidden",
              whiteSpace: "pre-wrap", // Important: use pre-wrap to preserve newlines
            }}
            dangerouslySetInnerHTML={{ __html: highlightedContent }}
          ></div>
          {/* Textarea for editing */}
          <textarea
            ref={textareaRef}
            className="w-full h-full bg-transparent p-2 z-10"
            style={{
              position: "relative",
              color: "transparent",
              caretColor: "#ffffff",
              resize: "none",
              whiteSpace: "pre-wrap",
              wordWrap: "break-word",
              background: "transparent",
            }}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onScroll={handleScroll}
          />
        </div>
        <div className="mt-2 flex justify-end gap-2">
          <button
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded"
            onClick={onClose}
          >
            Close
          </button>
          <button
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TerminalComponent() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [command, setCommand] = useState("");
  const [output, setOutput] = useState([]);
  const [ports, setPorts] = useState([]);
  const [showNewConnectionDropdown, setShowNewConnectionDropdown] =
    useState(false);
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [telnetHost, setTelnetHost] = useState("");
  const [telnetPort, setTelnetPort] = useState("");
  const [telnetConnected, setTelnetConnected] = useState(false);

  const [isQuickCommandsOpen, setIsQuickCommandsOpen] = useState(false);

  const [connectionStatus, setConnectionStatus] = useState({
    ports: "disconnected",
    terminal: "disconnected",
    telnet: "disconnected",
  });

  const [tabPressCount, setTabPressCount] = useState(0);
  const [lastCommandSent, setLastCommandSent] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isSuggestionListVisible, setIsSuggestionListVisible] = useState(false);
  const [loadingAutocomplete, setLoadingAutocomplete] = useState(false);

  const messagesEndRef = useRef(null);

  const [notification, setNotification] = useState({ message: "", type: "" });

  // States for the vi editor
  const [showEditor, setShowEditor] = useState(false);
  const [editingFile, setEditingFile] = useState("");
  const [editorContent, setEditorContent] = useState("");

  const appendCommand = (cmd) => {
    setCommand((prev) => (prev ? `${prev} ${cmd}` : cmd));
    console.log(`Appending command: "${cmd}" to current command: "${command}"`);
  };

  const handleTerminalMessage = (data) => {
    console.log("Received Terminal Message:", data);
    if (data.type === "serialData") {
      const lines = data.data.split("\n");
      setOutput((prev) => [...prev, ...lines]);
    } else if (data.type === "dataSent" || data.type === "inputSent") {
      console.log(`Data Sent: ${data.message || data.data}`);
    } else if (data.type === "error") {
      setOutput((prev) => [...prev, `Error: ${data.message}`]);
      console.error(`Error from terminal: ${data.message}`);
    }
  };

  const handleTelnetMessage = (data) => {
    console.log("Handling telnet message with type:", data.type);

    if (data.type === "telnetData") {
      const lines = data.data.split("\n");
      setOutput((prev) => [...prev, ...lines]);
    } else if (data.type === "autocompleteData") {
      console.log("Handling autocompleteData:", data.data);
      handleAutocompleteData(data.data);
    } else if (data.type === "connected" || data.type === "telnetConnected") {
      setOutput((prev) => [...prev, `\n${data.message}\n`]);
      setTelnetConnected(true);
      setConnectionStatus((prev) => ({ ...prev, telnet: "connected" }));
      console.log("Telnet connected:", data.message);
    } else if (data.type === "telnetClosed") {
      setOutput((prev) => [...prev, `\n${data.message}\n`]);
      setTelnetConnected(false);
      setConnectionStatus((prev) => ({ ...prev, telnet: "disconnected" }));
      console.log("Telnet disconnected:", data.message);
    } else if (data.type === "error") {
      setOutput((prev) => [...prev, `\nError: ${data.message}\n`]);
      console.error(`Error from telnet: ${data.message}`);
      if (showEditor) {
        setShowEditor(false);
        setNotification({ message: `Error: ${data.message}`, type: "error" });
      }
    } else if (data.type === "inputSent") {
      console.log(`Input Sent: ${data.message || data.data}`);
    } else if (data.type === "viContent") {
      console.log("viContent received:", data);
      console.log(`File: ${data.filePath}, Content: "${data.content}"`);

      setEditingFile(data.filePath);
      setEditorContent(data.content); // Update editorContent state

      // Slight delay before opening the editor
      setTimeout(() => {
        setShowEditor(true);
      }, 200);
    } else if (data.type === "viSaved") {
      console.log("viSaved received:", data);
      setShowEditor(false);
      setNotification({ message: data.message, type: "success" });
    }
  };

  const handleAutocompleteData = (dataPart) => {
    if (dataPart === "\u0007") {
      console.log("Multiple matches found. Waiting for second Tab press.");
      setTabPressCount(1);
      setLoadingAutocomplete(false);
    } else if (dataPart.startsWith("\r\n") && dataPart.endsWith("\r\n")) {
      const matches = dataPart.trim().split("\r\n").filter(Boolean);
      console.log("Received multiple autocomplete matches:", matches);
      setSuggestions(matches);
      setIsSuggestionListVisible(true);
      setLoadingAutocomplete(false);
    } else {
      console.log("Received single autocomplete match:", dataPart);
      const ansiRegex = new RegExp(
        "[\\u001B\\u009B][[\\]()#;?]*(?:[\\d]{1,4}(?:;[\\d]{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]",
        "g",
      );
      const cleanedDataPart = dataPart
        .replace(ansiRegex, "")
        .replace(/[\x00-\x1F\x7F-\x9F]/g, "");

      setCommand((prevCommand) => prevCommand + cleanedDataPart);
      setTabPressCount(0);
      setLastCommandSent("");
      setLoadingAutocomplete(false);
    }
  };

  const handleTabPress = () => {
    if (loadingAutocomplete) {
      console.log("Autocomplete request already in progress.");
      return;
    }

    setLoadingAutocomplete(true);

    let messageToSend = tabPressCount === 0 ? `${command}\t` : `\t`;

    setLastCommandSent(messageToSend);
    console.log(`Sending autocomplete request: "${messageToSend}"`);

    if (telnetConnected) {
      wsManager.sendMessage("telnet", {
        type: "sendInput",
        data: messageToSend,
      });
    } else {
      if (!wsManager.isConnected("terminal")) {
        connectToTerminal();
      }
      wsManager.sendMessage("terminal", {
        type: "sendInput",
        data: messageToSend,
      });
    }

    setTabPressCount((prevCount) => prevCount + 1);
    console.log(`Tab press count incremented to: ${tabPressCount + 1}`);
  };

  const handlePortsMessage = (data) => {
    console.log("Received Ports Message:", data);
    if (data.type === "portsList") {
      setPorts(data.ports);
      console.log("Available Ports:", data.ports);
    } else if (data.type === "error") {
      setOutput((prev) => [...prev, `Error: ${data.message}`]);
      console.error(`Error from /ports: ${data.message}`);
    }
  };

  const sendCommand = (cmd) => {
    setHistoryIndex(-1);

    const isScript = typeof cmd === "string" && cmd.includes("\n");

    if (isScript) {
      const runScriptMessage = {
        type: "runScript",
        scriptText: cmd,
      };

      if (telnetConnected) {
        wsManager.sendMessage("telnet", runScriptMessage);
      } else {
        if (!wsManager.isConnected("terminal")) {
          connectToTerminal();
        }
        wsManager.sendMessage("terminal", runScriptMessage);
      }

      const lines = cmd
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      lines.forEach((line) => {
        setOutput((prev) => [...prev, `$ ${line}`]);
      });

      setCommandHistory((prev) => [...prev, "Running script"]);
    } else {
      setOutput((prev) => [...prev, `$ ${cmd}`]);
      setCommandHistory((prev) => [...prev, cmd]);

      const executeCommandMessage = {
        type: "executeCommand",
        command: `${cmd.trim()}`,
      };

      if (telnetConnected) {
        wsManager.sendMessage("telnet", executeCommandMessage);
      } else {
        if (!wsManager.isConnected("terminal")) {
          connectToTerminal();
        }
        wsManager.sendMessage("terminal", executeCommandMessage);
      }

      console.log(`ExecuteCommand sent via QuickCommands: "${cmd.trim()}"`);
    }
  };

  const connectToTerminal = () => {
    wsManager
      .connect("terminal", "/terminal")
      .then(() => {
        wsManager.onMessage("terminal", handleTerminalMessage);
        wsManager.onStatusChange("terminal", (status) =>
          setConnectionStatus((prev) => ({ ...prev, terminal: status })),
        );
        setConnectionStatus((prev) => ({ ...prev, terminal: "connected" }));
        setOutput((prev) => [...prev, "Connected to terminal."]);
        console.log("Connected to /terminal WebSocket");
      })
      .catch((error) => {
        console.error("WebSocket connection error to /terminal:", error);
        setConnectionStatus((prev) => ({ ...prev, terminal: "error" }));
        setOutput((prev) => [
          ...prev,
          `Ports connection error: ${error.message}`,
        ]);
      });
  };

  const handleClearLog = () => {
    setOutput([]);
    console.log("Terminal output cleared.");
  };

  const handleSaveLog = () => {
    if (output.length === 0) {
      setNotification({ message: "There are no logs to save.", type: "error" });
      console.warn("No logs to save.");
      return;
    }

    const logContent = output.join("\n");
    const blob = new Blob([logContent], { type: "text/plain" });
    const link = document.createElement("a");
    link.download = `terminal_logs_${new Date().toISOString()}.txt`;
    link.href = window.URL.createObjectURL(blob);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setNotification({
      message: "Terminal logs have been saved successfully.",
      type: "success",
    });
    console.log("Terminal logs saved.");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedCommand = command.trim();

    if (trimmedCommand) {
      setOutput((prev) => [...prev, `$ ${trimmedCommand}`]);
      setCommandHistory((prev) => [...prev, trimmedCommand]);
    } else {
      setOutput((prev) => [...prev, ""]);
    }

    setHistoryIndex(-1);
    setTabPressCount(0);
    setLastCommandSent("");
    setSuggestions([]);
    setIsSuggestionListVisible(false);
    setLoadingAutocomplete(false);

    let message;
    if (trimmedCommand.startsWith("vi ")) {
      const filePath = trimmedCommand.slice(3).trim();
      message = {
        type: "vi",
        command: filePath,
      };
    } else {
      message = {
        type: "executeCommand",
        command: trimmedCommand,
      };
    }

    if (telnetConnected) {
      wsManager.sendMessage("telnet", message);
    } else {
      if (!wsManager.isConnected("terminal")) {
        connectToTerminal();
      }
      wsManager.sendMessage("terminal", message);
    }

    setCommand("");
    console.log(`Command sent: "${JSON.stringify(message)}"`);
  };

  const handleSavedConnectionConnect = (host, port) => {
    if (telnetConnected) {
      wsManager.sendMessage("telnet", { type: "disconnect" });
      wsManager.disconnect("telnet");
      setTelnetConnected(false);
      setOutput((prev) => [
        ...prev,
        "Disconnected from previous Telnet session.",
      ]);
    }

    setTelnetHost(host);
    setTelnetPort(port);

    wsManager
      .connect("telnet", "/telnet")
      .then(() => {
        wsManager.sendMessage("telnet", {
          type: "connect",
          host: host,
          port: port,
        });
        wsManager.onMessage("telnet", handleTelnetMessage);
        wsManager.onStatusChange("telnet", (status) =>
          setConnectionStatus((prev) => ({ ...prev, telnet: status })),
        );
        setTelnetConnected(true);
        setOutput((prev) => [
          ...prev,
          `Connecting to Telnet at ${host}:${port}...`,
        ]);
        console.log(`Attempting to connect to Telnet at ${host}:${port}`);
      })
      .catch((error) => {
        console.error("WebSocket connection error to /telnet:", error);
        setOutput((prev) => [
          ...prev,
          `Telnet connection error: ${error.message}`,
        ]);
        setNotification({
          message: `Telnet connection error: ${error.message}`,
          type: "error",
        });
      });
  };

  useEffect(() => {
    wsManager
      .connect("ports", "/ports")
      .then(() => {
        wsManager.onMessage("ports", handlePortsMessage);
        wsManager.onStatusChange("ports", (status) =>
          setConnectionStatus((prev) => ({ ...prev, ports: status })),
        );
        wsManager.sendMessage("ports", { type: "getPorts" });
        console.log("Connected to /ports WebSocket and requested ports list.");
      })
      .catch((error) => {
        console.error("Failed to connect to /ports:", error);
        setConnectionStatus((prev) => ({ ...prev, ports: "error" }));
        setOutput((prev) => [
          ...prev,
          `Ports connection error: ${error.message}`,
        ]);
      });

    return () => {
      wsManager.disconnect("ports");
      console.log("Disconnected from /ports WebSocket.");
    };
  }, []);

  useEffect(() => {
    if (!telnetConnected) {
      connectToTerminal();
      return () => {
        wsManager.disconnect("terminal");
        console.log("Disconnected from /terminal WebSocket.");
      };
    }
  }, [telnetConnected]);

  useEffect(() => {
    if (telnetConnected) {
      console.log("Telnet is connected.");
    }
    return () => {
      if (telnetConnected) {
        wsManager.sendMessage("telnet", { type: "disconnect" });
        wsManager.disconnect("telnet");
        console.log("Disconnected from /telnet WebSocket.");
      }
    };
  }, [telnetConnected]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (telnetConnected) {
        wsManager.sendMessage("telnet", { type: "disconnect" });
        wsManager.disconnect("telnet");
        console.log("Disconnected from /telnet WebSocket on tab close.");
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [telnetConnected]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      console.log("Auto-scrolled to the bottom of terminal output.");
    }
  }, [output]);

  useEffect(() => {
    if (notification.message) {
      const timer = setTimeout(() => {
        setNotification({ message: "", type: "" });
        console.log("Notification hidden after 3 seconds.");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    setTabPressCount(0);
    setLastCommandSent("");
    setSuggestions([]);
    setIsSuggestionListVisible(false);
    setLoadingAutocomplete(false);
    console.log(`Command changed. Reset autocomplete state.`);
  }, [command]);

  useEffect(() => {
    console.log(`Command state updated: "${command}"`);
  }, [command]);

  const handleEditorSave = (newContent) => {
    wsManager.sendMessage("telnet", {
      type: "saveVi",
      command: editingFile,
      content: newContent,
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#1e1e1e] text-[#d4d4d4] relative">
      <Navbar
        appendCommand={appendCommand}
        onImportClick={() => {}}
        connectionStatus={connectionStatus}
      />

      <div className="flex flex-1">
        <main className="flex-1 flex flex-row">
          <Sidebar
            isCollapsed={isCollapsed}
            handleToggleCollapse={() => setIsCollapsed(!isCollapsed)}
            showNewConnectionDropdown={showNewConnectionDropdown}
            handleNewConnectionClick={() =>
              setShowNewConnectionDropdown(!showNewConnectionDropdown)
            }
            ports={ports}
            handlePortSelect={(port) => {
              if (!port) return;
              wsManager.sendMessage("terminal", {
                type: "selectPort",
                port: port,
              });
              setShowNewConnectionDropdown(false);
              setOutput([]);
              setConnectionStatus((prev) => ({
                ...prev,
                terminal: "connected",
              }));
              console.log(`Selected port: "${port}"`);
            }}
            telnetHost={telnetHost}
            telnetPort={telnetPort}
            handleTelnetHostChange={(e) => setTelnetHost(e.target.value)}
            handleTelnetPortChange={(e) => setTelnetPort(e.target.value)}
            handleTelnetConnect={() => {
              wsManager
                .connect("telnet", "/telnet")
                .then(() => {
                  wsManager.sendMessage("telnet", {
                    type: "connect",
                    host: telnetHost,
                    port: telnetPort,
                  });
                  wsManager.onMessage("telnet", handleTelnetMessage);
                  wsManager.onStatusChange("telnet", (status) =>
                    setConnectionStatus((prev) => ({
                      ...prev,
                      telnet: status,
                    })),
                  );
                  setTelnetConnected(true);
                  setOutput((prev) => [
                    ...prev,
                    `Connecting to Telnet at ${telnetHost}:${telnetPort}...`,
                  ]);
                  console.log(
                    `Attempting to connect to Telnet at ${telnetHost}:${telnetPort}`,
                  );
                })
                .catch((error) => {
                  console.error(
                    "WebSocket connection error to /telnet:",
                    error,
                  );
                  setOutput((prev) => [
                    ...prev,
                    `Telnet connection error: ${error.message}`,
                  ]);
                  setNotification({
                    message: `Telnet connection error: ${error.message}`,
                    type: "error",
                  });
                });
              setShowNewConnectionDropdown(false);
              setOutput([]);
            }}
            handleClearLog={handleClearLog}
            handleSaveLog={handleSaveLog}
            handleSavedConnectionConnect={handleSavedConnectionConnect}
            setNotification={setNotification}
          />

          <div className="flex-1 flex flex-col relative">
            <TerminalOutput
              output={output}
              isCollapsed={isCollapsed}
              messagesEndRef={messagesEndRef}
            />
            <TerminalPrompt
              command={command}
              setCommand={setCommand}
              handleSubmit={handleSubmit}
              handleKeyDown={(e) => {
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  if (commandHistory.length === 0) return;
                  const newIndex =
                    historyIndex === -1
                      ? commandHistory.length - 1
                      : Math.max(historyIndex - 1, 0);
                  setHistoryIndex(newIndex);
                  setCommand(commandHistory[newIndex]);
                  console.log(
                    `Navigated to command history index: ${newIndex}`,
                  );
                } else if (e.key === "ArrowDown") {
                  e.preventDefault();
                  if (commandHistory.length === 0) return;
                  const newIndex =
                    historyIndex === -1
                      ? -1
                      : Math.min(historyIndex + 1, commandHistory.length - 1);
                  setHistoryIndex(newIndex);
                  setCommand(newIndex === -1 ? "" : commandHistory[newIndex]);
                  console.log(
                    `Navigated to command history index: ${newIndex}`,
                  );
                }
              }}
              handleTabPress={handleTabPress}
            />
            <button
              onClick={() => setIsQuickCommandsOpen(!isQuickCommandsOpen)}
              className="absolute right-4 bottom-4 p-2 bg-blue-500 hover:bg-blue-600 text-white rounded z-50"
            >
              {isQuickCommandsOpen
                ? "Hide Quick Commands"
                : "Show Quick Commands"}
            </button>
          </div>
        </main>
      </div>

      <QuickCommands
        isOpen={isQuickCommandsOpen}
        setIsOpen={setIsQuickCommandsOpen}
        sendCommand={sendCommand}
      />

      {notification.message && (
        <div
          className={`fixed top-4 right-4 px-4 py-2 rounded shadow-lg ${
            notification.type === "success"
              ? "bg-green-500 text-white"
              : notification.type === "warning"
                ? "bg-yellow-500 text-black"
                : "bg-red-500 text-white"
          }`}
        >
          {notification.message}
        </div>
      )}

      <EditorModal
        show={showEditor}
        onClose={() => setShowEditor(false)}
        onSave={handleEditorSave}
        filePath={editingFile}
        initialContent={editorContent}
      />
    </div>
  );
}
