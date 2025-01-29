// components/CommandModal.jsx
"use client";

import React, { useState, useEffect, useRef } from "react";

export default function CommandModal({
  isOpen,
  onClose,
  appendCommand,
  commandDict
}) {
  const [selectedUser, setSelectedUser] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredCommands, setFilteredCommands] = useState([]);

  const commandModalRef = useRef(null);
  const availableUsers = Object.keys(commandDict);

  // Close modal when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        commandModalRef.current &&
        !commandModalRef.current.contains(event.target)
      ) {
        onClose();
      }
    };

    const handleEsc = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEsc);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, onClose]);

  // Focus the first input when Command modal opens
  useEffect(() => {
    if (isOpen && commandModalRef.current) {
      const firstInput = commandModalRef.current.querySelector(
        "select, input, button"
      );
      if (firstInput) firstInput.focus();
    }
  }, [isOpen]);

  // Filter commands based on selected user and search term
  useEffect(() => {
    if (selectedUser) {
      const commands = Object.entries(commandDict[selectedUser]);
      if (searchTerm.trim() === "") {
        setFilteredCommands(commands);
      } else {
        const filtered = commands.filter(
          ([command, description]) =>
            command.toLowerCase().includes(searchTerm.toLowerCase()) ||
            description.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredCommands(filtered);
      }
    } else {
      setFilteredCommands([]);
    }
  }, [selectedUser, searchTerm, commandDict]);

  const handleCommandSelect = (command) => {
    if (selectedUser && command) {
      appendCommand(command);
      onClose();
    } else {
      alert("Please select a user and a command.");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="command-modal-title"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black opacity-50"
        onClick={onClose}
        aria-hidden="true"
      ></div>

      {/* Popup Content */}
      <div
        ref={commandModalRef}
        className="bg-[#242424] rounded-lg shadow-lg w-11/12 max-w-md p-6 relative transform transition-transform duration-300 sm:w-3/4 lg:w-1/2 overflow-y-auto text-white"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white focus:outline-none"
          aria-label="Close Commands Modal"
        >
          ×
        </button>

        {/* Modal Title */}
        <h2
          id="command-modal-title"
          className="text-xl font-semibold text-white mb-4"
        >
          Commands
        </h2>

        {/* Directory Selection */}
        <div className="mb-4">
          <label
            htmlFor="user-select"
            className="block text-sm font-medium text-gray-200 mb-1"
          >
            Select dictionary:
          </label>
          <select
            id="user-select"
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="w-full p-2 bg-white text-black rounded focus:outline-none"
            style={{
              color: selectedUser ? "black" : "gray",
            }}
          >
            <option value="" style={{ color: "gray" }}>
              -- Select dictionary --
            </option>
            {availableUsers.map((user, index) => (
              <option key={index} value={user} style={{ color: "black" }}>
                {user}
              </option>
            ))}
          </select>
        </div>

        {/* Search Input */}
        {selectedUser && (
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search commands..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 bg-white text-black rounded focus:outline-none"
              aria-label="Search Commands"
              style={{ color: "black" }}
            />
            {/* Placeholder styling */}
            <style jsx>{`
              ::placeholder {
                color: gray;
              }
            `}</style>
          </div>
        )}

        {/* Commands List */}
        {selectedUser && (
          <div className="max-h-60 overflow-y-auto">
            {filteredCommands.length > 0 ? (
              filteredCommands.map(([command, description], idx) => (
                <button
                  key={idx}
                  onClick={() => handleCommandSelect(command)}
                  className="w-full text-left p-2 bg-gray-700 hover:bg-gray-600 rounded mb-2 text-white focus:outline-none"
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
