// src/utils/sendVerificationEmail.js
import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendVerificationCodeEmail = async (email, code) => {
  try {
    await resend.emails.send({
      from: process.env.SENDER_EMAIL || "motobook@gmail.com",
      to: email,
      subject: "MotoBook Email Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; background: #f4f7fb; padding: 30px; color: #333;">
          <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; box-shadow: 0 2px 6px rgba(0,0,0,0.1); overflow: hidden;">
            <div style="background: #4CAF50; padding: 20px; text-align: center;">
              <h1 style="color: #fff; margin: 0; font-size: 24px;">MotoBook</h1>
            </div>
            <div style="padding: 30px; text-align: center;">
              <h2 style="color: #333;">Your Verification Code</h2>
              <p style="font-size: 16px; color: #555;">
                Enter this code in the MotoBook app to verify your email:
              </p>
              <div style="font-size: 30px; font-weight: bold; letter-spacing: 5px; color: #4CAF50;">
                ${code}
              </div>
              <p style="font-size: 14px; color: #777;">
                This code will expire in 10 minutes.
              </p>
            </div>
            <div style="background: #f0f0f0; padding: 15px; text-align: center; font-size: 12px; color: #777;">
              © ${new Date().getFullYear()} MotoBook. All rights reserved.
            </div>
          </div>
        </div>
      `,
    });

    console.log(`✅ Verification email sent to ${email}`);
  } catch (error) {
    console.error("❌ Failed to send verification email:", error);
    throw error;
  }
};
