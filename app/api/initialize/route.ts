import { prisma } from "@/app/lib/prisma";
import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      fullName,
      username,
      email,
      password,
      securityQuestion,
      securityAnswer,
    } = body;

    // BLOCK IF SYSTEM ALREADY INITIALIZED
    const existingAdmin = await prisma.user.findFirst({
      where: { role: "ADMINISTRATOR" },
    });

    if (existingAdmin) {
      return NextResponse.json(
        { success: false, message: "System already initialized" },
        { status: 403 }
      );
    }

    // CHECK IF USERNAME ALREADY TAKEN
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "Username already exists" },
        { status: 400 }
      );
    }

    // CREATE ADMIN USER
    const user = await prisma.user.create({
      data: {
        fullName,
        username,
        email,
        password,
        role: "ADMINISTRATOR",
        securityQuestion,
        securityAnswer,
      },
    });

    // SEND EMAIL IN BACKGROUND
    resend.emails.send({
      from: "Main Street EMR <onboarding@resend.dev>",
      to: email,
      subject: "Main Street EMR System Initialized",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="color:#166534;">Welcome to Main Street EMR</h1>
          <p>Hello ${fullName},</p>
          <p>Your administrator account has been successfully created. Please check your email for confirmation.</p>
          <div style="background:#f3f4f6; padding:15px; border-radius:10px; margin-top:20px;">
            <p><strong>Username:</strong> ${username}</p>
            <p><strong>Role:</strong> Administrator</p>
          </div>
          <p style="margin-top:20px;">You can now log in and start assigning roles to your staff.</p>
          <p>Thank you for choosing Main Street EMR.</p>
        </div>
      `,
    }).catch((err) => console.error("Email failed:", err));

    return NextResponse.json({
      success: true,
      message: "System initialized successfully",
      user,
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "Failed to initialize system" },
      { status: 500 }
    );
  }
}