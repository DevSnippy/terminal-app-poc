// TerminalOutput.jsx
"use client";

import { useEffect, useRef, useState } from "react";
import Ansi from "ansi-to-react";

export default function TerminalOutput({
  output,
  isCollapsed,
  messagesEndRef,
}) {
  const terminalRef = useRef(null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);

  // Debounce scroll handling to optimize performance
  const debounce = (func, delay) => {
    let timer;
    return (...args) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        func(...args);
      }, delay);
    };
  };

  useEffect(() => {
    if (isAutoScrollEnabled && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [output, isAutoScrollEnabled, messagesEndRef]);

  const handleScroll = debounce(() => {
    if (!terminalRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = terminalRef.current;
    const isAtBottom = scrollHeight - scrollTop <= clientHeight + 50; // Added buffer
    setIsAutoScrollEnabled(isAtBottom);
  }, 100);

  return (
    <div
      className="flex-1 overflow-y-auto bg-[#1e1e1e] p-4"
      onScroll={handleScroll}
      ref={terminalRef}
      style={{ position: "relative" }}
    >
      {output.map((line, index) => (
        <div key={index} className="text-sm font-mono text-[#d4d4d4]">
          <Ansi>{line}</Ansi>
        </div>
      ))}
      {/* Div to scroll into view */}
      <div ref={messagesEndRef} />
      {/* Auto-scroll Toggle Button is moved to TerminalComponent.js */}
    </div>
  );
}
