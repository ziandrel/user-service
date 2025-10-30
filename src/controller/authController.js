import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import {
  findUserByEmail,
  findUserByPhone,
  createUser,
  createSeller,
  saveUserPreferences,
  getUserPreferences,
} from "../model/userModel.js";
import { pool } from "../config/db.js";
import { sendVerificationCodeEmail } from "../utils/sendVerificationEmail.js";
import User from "../model/userModel.js";

// Replace with your actual Google Client ID
const client = new OAuth2Client(
  "1023403274598-s5af7lju6vva7e2aoqvp3185ke568r8n.apps.googleusercontent.com"
);

export const loginUser = async (req, res) => {
  const { email, phone, password } = req.body;

  if ((!email && !phone) || !password)
    return res.status(400).json({ message: "All fields are required" });

  try {
    const user = email
      ? await findUserByEmail(email)
      : await findUserByPhone(phone);

    if (!user) return res.status(401).json({ message: "User not found." });

    // 🔒 Check if user verified their email
    if (!user.is_verified) {
      return res.status(403).json({
        message:
          "Your email is not verified. Please check your inbox and verify your email before logging in.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordhash);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.userid, email: user.email, role: user.role },
      "LOGIN_KEY",
      { expiresIn: "1d" }
    );

    res.status(200).json({
      token,
      user: {
        id: user.userid,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const registerUser = async (req, res) => {
  const { name, email, password, phone, role } = req.body;
  if (!name || !email || !password || !phone || !role) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const hashed = await bcrypt.hash(password, 10);

    // Generate 6-digit numeric verification code and expiry (10 minutes)
    // const verification_code = Math.floor(
    //   100000 + Math.random() * 900000
    // ).toString();
    // const code_expires_at = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const userId = await createUser({
      name,
      email,
      passwordhash: hashed,
      phone,
      role,
      is_verified: false,
      needs_password: false,
    });

    // Send verification email with the 6-digit code (non-blocking best effort)
    // try {
    //   await sendVerificationCodeEmail(email, verification_code);
    // } catch (emailErr) {
    //   console.error("Failed to send verification email:", emailErr);
    //   // You may still want to return 201 but inform the client that email failed:
    //   return res.status(201).json({
    //     message:
    //       "Registration created but failed to send verification email. Contact support or try resending verification.",
    //     userId,
    //   });
    // }

    res.status(201).json({
      message:
        "Registration successful. A 6-digit verification code has been sent to your email.",
      userId,
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const googleLogin = async (req, res) => {
  const { credential, password, phone } = req.body;

  if (!credential) {
    return res.status(400).json({ message: "No credential provided" });
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience:
        "1023403274598-s5af7lju6vva7e2aoqvp3185ke568r8n.apps.googleusercontent.com",
    });

    const payload = ticket.getPayload();
    const { email, name } = payload;

    let user = await findUserByEmail(email);

    if (!user) {
      // If password not provided yet, request it
      if (!password) {
        return res.status(200).json({
          requiresPassword: true,
          message: "Please set a password to complete your account setup.",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      await createUser({
        name,
        email,
        passwordhash: hashedPassword,
        phone: phone || null,
        role: "Customer",
        is_verified: true,
        needs_password: false,
      });

      user = await findUserByEmail(email);
    } else if (user.needs_password) {
      if (!password) {
        return res.status(200).json({
          requiresPassword: true,
          message: "Please set a password to complete your account setup.",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.query(
        "UPDATE users SET passwordhash = ?, needs_password = FALSE WHERE email = ?",
        [hashedPassword, email]
      );

      user = await findUserByEmail(email);
    }

    const token = jwt.sign(
      { id: user.userid, email: user.email, role: user.role },
      "LOGIN_KEY",
      { expiresIn: "1d" }
    );

    res.status(200).json({
      token,
      user: {
        id: user.userid,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Google login error:", error.message, error.stack);
    res.status(500).json({ message: "Google authentication failed" });
  }
};

export const verifyEmail = async (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).send(`
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f8f9fa;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
            }
            .card {
              background: #fff;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0px 4px 12px rgba(0,0,0,0.1);
              text-align: center;
              max-width: 400px;
            }
            .error {
              color: #e63946;
              font-size: 22px;
              margin-bottom: 12px;
            }
            a {
              text-decoration: none;
              color: #0077b6;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="error">⚠️ Verification token is required.</div>
            <p>Please check your verification link.</p>
            <a href="/">Return to Home</a>
          </div>
        </body>
      </html>
    `);
  }

  try {
    const [result] = await pool.query(
      `UPDATE users 
       SET is_verified = TRUE, verification_token = NULL, expires_at = NULL 
       WHERE verification_token = ? AND expires_at > NOW()`,
      [token]
    );

    if (result.affectedRows === 0) {
      return res.status(400).send(`
        <html>
          <head>
            <style>
              body {
                font-family: Arial, sans-serif;
                background-color: #f8f9fa;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
              }
              .card {
                background: #fff;
                padding: 40px;
                border-radius: 12px;
                box-shadow: 0px 4px 12px rgba(0,0,0,0.1);
                text-align: center;
                max-width: 400px;
              }
              .error {
                color: #e63946;
                font-size: 22px;
                margin-bottom: 12px;
              }
              a {
                text-decoration: none;
                color: #0077b6;
                font-weight: bold;
              }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="error">❌ Invalid or expired token.</div>
              <p>Please request a new verification email.</p>
              <a href="/">Return to Home</a>
            </div>
          </body>
        </html>
      `);
    }

    res.send(`
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f0fff4;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
            }
            .card {
              background: #fff;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0px 4px 12px rgba(0,0,0,0.1);
              text-align: center;
              max-width: 400px;
            }
            .success {
              color: #2d6a4f;
              font-size: 22px;
              margin-bottom: 12px;
            }
            a {
              text-decoration: none;
              color: #1d3557;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="success">✅ Email verified successfully!</div>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Email verification error:", error);
    res.status(500).send(`
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #fff5f5;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
            }
            .card {
              background: #fff;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0px 4px 12px rgba(0,0,0,0.1);
              text-align: center;
              max-width: 400px;
            }
            .error {
              color: #d00000;
              font-size: 22px;
              margin-bottom: 12px;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="error">⚠️ Server error occurred.</div>
            <p>Please try again later.</p>
          </div>
        </body>
      </html>
    `);
  }
};

export const checkEmail = async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const user = await findUserByEmail(email);
    return res.json({ exists: !!user });
  } catch (error) {
    console.error("Check email error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const sendVerification = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const user = await findUserByEmail(email);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Generate 6-digit OTP
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // expires in 10 min

    // Save to DB
    await pool.query(
      `UPDATE users SET verification_code = ?, code_expires_at = ? WHERE email = ?`,
      [verificationCode, expiresAt, email]
    );

    // Send email
    await sendVerificationCodeEmail(email, verificationCode);

    return res.json({ message: "Verification code sent to your email" });
  } catch (error) {
    console.error("Send verification code error:", error);
    res.status(500).json({ message: "Failed to send verification code" });
  }
};

export const verifyCode = async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code)
    return res.status(400).json({ message: "Email and code are required" });

  try {
    const [rows] = await pool.query(
      `SELECT verification_code, code_expires_at FROM users WHERE email = ?`,
      [email]
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "User not found" });

    const user = rows[0];
    if (user.verification_code !== code)
      return res.status(400).json({ message: "Invalid verification code" });

    if (new Date() > new Date(user.code_expires_at))
      return res.status(400).json({ message: "Verification code expired" });

    await pool.query(
      `UPDATE users SET is_verified = TRUE, verification_code = NULL, code_expires_at = NULL WHERE email = ?`,
      [email]
    );

    res.json({ success: true, message: "Email verified successfully!" });
  } catch (error) {
    console.error("Verify code error:", error);
    res.status(500).json({ message: "Server error during verification" });
  }
};

export const registerSeller = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password || !phone || !role) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: "Email is already in use." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userId = await createSeller({
      name,
      email,
      passwordhash: hashedPassword,
      phone,
      role,
      verification_token: null,
    });

    const token = jwt.sign({ id: userId, role }, "SECRET_KEY", {
      expiresIn: "7d",
    });

    res.status(201).json({
      message: "Seller registered successfully",
      user: { id: userId, name, email, phone, role },
      token,
    });
  } catch (error) {
    console.error("Server error during seller registration:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const loginSeller = async (req, res) => {
  const { email, phone, password } = req.body;

  if ((!email && !phone) || !password)
    return res.status(400).json({ message: "All fields are required" });

  try {
    const user = email
      ? await findUserByEmail(email)
      : await findUserByPhone(phone);

    if (!user || user.role !== "Seller") {
      return res.status(401).json({ message: "Seller not found." });
    }

    const isMatch = await bcrypt.compare(password, user.passwordhash);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.userid, email: user.email, role: user.role },
      "LOGIN_KEY",
      { expiresIn: "1d" }
    );

    res.status(200).json({
      token,
      user: {
        id: user.userid,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Seller login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const setUserPreferences = async (req, res) => {
  const { userId, categories } = req.body;

  if (!userId || !Array.isArray(categories)) {
    return res.status(400).json({ message: "Invalid data" });
  }

  try {
    await saveUserPreferences(userId, categories);
    res.status(200).json({ message: "Preferences saved" });
  } catch (error) {
    console.error("Set preferences error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getUserPreferencesHandler = async (req, res) => {
  const { userId } = req.params;

  if (!userId) return res.status(400).json({ message: "User ID required" });

  try {
    const categories = await getUserPreferences(userId);
    console.log("Fetched user preferences:", categories);
    res.json({ preferences: categories });
  } catch (error) {
    console.error("Get preferences error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const loginRider = async (req, res) => {
  const { email, phone, password } = req.body;

  if ((!email && !phone) || !password)
    return res.status(400).json({ message: "All fields are required" });

  try {
    const user = email
      ? await findUserByEmail(email)
      : await findUserByPhone(phone);

    if (!user || user.role !== "Rider") {
      return res.status(401).json({ message: "Rider not found." });
    }

    const isMatch = await bcrypt.compare(password, user.passwordhash);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.userid, email: user.email, role: user.role },
      "LOGIN_KEY",
      { expiresIn: "1d" }
    );

    res.status(200).json({
      token,
      user: {
        id: user.userid,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Rider login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

//AMIN-PANEL SIDE

export const getUsers = async (req, res) => {
  try {
    const users = await User.get();
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

export const adminCreateUser = async (req, res) => {
  try {
    const {
      name,
      email,
      passwordhash,
      phone,
      role,
      street,
      city,
      province,
      zip,
    } = req.body;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(passwordhash, salt);

    const newUser = await User.create({
      name,
      email,
      passwordhash: hashedPassword,
      phone,
      role,
      street,
      city,
      province,
      zip,
    });

    res.status(201).json(newUser);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
};

export const updateUser = async (req, res) => {
  const { id } = req.params;
  try {
    const updatedUser = await User.update(id, req.body);
    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
};

export const deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    await User.delete(id);
    res.json({ message: "User deleted" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
};

export const changeUserPassword = async (req, res) => {
  const userid = req.params.id;
  const { currentPassword, newPassword } = req.body;

  try {
    const user = await User.getById(userid);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const validPassword = await bcrypt.compare(
      currentPassword,
      user.passwordhash
    );
    if (!validPassword) {
      return res
        .status(401)
        .json({ success: false, message: "Current password is incorrect" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await User.updatePassword(userid, hashedPassword);

    res.json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
