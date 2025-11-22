"use client"

import { useState, useEffect, useRef } from "react"
import { MessageSquare, Send, X, Bot, User, Loader2 } from "lucide-react"
import { useChat } from "ai/react"
import { useSession } from "@/lib/auth-client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

export function FeedbackButton() {
  const [open, setOpen] = useState(false)
  const { data: session } = useSession()
  const scrollRef = useRef<HTMLDivElement>(null)

  const { messages, input, handleInputChange, handleSubmit, isLoading, addToolResult } = useChat({
    api: "/api/chat/support",
    body: {
      userInfo: session?.user || null,
    },
    initialMessages: [
      {
        id: "welcome",
        role: "assistant",
        content: "Hi there! I'm your support assistant. How can I help you today? You can ask questions or leave feedback.",
      },
    ],
  })

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="fixed bottom-4 right-4 z-50 h-14 w-14 rounded-full shadow-xl bg-primary hover:bg-primary/90 transition-all duration-300"
          size="icon"
        >
          <MessageSquare className="h-7 w-7" />
          <span className="sr-only">Open Support Chat</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px] h-[600px] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 border-b bg-muted/20">
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Support Assistant
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 p-4">
          <div className="flex flex-col gap-4 min-h-full" ref={scrollRef}>
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "flex gap-3 max-w-[85%]",
                  m.role === "user" ? "ml-auto flex-row-reverse" : ""
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
                    m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}
                >
                  {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className="flex flex-col gap-1">
                  {m.content && (
                    <div
                      className={cn(
                        "p-3 rounded-lg text-sm shadow-sm",
                        m.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-none"
                          : "bg-muted text-foreground rounded-tl-none"
                      )}
                    >
                      {m.content}
                    </div>
                  )}
                  
                  {/* Handle tool invocations nicely */}
                  {m.toolInvocations?.map((toolInvocation) => {
                    const toolCallId = toolInvocation.toolCallId;
                    const addResult = (result: string) =>
                      addToolResult({ toolCallId, result });
 
                    if (toolInvocation.toolName === 'submitFeedback') {
                      return (
                        <div key={toolCallId} className="bg-muted/50 text-xs p-2 rounded border w-full">
                          {toolInvocation.state === 'result' ? (
                             <div className="flex items-center gap-2 text-green-600">
                               <span>✓ Feedback submitted</span>
                             </div>
                          ) : (
                            <div className="flex items-center gap-2 text-muted-foreground">
                               <Loader2 className="w-3 h-3 animate-spin" />
                               <span>Submitting feedback...</span>
                            </div>
                          )}
                        </div>
                      )
                    }
                    return null
                  })}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-muted text-foreground p-3 rounded-lg rounded-tl-none shadow-sm">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" />
                  </div>
                </div>
              </div>
            )}
            <div ref={scrollRef} /> 
          </div>
        </ScrollArea>

        <div className="p-4 border-t bg-background mt-auto">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder="Type a message..."
              className="flex-1"
              autoFocus
            />
            <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}