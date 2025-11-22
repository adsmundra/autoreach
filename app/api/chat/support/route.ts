import { openai } from "@ai-sdk/openai"
import { streamText, tool } from "ai"
import { z } from "zod"

export const maxDuration = 30

export async function POST(req: Request) {
  const { messages, userInfo } = await req.json()

  const systemPrompt = `
    You are a helpful support assistant for the AutoReach application.
    You can answer questions about the application and also help users submit feedback.
    
    Current User Info:
    ${userInfo ? JSON.stringify(userInfo, null, 2) : "Guest User"}
    
    If the user wants to submit feedback, a bug report, or a feature request, ask for the details if not provided, 
    and then use the 'submitFeedback' tool to send it.
    
    If the user says "I want to leave feedback" without details, ask them what they would like to say.
    Once the feedback is submitted, confirm to the user that it has been received.
    
    Be concise and friendly.
  `

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: systemPrompt,
    messages,
    tools: {
      submitFeedback: tool({
        description: "Submit user feedback, bug reports, or feature requests to the support team.",
        parameters: z.object({
          message: z.string().describe("The content of the feedback, bug report, or feature request."),
          email: z.string().email().optional().describe("The user's email address for follow-up."),
          type: z.enum(["feedback", "bug", "feature"]).optional().default("feedback").describe("The type of submission."),
        }),
        execute: async ({ message, email, type }) => {
          try {
            const webhookUrl = process.env.N8N_FEEDBACK_WEBHOOK_URL
            
            if (!webhookUrl) {
              console.error("N8N_FEEDBACK_WEBHOOK_URL is not defined")
              return { success: false, error: "Feedback service configuration missing" }
            }

            // Use the email from the tool call, or fallback to the one in system prompt (if the LLM extracts it),
            // but simpler to just pass what we have.
            // Ideally the LLM passes the email if it knows it.
            
            const payload = {
              message,
              email: email || (userInfo?.email) || "anonymous",
              type,
              source: "ai-chat",
              user: userInfo,
              timestamp: new Date().toISOString(),
            }

            const response = await fetch(webhookUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })

            if (!response.ok) {
              return { success: false, error: "Failed to send to external service" }
            }
            
            return { success: true, message: "Feedback submitted successfully" }
          } catch (error) {
            console.error("Error in submitFeedback tool:", error)
            return { success: false, error: "Internal server error during submission" }
          }
        },
      }),
    },
  })

  return result.toDataStreamResponse()
}
