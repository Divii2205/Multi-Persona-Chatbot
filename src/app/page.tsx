"use client";

import { Children, isValidElement, useState, useRef, useEffect } from "react";
import type { ReactElement, ReactNode } from "react";
import { personas, PersonaId } from "@/lib/personas";
import { Message } from "@/services/gemini";
import Image from "next/image";
import { Send, Trash2, User, Copy, Check, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

function PersonaAvatar({
  personaId,
  size = 40,
  className = "",
}: {
  personaId: PersonaId;
  size?: number;
  className?: string;
}) {
  const persona = personas[personaId];

  return (
    <div
      className={`relative overflow-hidden rounded-full border border-slate-200 bg-slate-100 ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={persona.avatarUrl}
        alt={persona.name}
        fill
        sizes={`${size}px`}
        className="object-cover"
      />
    </div>
  );
}

function FormattedContent({ content }: { content: string }) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyCode = async (code: string, index: number) => {
    await navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  function MarkdownCodeBlock({
    className,
    children,
  }: {
    className?: string;
    children: ReactNode;
  }) {
    const [codeCopied, setCodeCopied] = useState(false);
    const match = /language-(\w+)/.exec(className || "");
    const code = String(children).replace(/\n$/, "");

    const copyCode = async () => {
      await navigator.clipboard.writeText(code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    };

    return (
      <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-900 text-slate-100 shadow-md">
        <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800 px-4 py-2">
          <span className="text-xs font-mono text-slate-400">
            {match?.[1] || "code"}
          </span>
          <button
            onClick={copyCode}
            className="flex items-center gap-1 rounded bg-slate-700 px-2 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-600 hover:text-slate-100"
          >
            {codeCopied ? (
              <>
                <Check className="h-3 w-3" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" /> Copy
              </>
            )}
          </button>
        </div>
        <pre className="overflow-x-auto p-4">
          <code className="font-mono text-sm leading-relaxed text-slate-100">
            {code}
          </code>
        </pre>
      </div>
    );
  }

  const components: Components = {
    p: ({ children }) => (
      <p className="whitespace-pre-wrap leading-relaxed text-[15px] text-slate-800">
        {children}
      </p>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold text-slate-900">{children}</strong>
    ),
    em: ({ children }) => <em className="italic text-slate-800">{children}</em>,
    a: ({ children, href }) => (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-700"
      >
        {children}
      </a>
    ),
    ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    h1: ({ children }) => (
      <h1 className="text-xl font-bold text-slate-900">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-lg font-bold text-slate-900">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-base font-bold text-slate-900">{children}</h3>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-slate-300 pl-4 italic text-slate-600">
        {children}
      </blockquote>
    ),
    code: ({ className, children, ...props }) => {
      if (!className) {
        return (
          <code
            className="rounded bg-slate-100 px-1 py-0.5 font-mono text-sm text-slate-800"
            {...props}
          >
            {children}
          </code>
        );
      }

      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
    pre: ({ children }) => {
      const child = Children.only(children) as ReactElement<{
        className?: string;
        children?: ReactNode;
      }>;

      if (isValidElement(child)) {
        return (
          <MarkdownCodeBlock className={child.props.className}>
            {child.props.children}
          </MarkdownCodeBlock>
        );
      }

      return <>{children}</>;
    },
  };

  return (
    <div className="space-y-3">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={components}>
        {content}
      </ReactMarkdown>
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
        body: JSON.stringify({
          messages: newMessages,
          selectedPersona: activePersona,
        }),
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
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-slate-50 text-slate-900 font-sans">
      <header className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-4 bg-white border-b border-slate-200 shadow-sm z-10">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">
            PersonaChat
          </h1>
          <p className="text-sm text-slate-500">AI Personalities</p>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 flex-col lg:flex-row overflow-hidden max-w-5xl w-full mx-auto">
        <div className="w-full lg:w-64 bg-white border-r border-slate-200 flex flex-col hidden lg:flex">
          <div className="p-4 border-b border-slate-100 font-semibold text-slate-700">
            Select Persona
          </div>
          <div className="flex flex-col justify-between h-full">
            <div className="flex flex-col p-2 space-y-1">
              {Object.values(personas).map((persona) => (
                <button
                  key={persona.id}
                  onClick={() => handlePersonaChange(persona.id as PersonaId)}
                  className={`flex flex-col items-start p-3 rounded-lg transition-all ${activePersona === persona.id ? "bg-blue-50 border border-blue-200 shadow-sm" : "hover:bg-slate-50 border border-transparent"}`}
                >
                  <span
                    className={`font-semibold ${activePersona === persona.id ? "text-blue-700" : "text-slate-700"}`}
                  >
                    {persona.name}
                  </span>
                  <span className="text-xs text-slate-500 mt-1 text-left line-clamp-2">
                    {persona.description}
                  </span>
                </button>
              ))}
            </div>
            <div className="px-4 pb-4">
              <div className="rounded-lg border border-blue-100 bg-blue-50/80 px-4 py-3 text-sm text-blue-900 shadow-sm">
                <span className="font-semibold">A note:</span> Each voice runs
                its own thread. Switching personas starts a fresh conversation —
                the way each of them would prefer.
              </div>
            </div>
          </div>
        </div>

        <main className="flex flex-1 min-h-0 flex-col bg-white relative overflow-hidden">
          <div className="lg:hidden flex overflow-x-auto p-2 bg-slate-50 border-b border-slate-200 space-x-2">
            {Object.values(personas).map((persona) => (
              <button
                key={persona.id}
                onClick={() => handlePersonaChange(persona.id as PersonaId)}
                className={`flex-shrink-0 px-4 py-2 text-sm rounded-full font-medium transition-colors ${activePersona === persona.id ? "bg-blue-600 text-white shadow-md" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}
              >
                {persona.name}
              </button>
            ))}
          </div>

          <div className="lg:hidden px-4 pt-3">
            <div className="rounded-lg border border-blue-100 bg-blue-50/80 px-4 py-3 text-sm text-blue-900 shadow-sm">
              <span className="font-semibold">A note:</span> Each voice runs its
              own thread. Switching personas starts a fresh conversation — the
              way each of them would prefer.
            </div>
          </div>

          <div className="sticky top-0 z-20 px-4 py-3 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between">
            {/* Left Side: Persona Info */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <PersonaAvatar
                  personaId={activePersona}
                  size={40}
                  className="border-blue-200"
                />
                {/* Status Indicator with Pulse */}
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border-2 border-white"></span>
                </span>{" "}
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h2 className="text-[15px] font-bold text-slate-900 leading-tight">
                    {currentPersonaData.name}
                  </h2>
                </div>
                <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                  {currentPersonaData.role}{" "}
                </p>
              </div>
            </div>

            {/* Right Side: Actions */}
            <button
              onClick={handleClearChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all duration-200 border border-transparent hover:border-red-100"
              title="Clear History"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear Chat</span>
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6">
            <AnimatePresence mode="popLayout">
              {messages.length === 0 ? (
                <motion.div
                  key="starting-screen"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center h-full text-slate-400"
                >
                  <p className="text-center mb-6 max-w-md">
                    Start a conversation with {currentPersonaData.name}.
                  </p>
                  <div className="flex flex-wrap gap-2 max-w-xl">
                    {currentPersonaData.suggestedQuestions.map((q) => (
                      <button
                        key={q}
                        onClick={() => sendMessage(q)}
                        className="group flex items-center justify-between w-full text-left text-[15px] bg-white border border-slate-200 text-slate-700 px-5 py-4 rounded-xl hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm active:scale-[0.99]"
                      >
                        <span className="flex-1 pr-4">{q}</span>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <div key="chat-messages" className="space-y-6">
                  {messages.map((msg, idx) => (
                    <motion.div
                      key={`${msg.role}-${idx}`}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`flex max-w-[85%] sm:max-w-[75%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                      >
                        <div
                          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === "user" ? "bg-blue-100 ml-3" : "bg-slate-200 mr-3"}`}
                        >
                          {msg.role === "user" ? (
                            <User className="w-5 h-5 text-blue-600" />
                          ) : (
                            <PersonaAvatar
                              personaId={activePersona}
                              size={32}
                            />
                          )}
                        </div>
                        <div
                          className={`px-4 py-3 rounded-2xl shadow-sm ${msg.role === "user" ? "bg-blue-600 text-white rounded-tr-sm" : "bg-white border border-slate-200 text-slate-800 rounded-tl-sm"}`}
                        >
                          {msg.role === "user" ? (
                            <p className="whitespace-pre-wrap leading-relaxed text-[15px]">
                              {msg.content}
                            </p>
                          ) : (
                            <FormattedContent content={msg.content} />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {isLoading && (
                    <motion.div
                      key="loader"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex justify-start"
                    >
                      <div className="flex flex-row max-w-[85%]">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-200 mr-3 flex items-center justify-center">
                          <PersonaAvatar personaId={activePersona} size={32} />
                        </div>
                        <div className="px-5 py-4 rounded-2xl bg-white border border-slate-200 rounded-tl-sm flex space-x-1.5 items-center">
                          <div
                            className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
                            style={{ animationDelay: "0ms" }}
                          />
                          <div
                            className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
                            style={{ animationDelay: "150ms" }}
                          />
                          <div
                            className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
                            style={{ animationDelay: "300ms" }}
                          />
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
            <form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row gap-3 sm:space-x-3"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Message ${currentPersonaData.name}...`}
                disabled={isLoading}
                className="flex-1 bg-slate-100 text-slate-900 placeholder-slate-400 px-4 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white border border-transparent transition-all disabled:opacity-50 min-h-12"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="bg-blue-600 text-white rounded-full px-5 py-3 flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm w-full sm:w-auto"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
