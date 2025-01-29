"use client";

import React, { useState, useEffect, useRef } from "react";
import commandDict from "../jsons/commandDict.json";

// Extract commands with descriptions and sources
const getCommandsWithDescriptions = (dict) => {
  const commandMap = {};

  Object.entries(dict).forEach(([dictName, commands]) => {
    Object.entries(commands).forEach(([command, description]) => {
      if (!commandMap[command]) {
        commandMap[command] = { description, sources: [dictName] };
      } else {
        // If the command exists in multiple dictionaries, add the source
        commandMap[command].sources.push(dictName);
      }
    });
  });

  return commandMap;
};

const uniqueCommands = getCommandsWithDescriptions(commandDict);

export default function TerminalPrompt({
  command,
  setCommand,
  handleSubmit,
  handleKeyDown,
  handleTabPress, // New prop for handling Tab key
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [autocompleteEnabled, setAutocompleteEnabled] = useState(true); // State for autocomplete toggle
  const suggestionsRef = useRef(null);
  const inputRef = useRef(null); // Ref for the input element

  useEffect(() => {
    if (command && autocompleteEnabled) {
      const filteredSuggestions = Object.entries(uniqueCommands)
        .filter(([cmd]) => cmd.startsWith(command))
        .map(([cmd, details]) => ({ command: cmd, ...details }));

      setSuggestions(filteredSuggestions);
      setShowSuggestions(filteredSuggestions.length > 0);
      setActiveSuggestionIndex(-1);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setActiveSuggestionIndex(-1);
    }
  }, [command, autocompleteEnabled]);

  const handleInputChange = (e) => {
    setCommand(e.target.value);

    // Close suggestions if the command is cleared
    if (!e.target.value) {
      setShowSuggestions(false);
    }
  };

  const handleKeyDownWithAutocomplete = (e) => {
    if (e.key === "Tab") {
      e.preventDefault(); // Prevent default browser behavior
      if (handleTabPress) {
        handleTabPress(command);
      }
      return;
    }

    if (showSuggestions) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveSuggestionIndex((prevIndex) =>
          prevIndex < suggestions.length - 1 ? prevIndex + 1 : prevIndex,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveSuggestionIndex((prevIndex) =>
          prevIndex > 0 ? prevIndex - 1 : -1,
        );
      } else if (e.key === "Enter") {
        if (activeSuggestionIndex >= 0) {
          e.preventDefault();
          setCommand(suggestions[activeSuggestionIndex].command);

          // Close suggestions after selection
          setShowSuggestions(false);
        }
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
      } else if (e.key === "ArrowRight") {
        if (suggestions.length > 0) {
          e.preventDefault();
          setCommand(suggestions[0].command);
          setShowSuggestions(false);
        }
      }
    }

    // Call the original handleKeyDown if needed
    if (handleKeyDown) {
      handleKeyDown(e);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setCommand(suggestion.command);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Handle checkbox toggle
  const handleCheckboxChange = (e) => {
    setAutocompleteEnabled(e.target.checked);
    setSuggestions([]);
    setShowSuggestions(false);
    setActiveSuggestionIndex(-1);
  };

  // Function to get the autocomplete suggestion
  const getAutocompleteSuggestion = () => {
    if (suggestions.length === 0) return "";
    const firstSuggestion = suggestions[0].command;
    if (!firstSuggestion.startsWith(command)) return "";
    return firstSuggestion.slice(command.length);
  };

  const autocompleteSuggestion = getAutocompleteSuggestion();

  return (
    <div className="border-t border-[#2d2d2d] p-4 sticky bottom-0 bg-[#1e1e1e]">
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 rounded-md bg-[#2d2d2d] px-3 py-2 relative"
      >
        {/* Autocomplete Toggle Checkbox with Tooltip */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="autocompleteToggle"
            checked={autocompleteEnabled}
            onChange={handleCheckboxChange}
            className="hidden" // Hide the default checkbox
          />
          <span
            onClick={() => setAutocompleteEnabled(!autocompleteEnabled)} // Toggle checkbox on click
            className={`h-4 w-4 inline-block cursor-pointer border border-[#555] rounded transition duration-150 ease-in-out ${
              autocompleteEnabled
                ? "bg-[#555] border-[#1e1e1e]"
                : "bg-[#2d2d2d]"
            } flex items-center justify-center`}
            title="Enable Autocomplete"
          >
            {autocompleteEnabled && (
              <span className="text-xs text-white">✓</span> // Display checkmark when enabled
            )}
          </span>
        </div>

        {/* Container to hold input and autocomplete suggestion */}
        <div className="relative flex-1">
          {/* Autocomplete Suggestion */}
          {autocompleteEnabled && autocompleteSuggestion && (
            <span
              className="absolute top-0 left-0 flex items-center pointer-events-none text-[#555] truncate w-full"
              style={{ paddingLeft: "0.75rem", paddingRight: "0.75rem" }} // Adjust padding to match input
            >
              {command}
              <span className="text-[#555]">{autocompleteSuggestion}</span>
            </span>
          )}
          {/* Input Field */}
          <input
            ref={inputRef} // Add ref to input element
            type="text"
            placeholder="Enter a command"
            value={command}
            onChange={handleInputChange}
            onKeyDown={handleKeyDownWithAutocomplete}
            className={`bg-[#2d2d2d] border-none outline-none flex-1 focus:ring-0 focus:border-none text-[#d4d4d4] w-full ${
              autocompleteEnabled && autocompleteSuggestion
                ? "relative z-10 bg-transparent"
                : ""
            }`}
            autoComplete="off"
          />
        </div>

        {showSuggestions && (
          <ul
            ref={suggestionsRef}
            className="absolute bottom-full mb-1 left-0 w-full bg-[#2d2d2d] border border-[#555] rounded-md max-h-60 overflow-y-auto z-10"
          >
            {suggestions.map((suggestion, index) => (
              <li
                key={suggestion.command}
                onClick={() => handleSuggestionClick(suggestion)}
                className={`px-3 py-2 cursor-pointer flex justify-between ${
                  index === activeSuggestionIndex
                    ? "bg-[#555] text-white"
                    : "text-[#d4d4d4]"
                }`}
              >
                <span>
                  {suggestion.command.slice(0, command.length)}
                  <span className="text-[#555]">
                    {suggestion.command.slice(command.length)}
                  </span>
                </span>
                <span className="text-xs text-[#999]">
                  {suggestion.description} ({suggestion.sources.join(", ")})
                </span>
              </li>
            ))}
          </ul>
        )}
      </form>
    </div>
  );
}
