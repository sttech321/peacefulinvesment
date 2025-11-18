import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const { contactData } = await req.json();

    // Validate required fields
    if (!contactData.full_name || !contactData.email || !contactData.subject || !contactData.message) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Here you would integrate with your email service
    // For now, we'll just log the contact request
    console.log("Contact form submission received:", {
      fullName: contactData.full_name,
      email: contactData.email,
      subject: contactData.subject,
      priority: contactData.priority,
      message: contactData.message,
      contactMethod: contactData.contact_method,
      timestamp: new Date().toISOString(),
    });

    // In a real implementation, you would:
    // 1. Send email to support team
    // 2. Send confirmation email to user
    // 3. Create ticket in support system
    // 4. Send notification to admin dashboard

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Contact notification sent successfully" 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });

  } catch (error) {
    console.error("Error processing contact notification:", error);
    
    return new Response(JSON.stringify({ 
      error: "Internal server error" 
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});
