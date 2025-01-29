// components/Navbar.jsx
"use client";

import Link from "next/link";
import React, { useState, useEffect, useRef } from "react";
import DatabasePage from "./DatabasePage";
import CommandModal from "./CommandModal";
import ScriptsModal from "./ScriptsModal";
import commandDict from "../jsons/commandDict.json";
import scriptsList from "../jsons/scriptsList.json"; // this is duumy , func is not added yet

export default function Navbar({ appendCommand, onImportClick }) {
  const [isCommandModalOpen, setIsCommandModalOpen] = useState(false);
  const [isDatabaseModalOpen, setIsDatabaseModalOpen] = useState(false);
  const [isScriptsModalOpen, setIsScriptsModalOpen] = useState(false);

  const databaseModalRef = useRef(null);

  // Command Modal handlers
  const handleCommandsClick = () => {
    setIsCommandModalOpen(true);
  };
  const handleCloseCommandModal = () => {
    setIsCommandModalOpen(false);
  };

  // Database Modal handlers
  const handleDatabaseClick = () => {
    setIsDatabaseModalOpen(true);
  };
  const handleCloseDatabaseModal = () => {
    setIsDatabaseModalOpen(false);
  };

  // Scripts Modal handlers
  const handleScriptsClick = () => {
    setIsScriptsModalOpen(true);
  };
  const handleCloseScriptsModal = () => {
    setIsScriptsModalOpen(false);
  };

  // Close Database Modal when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutsideDatabase = (event) => {
      if (
        databaseModalRef.current &&
        !databaseModalRef.current.contains(event.target)
      ) {
        handleCloseDatabaseModal();
      }
    };

    const handleEscDatabase = (event) => {
      if (event.key === "Escape") {
        handleCloseDatabaseModal();
      }
    };

    if (isDatabaseModalOpen) {
      document.addEventListener("mousedown", handleClickOutsideDatabase);
      document.addEventListener("keydown", handleEscDatabase);
    } else {
      document.removeEventListener("mousedown", handleClickOutsideDatabase);
      document.removeEventListener("keydown", handleEscDatabase);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutsideDatabase);
      document.removeEventListener("keydown", handleEscDatabase);
    };
  }, [isDatabaseModalOpen]);

  return (
    <>
      <header className="sticky top-0 z-10 flex h-14 items-center border-b border-[#2d2d2d] px-4 bg-[#1e1e1e]">
        <Link href="/" className="flex items-center gap-2" prefetch={false}>
          <span className="text-lg font-medium text-white">Terminal</span>
        </Link>
        <nav className="ml-auto flex gap-4 items-center">
          <button
            onClick={handleCommandsClick}
            className="hover:text-[#9cdcfe] text-white focus:outline-none"
          >
            Commands
          </button>
          <button
            onClick={handleScriptsClick}
            className="hover:text-[#9cdcfe] text-white focus:outline-none"
          >
            Scripts
          </button>
          <button
            onClick={handleDatabaseClick}
            className="hover:text-[#9cdcfe] text-white focus:outline-none"
          >
            Database
          </button>
        </nav>
      </header>

      {/* Command Modal */}
      <CommandModal
        isOpen={isCommandModalOpen}
        onClose={handleCloseCommandModal}
        appendCommand={appendCommand}
        commandDict={commandDict}
      />

      {/* Scripts Modal */}
      <ScriptsModal
        isOpen={isScriptsModalOpen}
        onClose={handleCloseScriptsModal}
        scriptsList={scriptsList}
      />

      {/* Database Modal */}
      {isDatabaseModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="database-modal-title"
        >
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black opacity-50"
            onClick={handleCloseDatabaseModal}
            aria-hidden="true"
          ></div>

          {/* Popup Content */}
          <div
            ref={databaseModalRef}
            className="bg-[#242424] rounded-lg shadow-lg w-11/12 max-w-3xl p-6 relative transform transition-transform duration-300 ease-in-out sm:w-3/4 lg:w-2/3 overflow-y-auto text-white scale-0 origin-center animate-modalOpen"
          >
            {/* Close Button */}
            <button
              onClick={handleCloseDatabaseModal}
              className="absolute top-3 right-3 text-gray-400 hover:text-white focus:outline-none"
              aria-label="Close Database Modal"
            >
              ×
            </button>

            <DatabasePage />
          </div>

          {/* Animation Styles */}
          <style jsx>{`
            @keyframes modalOpen {
              from {
                transform: scale(0);
              }
              to {
                transform: scale(1);
              }
            }
            .animate-modalOpen {
              animation: modalOpen 0.3s forwards;
            }
          `}</style>
        </div>
      )}
    </>
  );
}
