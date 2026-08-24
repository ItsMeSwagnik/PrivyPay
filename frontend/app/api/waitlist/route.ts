import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { email, source } = await request.json()

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 })
    }

    // TODO: Add database integration
    // Example with Supabase:
    // const supabase = createServerClient(...)
    // const { data, error } = await supabase
    //   .from('waitlist_signups')
    //   .insert([{ email: email.toLowerCase(), source }])

    // For now, just log and return success
    console.log("[v0] Waitlist signup:", email, source)

    return NextResponse.json({ success: true, message: "Successfully joined waitlist" }, { status: 200 })
  } catch (error) {
    console.error("[v0] Waitlist error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
