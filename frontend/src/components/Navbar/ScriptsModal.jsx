// components/ScriptsModal.jsx
"use client";

import React, { useEffect, useRef } from "react";

export default function ScriptsModal({ isOpen, onClose, scriptsList }) {
  const modalRef = useRef(null);

  // Close the modal when clicking outside or pressing Esc
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scripts-modal-title"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black opacity-50"
        onClick={onClose}
        aria-hidden="true"
      ></div>

      {/* Modal Content */}
      <div
        ref={modalRef}
        className="bg-[#242424] rounded-lg shadow-lg w-11/12 max-w-md p-6 relative text-white overflow-y-auto"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white focus:outline-none"
          aria-label="Close Scripts Modal"
        >
          ×
        </button>

        {/* Modal Title */}
        <h2 id="scripts-modal-title" className="text-xl font-semibold mb-4">
          Available Scripts
        </h2>

        {/* Scripts List */}
        {scriptsList && scriptsList.length > 0 ? (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {scriptsList.map((script, index) => (
              <div
                key={index}
                className="flex justify-between items-center p-2 bg-gray-700 hover:bg-gray-600 rounded"
              >
                <div>
                  <strong>{script.name}</strong>
                  <div className="text-sm text-gray-300">
                    {script.description}
                  </div>
                </div>
                <button
                  onClick={() => alert(`Run ${script.name}`)}
                  className="bg-blue-600 hover:bg-blue-500 text-white py-1 px-3 rounded focus:outline-none"
                >
                  Run
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400">No scripts available.</p>
        )}
      </div>
    </div>
  );
}
