import React from "react";

function CommandsPopup({
  showCommandsPopup,
  handleClosePopup,
  searchQuery,
  setSearchQuery,
  filteredCommands,
  handleCommandSelect,
  directories,
  selectedDirectory,
  setSelectedDirectory,
}) {
  if (!showCommandsPopup) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black opacity-50"
        onClick={handleClosePopup}
      ></div>

      {/* Popup Content */}
      <div className="relative bg-[#1e1e1e] p-6 rounded-lg shadow-lg z-10 w-96">
        <h2 className="text-xl mb-4">Commands</h2>

        {/* Dropdown menu for directory selection */}
        <div className="mb-4">
          <label
            htmlFor="directory-select"
            className="block text-sm font-medium text-white"
          >
            Select dictionary:
          </label>
          <select
            id="directory-select"
            value={selectedDirectory}
            onChange={(e) => setSelectedDirectory(e.target.value)}
            className="mt-1 block w-full bg-[#2d2d2d] border border-gray-600 text-white py-2 px-3 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">-- Select a dictionary --</option>
            {directories.map((dir) => (
              <option key={dir} value={dir}>
                {dir}
              </option>
            ))}
          </select>
        </div>

        {/* Search Input */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search commands..."
          className="w-full p-2 mb-4 bg-[#2d2d2d] border border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />

        {/* Display filtered commands */}
        <ul className="mt-4 max-h-60 overflow-y-auto">
          {filteredCommands.map((command) => (
            <li
              key={command.name}
              className="p-2 hover:bg-[#2d2d2d] cursor-pointer"
              onClick={() => handleCommandSelect(command.name)}
            >
              <strong>{command.name}</strong>: {command.description}
            </li>
          ))}
          {filteredCommands.length === 0 && selectedDirectory && (
            <li className="p-2 text-gray-500">No commands found.</li>
          )}
          {!selectedDirectory && (
            <li className="p-2 text-gray-500">
              Please select a dictionary to view commands.
            </li>
          )}
        </ul>

        {/* Close Button */}
        <button
          onClick={handleClosePopup}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default CommandsPopup;
