"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Sparkles, User, ShieldAlert, Cpu } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { chatWithCopilot } from "../utils/api";
import { Message } from "../types";

interface CopilotChatProps {
  vehicleId: number;
}

const QUICK_ACTIONS = [
  "Torque specs for drain plug & wheels",
  "Fluid capacities & oil viscosity",
  "When was the last brake replacement?",
  "DTC troubleshooting steps",
];

export default function CopilotChat({ vehicleId }: CopilotChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (text: string) => {
    if (!text.trim() || loading) return;

    setError("");
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await chatWithCopilot(vehicleId, text.trim());
      
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: res.answer,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      setError(err.message || "Failed to get response from AI Copilot.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(input);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-bold text-white">AI Maintenance Copilot</h2>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-wider bg-slate-900 px-2 py-1 rounded border border-slate-850">
          <Cpu className="w-3.5 h-3.5 text-cyan-500" />
          <span>LLM Engine Online</span>
        </div>
      </div>

      {/* Messages Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-900/40">
        {messages.length === 0 ? (
          // Welcome message / Empty state
          <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto p-4">
            <div className="bg-slate-950 p-4 rounded-full border border-slate-800 mb-4 shadow-xl">
              <Sparkles className="w-8 h-8 text-cyan-400 animate-pulse" />
            </div>
            <h3 className="text-sm font-bold text-white">Ask your Diagnostic Copilot</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              I can analyze your past service history logs and check details in the owner's manual PDFs you uploaded. Ask me about fluid volumes, intervals, error codes, and maintenance specs.
            </p>

            {/* Quick action chips */}
            <div className="w-full mt-6 space-y-2">
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">
                Tap a quick action to start:
              </p>
              {QUICK_ACTIONS.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(action)}
                  className="w-full text-left text-xs bg-slate-950 hover:bg-slate-950/80 border border-slate-850 hover:border-cyan-500/30 text-slate-300 hover:text-cyan-400 p-2.5 rounded-lg transition duration-200"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
              >
                {/* Avatar Icon */}
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                    msg.role === "user"
                      ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                      : "bg-slate-950 border-slate-800 text-slate-350"
                  }`}
                >
                  {msg.role === "user" ? <User className="w-4 h-4" /> : <Cpu className="w-4 h-4" />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`rounded-xl p-3.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-cyan-600 text-white font-medium shadow-md shadow-cyan-600/10"
                      : "bg-slate-950 border border-slate-850 text-slate-200"
                  }`}
                >
                  {msg.role === "user" ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className="prose prose-invert prose-xs max-w-none text-slate-250 prose-p:leading-relaxed prose-pre:my-2 prose-pre:bg-slate-900 prose-pre:p-2 prose-pre:rounded-lg prose-pre:border prose-pre:border-slate-800">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Skeleton Loading State */}
            {loading && (
              <div className="flex gap-3 max-w-[85%] mr-auto">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-slate-950 border border-slate-800 text-slate-350">
                  <Cpu className="w-4 h-4" />
                </div>
                <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 w-72 animate-pulse space-y-2.5">
                  <div className="h-3 bg-slate-850 rounded w-2/3" />
                  <div className="h-3 bg-slate-850 rounded w-full" />
                  <div className="h-3 bg-slate-850 rounded w-4/5" />
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg flex gap-2 max-w-[85%] mx-auto items-start">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Error getting Copilot response</span>
                  <p className="mt-0.5 text-slate-300">{error}</p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Form */}
      <div className="p-4 bg-slate-950 border-t border-slate-800">
        {/* Quick action chips if there are messages (to offer them easily at bottom) */}
        {messages.length > 0 && !loading && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1 text-slate-400 select-none no-scrollbar">
            {QUICK_ACTIONS.map((action, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(action)}
                className="whitespace-nowrap text-[11px] bg-slate-900 border border-slate-850 hover:border-cyan-500/30 hover:text-cyan-400 px-3 py-1.5 rounded-full transition shrink-0"
              >
                {action}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            required
            placeholder="Type your vehicle maintenance question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="flex-1 bg-slate-900 border border-slate-800 focus:border-cyan-500/60 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none transition disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 text-white px-4 py-2.5 rounded-xl transition duration-200 flex items-center justify-center shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
