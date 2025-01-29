"use client";

import React, { useState, useEffect, useRef } from "react";

export default function EditorModal({
  show,
  onClose,
  onSave,
  filePath,
  initialContent,
}) {
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
    console.log("initialContent:", JSON.stringify(initialContent));

    const escapeHtml = (unsafe) => {
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    const insertLineBreaks = (str) => {
      return str.replace(/\r\n|\r|\n/g, "<br>");
    };

    if (!searchTerm) {
      let plainContent = escapeHtml(content);
      plainContent = insertLineBreaks(plainContent);
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
      let plainContent = escapeHtml(content);
      plainContent = insertLineBreaks(plainContent);
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

    // Insert <br> tags for line breaks
    highlighted = insertLineBreaks(highlighted);

    setHighlightedContent(highlighted);
    setSearchMatches(matches);
    setCurrentMatchIndex(0);
  }, [searchTerm, content, initialContent]);

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
          <div
            ref={highlightRef}
            className="absolute top-0 left-0 w-full h-full p-2 pointer-events-none break-words"
            style={{
              backgroundColor: "#2d2d2d",
              color: "#d4d4d4",
              overflow: "hidden",
              whiteSpace: "normal",
            }}
            dangerouslySetInnerHTML={{ __html: highlightedContent }}
          ></div>
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
