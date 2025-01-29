// CommandModal.jsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import commandDict from "../jsons/commandDict.json"; // Adjust the path based on your structure

export default function CommandModal({ isOpen, onClose, onCommandSelect }) {
  const [selectedUser, setSelectedUser] = useState("");
  const [availableUsers, setAvailableUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const modalRef = useRef(null);

  // Initialize available users from commandDict
  useEffect(() => {
    setAvailableUsers(Object.keys(commandDict));
  }, []);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle Esc key to close modal
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
    } else {
      document.removeEventListener("keydown", handleEsc);
    }

    return () => {
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, onClose]);

  // Handle user selection
  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setSearchTerm(""); // Reset search when user changes
  };

  // Handle command selection
  const handleCommandSelect = (command) => {
    if (selectedUser && command) {
      onCommandSelect({
        user: selectedUser,
        command: command,
      });
      onClose();
      setSelectedUser("");
      setSearchTerm("");
    } else {
      alert("Please select a user and a command.");
    }
  };

  // Filter commands based on search term
  const filteredCommands = () => {
    if (!selectedUser || !commandDict[selectedUser]) {
      return [];
    }

    const commands = Object.entries(commandDict[selectedUser]);
    if (searchTerm.trim() === "") {
      return commands;
    }

    return commands.filter(
      ([command, description]) =>
        command.toLowerCase().includes(searchTerm.toLowerCase()) ||
        description.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div
        ref={modalRef}
        className="bg-gray-800 rounded-lg shadow-lg w-11/12 max-w-md p-6 relative"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white"
        >
          {/* Using Heroicons for the close icon */}
          <XIcon className="h-6 w-6" />
        </button>

        <h2 className="text-xl font-semibold text-white mb-4">Commands</h2>

        {/* User Selection */}
        <div className="mb-4">
          <label
            htmlFor="user-select"
            className="block text-sm font-medium text-gray-300 mb-1"
          >
            Select User:
          </label>
          <select
            id="user-select"
            value={selectedUser}
            onChange={(e) => handleUserSelect(e.target.value)}
            className="w-full p-2 bg-gray-700 text-white rounded"
          >
            <option value="">-- Select User --</option>
            {availableUsers.map((user, index) => (
              <option key={index} value={user}>
                {user}
              </option>
            ))}
          </select>
        </div>

        {/* Search Bar */}
        {selectedUser && (
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search commands..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 bg-gray-700 text-white rounded"
            />
          </div>
        )}

        {/* Command List */}
        {selectedUser && (
          <div className="max-h-60 overflow-y-auto">
            {filteredCommands().length > 0 ? (
              filteredCommands().map(([command, description], idx) => (
                <button
                  key={idx}
                  onClick={() => handleCommandSelect(command)}
                  className="w-full text-left p-2 bg-gray-700 hover:bg-gray-600 rounded mb-2"
                >
                  <strong>{command}</strong>: {description}
                </button>
              ))
            ) : (
              <p className="text-gray-400">No commands found.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
