"use client";

import { useState, useRef, useEffect } from "react";
import { personas, PersonaId } from "@/lib/personas";
import { Message } from "@/services/gemini";
import { Send, Trash2, Bot, User, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function FormattedContent({ content }: { content: string }) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const parseContent = (text: string) => {
    const codeBlockRegex = /```([\s\S]*?)```/g;
    const rawParts: Array<{ type: "text" | "code"; content: string; language?: string }> = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        rawParts.push({ type: "text", content: text.slice(lastIndex, match.index) });
      }
      const codeContent = match[1].trim();
      const lines = codeContent.split("\n");
      const firstLine = lines[0];
      const langMatch = firstLine.match(/^[a-z0-9_+-]+$/);
      const language = langMatch ? firstLine : undefined;
      const code = language ? lines.slice(1).join("\n") : codeContent;
      rawParts.push({ type: "code", content: code, language });
      lastIndex = codeBlockRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      rawParts.push({ type: "text", content: text.slice(lastIndex) });
    }

    const parts: Array<{ type: "text" | "code" | "inline"; content: string; language?: string }> = [];
    const inlineRegex = /`([^`]+)`/g;

    rawParts.forEach((p) => {
      if (p.type === "code") {
        parts.push({ type: "code", content: p.content, language: p.language });
        return;
      }
      let last = 0;
      let m;
      while ((m = inlineRegex.exec(p.content)) !== null) {
        if (m.index > last) {
          parts.push({ type: "text", content: p.content.slice(last, m.index) });
        }
        parts.push({ type: "inline", content: m[1] });
        last = inlineRegex.lastIndex;
      }
      if (last < p.content.length) {
        parts.push({ type: "text", content: p.content.slice(last) });
      }
    });

    return parts.length === 0 ? [{ type: "text", content: text }] : parts;
  };

  const handleCopyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const parts = parseContent(content);
  let codeBlockIndex = 0;

  return (
    <div className="space-y-2">
      {parts.map((part, idx) => {
        if (part.type === "text") return <p key={idx} className="whitespace-pre-wrap leading-relaxed text-[15px]">{part.content}</p>;
        if (part.type === "inline") return <code key={idx} className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono text-sm">{part.content}</code>;
        const currentCodeIndex = codeBlockIndex++;
        return (
          <div key={idx} className="bg-slate-900 text-slate-100 rounded-lg overflow-hidden shadow-md border border-slate-700">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
              <span className="text-xs font-mono text-slate-400">{part.language || "code"}</span>
              <button onClick={() => handleCopyCode(part.content, currentCodeIndex)} className="flex items-center gap-1 px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 transition-colors text-xs text-slate-300 hover:text-slate-100">
                {copiedIndex === currentCodeIndex ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
              </button>
            </div>
            <pre className="p-4 overflow-x-auto"><code className="font-mono text-sm leading-relaxed">{part.content}</code></pre>
          </div>
        );
      })}
    </div>
  );
}

export default function ChatbotPage() {
  const [activePersona, setActivePersona] = useState<PersonaId>("anshuman");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentPersonaData = personas[activePersona];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handlePersonaChange = (personaId: PersonaId) => {
    setActivePersona(personaId);
    handleClearChat();
  };

  const handleClearChat = () => {
    setMessages([]);
    setError(null);
    setInput("");
    setIsLoading(false); // Kill any pending loader
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: text };
    const newMessages = [...messages, userMessage];
    
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, selectedPersona: activePersona }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to get response");

      setMessages((prev) => [...prev, { role: "model", content: data.text }]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false); // This ensures the bubble disappears regardless of success or error
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shadow-sm z-10">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">PersonaChat</h1>
          <p className="text-sm text-slate-500">AI Personalities</p>
        </div>
        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          <button onClick={handleClearChat} className="flex items-center text-sm font-medium text-slate-500 hover:text-red-500 transition-colors px-3 py-1.5 rounded-md hover:bg-red-50">
            <Trash2 className="w-4 h-4 mr-1.5" /> Clear
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden max-w-5xl w-full mx-auto">
        <div className="w-full sm:w-64 bg-white border-r border-slate-200 flex flex-col hidden sm:flex">
          <div className="p-4 border-b border-slate-100 font-semibold text-slate-700">Select Persona</div>
          <div className="flex flex-col p-2 space-y-1">
            {Object.values(personas).map((persona) => (
              <button key={persona.id} onClick={() => handlePersonaChange(persona.id as PersonaId)} className={`flex flex-col items-start p-3 rounded-lg transition-all ${activePersona === persona.id ? "bg-blue-50 border border-blue-200 shadow-sm" : "hover:bg-slate-50 border border-transparent"}`}>
                <span className={`font-semibold ${activePersona === persona.id ? "text-blue-700" : "text-slate-700"}`}>{persona.name}</span>
                <span className="text-xs text-slate-500 mt-1 text-left line-clamp-2">{persona.description}</span>
              </button>
            ))}
          </div>
        </div>

        <main className="flex-1 flex flex-col bg-white relative">
          <div className="sm:hidden flex overflow-x-auto p-2 bg-slate-50 border-b border-slate-200 space-x-2">
            {Object.values(personas).map((persona) => (
              <button key={persona.id} onClick={() => handlePersonaChange(persona.id as PersonaId)} className={`flex-shrink-0 px-4 py-2 text-sm rounded-full font-medium transition-colors ${activePersona === persona.id ? "bg-blue-600 text-white shadow-md" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}>{persona.name}</button>
            ))}
          </div>

          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-center">
            <div className="text-center max-w-2xl">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Talking to</h2>
              <p className="text-lg font-bold text-slate-800">{currentPersonaData.name} <span className="text-slate-400 font-normal text-sm">({currentPersonaData.role})</span></p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            <AnimatePresence mode="popLayout">
              {messages.length === 0 ? (
                <motion.div key="starting-screen" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-full text-slate-400">
                  <Bot className="w-12 h-12 mb-4 text-slate-300" />
                  <p className="text-center mb-6 max-w-md">Start a conversation with {currentPersonaData.name}.</p>
                  <div className="flex flex-wrap justify-center gap-2 max-w-xl">
                    {currentPersonaData.suggestedQuestions.map((q) => (
                      <button key={q} onClick={() => sendMessage(q)} className="text-sm bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-full hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm">{q}</button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <div key="chat-messages" className="space-y-6">
                  {messages.map((msg, idx) => (
                    <motion.div key={`${msg.role}-${idx}`} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`flex max-w-[85%] sm:max-w-[75%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === "user" ? "bg-blue-100 ml-3" : "bg-slate-200 mr-3"}`}>
                          {msg.role === "user" ? <User className="w-5 h-5 text-blue-600" /> : <Bot className="w-5 h-5 text-slate-600" />}
                        </div>
                        <div className={`px-4 py-3 rounded-2xl shadow-sm ${msg.role === "user" ? "bg-blue-600 text-white rounded-tr-sm" : "bg-white border border-slate-200 text-slate-800 rounded-tl-sm"}`}>
                          {msg.role === "user" ? <p className="whitespace-pre-wrap leading-relaxed text-[15px]">{msg.content}</p> : <FormattedContent content={msg.content} />}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  
                  {isLoading && (
                    <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-start">
                      <div className="flex flex-row max-w-[85%]">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-200 mr-3 flex items-center justify-center"><Bot className="w-5 h-5 text-slate-600" /></div>
                        <div className="px-5 py-4 rounded-2xl bg-white border border-slate-200 rounded-tl-sm flex space-x-1.5 items-center">
                          <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                          <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                          <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </AnimatePresence>
            
            {error && (
              <div className="flex justify-center my-4">
                <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm border border-red-100 shadow-sm">
                  <span className="font-semibold mr-2">Error:</span> {error}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-white border-t border-slate-200">
            <form onSubmit={handleSubmit} className="flex space-x-3">
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder={`Message ${currentPersonaData.name}...`} disabled={isLoading} className="flex-1 bg-slate-100 text-slate-900 placeholder-slate-400 px-4 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white border border-transparent transition-all disabled:opacity-50" />
              <button type="submit" disabled={!input.trim() || isLoading} className="bg-blue-600 text-white rounded-full p-3 flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm">
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}