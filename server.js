import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import Message from "./message.js";

dotenv.config();

const app = express();
app.use((req, res, next) => {
  console.log("Incoming:", req.method, req.url);
  next();
});
const PORT = process.env.PORT || 1000;

app.use(bodyParser.json());
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

console.log("User:", process.env.EMAIL_USER);
console.log("Pass:", process.env.EMAIL_PASSWORD ? "Loaded ✅" : "Missing ❌");


const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

app.get("/test-email", async (req, res) => {
  try {
    await transporter.sendMail({
      from: `"Portfolio contact email Test" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_TO,
      subject: "Test Email from Portfolio contact email",
      text: "Hello! This is a test email from your backend.",
    });
    res.send("Test email sent! Check your inbox.");
  } catch (err) {
    console.error("Error sending test email:", err);
    res.status(500).send("Failed to send test email");
  }
});

app.post("/api/contact", async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    // Save to MongoDB
    const newMessage = new Message({ name, email, message });
    await newMessage.save();

    await transporter.sendMail({
      from: `"Portfolio Website" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_TO,
      subject: `New Contact Form Message from ${name}`,
      replyTo: email,
      html: `
    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9f9f9;">
      <h2 style="color: #4f7a20; margin-bottom: 15px;"> New Contact Form Submission</h2>
      
      <p style="margin: 5px 0;"><strong style="color:#555;">Name:</strong> ${name}</p>
      <p style="margin: 5px 0;"><strong style="color:#555;">Email:</strong> ${email}</p>
      
      <p style="margin: 10px 0;"><strong style="color:#555;">Message:</strong></p>
      <div style="background: #fff; padding: 15px; border: 1px solid #4f7a20; border-radius: 5px; line-height: 1.5;">
        ${message}
      </div>
      
      <p style="margin-top: 20px; font-size: 12px; color: #888;">
        ⚡ This message was sent from your website contact form.
      </p>
    </div>
  `,
    });

    res.status(200).json({ success: "Message stored and sent successfully!" });
  } catch (err) {
    console.error("Error handling message:", err);
    res.status(500).json({ error: "Failed to process message" });
  }
});

app.get("/", (req, res) => {
  res.send("✅ Server is running...");
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
