// components/QuickCommands/QuickCommands.jsx

import React, { useState, useEffect } from "react";

export default function QuickCommands({ isOpen, setIsOpen, sendCommand }) {
  const [commands, setCommands] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingCommand, setEditingCommand] = useState(null);

  const [newCommandName, setNewCommandName] = useState("");
  const [newCommandScript, setNewCommandScript] = useState("");

  const BACKEND_URL = "http://localhost:3005"; // Replace with your backend URL if different

  // Fetch scripts from the backend when the component mounts or is opened
  useEffect(() => {
    if (isOpen) {
      fetchScripts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const fetchScripts = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/scripts`);
      if (!response.ok) {
        throw new Error(`Error fetching scripts: ${response.statusText}`);
      }
      const data = await response.json();
      setCommands(data);
    } catch (error) {
      console.error("Failed to fetch scripts:", error);
      alert("Failed to fetch scripts from the server.");
    }
  };

  const handleCommandClick = (command) => {
    sendCommand(command.scriptText);
    setIsOpen(false); // Close after sending the command
  };

  const handleAddCommand = () => {
    setIsEditing(true);
    setEditingCommand(null);
    setNewCommandName("");
    setNewCommandScript("");
  };

  const handleEditCommand = (command) => {
    setIsEditing(true);
    setEditingCommand(command);
    setNewCommandName(command.name);
    setNewCommandScript(command.scriptText);
  };

  const handleDeleteCommand = async (commandId) => {
    if (!window.confirm("Are you sure you want to delete this command?"))
      return;
    try {
      const response = await fetch(`${BACKEND_URL}/scripts/${commandId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(`Error deleting script: ${response.statusText}`);
      }
      // Optionally, you can check the response body
      const deletedScript = await response.json();
      setCommands(commands.filter((cmd) => cmd.id !== deletedScript.id));
    } catch (error) {
      console.error("Failed to delete script:", error);
      alert("Failed to delete script.");
    }
  };

  const handleSaveCommand = async () => {
    if (!newCommandName || !newCommandScript.trim()) {
      alert("Please provide a command name and at least one command.");
      return;
    }

    try {
      let response;
      if (editingCommand) {
        // Update existing command
        response = await fetch(`${BACKEND_URL}/scripts/${editingCommand.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: newCommandName,
            scriptText: newCommandScript,
          }),
        });
        if (!response.ok) {
          throw new Error(`Error updating script: ${response.statusText}`);
        }
        const updatedScript = await response.json();
        setCommands(
          commands.map((cmd) =>
            cmd.id === editingCommand.id ? updatedScript : cmd,
          ),
        );
      } else {
        // Add new command
        response = await fetch(`${BACKEND_URL}/scripts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: newCommandName,
            scriptText: newCommandScript,
          }),
        });
        if (!response.ok) {
          throw new Error(`Error adding script: ${response.statusText}`);
        }
        const newScript = await response.json();
        setCommands([...commands, newScript]);
      }

      setIsEditing(false);
      setNewCommandName("");
      setNewCommandScript("");
    } catch (error) {
      console.error("Failed to save script:", error);
      alert("Failed to save script.");
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingCommand(null);
    setNewCommandName("");
    setNewCommandScript("");
  };

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 bg-[#2d2d2d] p-4 transition-transform duration-300 ${
        isOpen ? "translate-y-0" : "translate-y-full"
      }`}
      style={{ zIndex: 50 }}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium text-[#d4d4d4]">Quick Commands</h3>
        <div>
          <button
            onClick={handleAddCommand}
            className="text-[#d4d4d4] hover:text-white mr-4"
          >
            Add Command
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="text-[#d4d4d4] hover:text-white"
          >
            Close
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="mb-4">
          <div className="mb-2">
            <label className="block text-[#d4d4d4] text-sm mb-1">Name:</label>
            <input
              type="text"
              value={newCommandName}
              onChange={(e) => setNewCommandName(e.target.value)}
              className="w-full p-2 bg-[#3e3e3e] text-[#d4d4d4] rounded"
            />
          </div>
          <div className="mb-2">
            <label className="block text-[#d4d4d4] text-sm mb-1">
              Command or Script (one command per line):
            </label>
            <textarea
              value={newCommandScript}
              onChange={(e) => setNewCommandScript(e.target.value)}
              className="w-full p-2 bg-[#3e3e3e] text-[#d4d4d4] rounded h-24"
              placeholder="Enter your script here"
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleSaveCommand}
              className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded mr-2"
            >
              Save
            </button>
            <button
              onClick={handleCancelEdit}
              className="p-2 bg-gray-500 hover:bg-gray-600 text-white rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {commands.map((command) => (
            <div
              key={command.id}
              className="flex items-center bg-[#3e3e3e] rounded"
            >
              <button
                onClick={() => handleCommandClick(command)}
                className="flex-1 p-2 text-sm text-[#d4d4d4] text-left"
              >
                {command.name}
              </button>
              <button
                onClick={() => handleEditCommand(command)}
                className="p-2 text-[#d4d4d4] hover:text-white"
              >
                Edit
              </button>
              <button
                onClick={() => handleDeleteCommand(command.id)}
                className="p-2 text-red-500 hover:text-red-400"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
