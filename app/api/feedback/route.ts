import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const webhookUrl = process.env.N8N_FEEDBACK_WEBHOOK_URL

    if (!webhookUrl) {
      console.error("N8N_FEEDBACK_WEBHOOK_URL is not defined")
      return NextResponse.json(
        { error: "Feedback service not configured" },
        { status: 500 }
      )
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to send feedback to external service" },
        { status: response.status }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error processing feedback:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
