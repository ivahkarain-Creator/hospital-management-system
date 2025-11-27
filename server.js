// ------------------------------
// server.js - Patient Follow-up System
// ------------------------------

require('dotenv').config(); // load environment variables FIRST

const express = require("express");
const session = require("express-session"); 
const cors = require("cors");
const sql = require("mssql");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const { Document, Packer, Paragraph, TextRun } = require("docx");
const crypto = require("crypto");

// ✅ CREATE APP BEFORE USING IT
const app = express();

// ------------------------------
// MIDDLEWARES
// ------------------------------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/login.html")); // or whichever page you want
});



// -------------------------------
// SQL Server configuration
// -------------------------------
const config = {
  user: process.env.DB_USER || "node_user",
  password: process.env.DB_PASS || "MyStrongPassword123",
  server: process.env.DB_HOST || "DESKTOP-KMC7JCO", // your server
  database: process.env.DB_NAME || "patient_system",
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

// Helper to get a global pool
async function getPool() {
  if (!sql.connected) {
    return await sql.connect(config);
  }
  return sql.globalConnection || (sql.globalConnection = await sql.connect(config));
}

// Test DB connection on startup
(async function testConnection() {
  try {
    await getPool();
    console.log("✅ Connected successfully to SQL Server!");
  } catch (err) {
    console.error("❌ Database connection failed:", err);
  }
})();

// -------------------------------
// Nodemailer transporter
// -------------------------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD
  }
});

// -------------------------------
// LOGIN ROUTE
// -------------------------------
app.post("/login", async (req, res) => {
  const { loginId, password } = req.body;

  if (!loginId || !password) {
    return res.status(400).json({ success: false, message: "Missing credentials" });
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("loginId", sql.NVarChar, loginId)
      .query("SELECT * FROM users WHERE username = @loginId OR userID = @loginId");

    if (result.recordset.length === 0) {
      return res.json({ success: false, message: "User not found" });
    }

    const user = result.recordset[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.json({ success: false, message: "Incorrect password" });
    }

    res.json({
      success: true,
      message: "Login successful",
      role: user.role,
      username: user.username,
      userID: user.userID
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Server error during login" });
  }
});

// -------------------------------
// FORGOT PASSWORD ROUTE
// -------------------------------
// -------------------------------
// FORGOT PASSWORD ROUTE (UPDATED)
// -------------------------------
app.post("/forgot-password", async (req, res) => {
  const { email, username } = req.body;

  if (!email && !username) {
    return res.status(400).json({ message: "Enter email or username", success: false });
  }

  try {
    const pool = await getPool();
    let userQuery;

    // Search by email or username
    if (email) {
      userQuery = await pool.request()
        .input("email", sql.NVarChar, email)
        .query("SELECT * FROM users WHERE email = @email");
    } else {
      userQuery = await pool.request()
        .input("username", sql.NVarChar, username)
        .query("SELECT * FROM users WHERE username = @username");
    }

    if (userQuery.recordset.length === 0) {
      return res.status(404).json({ message: "User not found", success: false });
    }

    const user = userQuery.recordset[0];

    if (!user.email) {
      return res.status(400).json({
        success: false,
        message: "This user does not have an email saved. Cannot send reset link."
      });
    }

    const userEmail = user.email;

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const tokenExpires = new Date(Date.now() + 3600000); // 1 hour

    const resetLink = `http://localhost:${process.env.PORT}/reset-password.html?token=${resetToken}&email=${encodeURIComponent(userEmail)}`;

    // Store reset token
    await pool.request()
      .input("email", sql.NVarChar, userEmail)
      .input("resetToken", sql.NVarChar, resetToken)
      .input("tokenExpires", sql.DateTime, tokenExpires)
      .query(`
        UPDATE users 
        SET resetToken = @resetToken,
            resetTokenCreatedAt = GETDATE(),
            resetTokenExpires = @tokenExpires
        WHERE email = @email
      `);

    // Send email
    await transporter.sendMail({
      from: `"Patient Follow-up System" <${process.env.EMAIL}>`,
      to: userEmail,
      subject: "Password Reset Request",
      html: `
        <h2>Password Reset Request</h2>
        <p>Click the link below to reset your password. Expires in 1 hour.</p>
        <a href="${resetLink}" 
          style="padding:10px 20px; background:#0078d7; color:#fff; text-decoration:none; border-radius:5px;">
          Reset Password
        </a>
      `
    });

    res.status(200).json({
      success: true,
      message: `Reset link sent to ${userEmail}`
    });

  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ success: false, message: "Server error during password reset" });
  }
});


// -------------------------------
// RESET PASSWORD ROUTE
// -------------------------------
// -------------------------------
// RESET PASSWORD ROUTE (UPDATED)
// -------------------------------
app.post("/reset-password", async (req, res) => {
  const { email, token, newPassword } = req.body;

  if (!email || !token || !newPassword) {
    return res.status(400).json({ success: false, message: "Missing fields" });
  }

  try {
    const pool = await getPool();

    const userResult = await pool.request()
      .input("email", sql.NVarChar, email)
      .input("resetToken", sql.NVarChar, token)
      .query("SELECT * FROM users WHERE email = @email AND resetToken = @resetToken");

    if (userResult.recordset.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid or expired token" });
    }

    const user = userResult.recordset[0];

    const now = new Date();
    if (user.resetTokenExpires && now > user.resetTokenExpires) {
      return res.status(400).json({ success: false, message: "Token has expired" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.request()
      .input("email", sql.NVarChar, email)
      .input("password", sql.NVarChar, hashedPassword)
      .query(`
        UPDATE users 
        SET password = @password,
            resetToken = NULL,
            resetTokenCreatedAt = NULL,
            resetTokenExpires = NULL
        WHERE email = @email
      `);

    res.status(200).json({
      success: true,
      message: "Password has been reset successfully"
    });

  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ success: false, message: "Server error during password reset" });
  }
});


// ================================
// PATIENT ROUTES (UPDATED)
// ================================

// ------------------------
// GET ALL PATIENTS
// ------------------------
app.get("/patients", async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT 
        patientID,
        fullName,
        age,
        gender,
        phone,
        email,
        notes,
        status
      FROM patients
      ORDER BY fullName ASC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("❌ Error fetching patients:", err);
    res.status(500).json({ message: "Server error fetching patients." });
  }
});


// ------------------------
// ADD NEW PATIENT
// ------------------------
app.post("/patients/add", async (req, res) => {
  let { patientID, fullName, age, gender, phone, email, notes, status } = req.body;

  // AUTO-GENERATE patientID if empty (because form uses readonly field)
  if (!patientID || patientID.trim() === "") {
    patientID = "P" + Date.now(); // Example: P1739500000000
  }

  // Validate required fields (patientID is now guaranteed)
  if (!fullName || !phone || !email) {
    return res.status(400).json({ message: "Required fields missing." });
  }

  try {
    const pool = await sql.connect(config);

    // Prevent duplicate patientID
    const check = await pool.request()
      .input("patientID", sql.NVarChar, patientID)
      .query("SELECT patientID FROM patients WHERE patientID=@patientID");

    if (check.recordset.length > 0) {
      return res.status(400).json({ message: "Patient ID already exists." });
    }

    await pool.request()
      .input("patientID", sql.NVarChar, patientID)
      .input("fullName", sql.NVarChar, fullName)
      .input("age", sql.Int, age || null)
      .input("gender", sql.NVarChar, gender)
      .input("phone", sql.NVarChar, phone)
      .input("email", sql.NVarChar, email)
      .input("notes", sql.NVarChar, notes || null)
      .input("status", sql.NVarChar, status || "Active")
      .query(`
        INSERT INTO patients 
        (patientID, fullName, age, gender, phone, email, notes, status)
        VALUES 
        (@patientID, @fullName, @age, @gender, @phone, @email, @notes, @status)
      `);

    res.status(200).json({ message: "Patient added successfully", patientID });

  } catch (err) {
    console.error("❌ Error adding patient:", err);
    res.status(500).json({ message: "Server error adding patient" });
  }
});

// ------------------------
// UPDATE PATIENT
// ------------------------
app.put("/patients/update", async (req, res) => {
  const { patientID, fullName, age, gender, phone, email, notes } = req.body;

  if (!patientID)
    return res.status(400).json({ message: "PatientID is required for update." });

  try {
    const pool = await sql.connect(config);

    const update = await pool.request()
      .input("patientID", sql.NVarChar, patientID)
      .input("fullName", sql.NVarChar, fullName)
      .input("age", sql.Int, age || null)
      .input("gender", sql.NVarChar, gender)
      .input("phone", sql.NVarChar, phone)
      .input("email", sql.NVarChar, email)
      .input("notes", sql.NVarChar, notes || null)
      .query(`
        UPDATE patients
        SET 
          fullName=@fullName,
          age=@age,
          gender=@gender,
          phone=@phone,
          email=@email,
          notes=@notes
        WHERE patientID=@patientID
      `);

    if (update.rowsAffected[0] === 0)
      return res.status(404).json({ message: "Patient not found." });

    res.status(200).json({ message: "Patient updated successfully" });

  } catch (err) {
    console.error("❌ Error updating patient:", err);
    res.status(500).json({ message: "Server error updating patient" });
  }
});


// ------------------------------
// DEACTIVATE PATIENT (Soft Delete)
// ------------------------------
app.put("/patients/deactivate/:id", async (req, res) => {
  const { id } = req.params;

  if (!id)
    return res.status(400).json({ message: "PatientID is required." });

  try {
    const pool = await sql.connect(config);

    const deactivate = await pool.request()
      .input("patientID", sql.NVarChar, id)
      .query(`
        UPDATE patients 
        SET status = 'Inactive'
        WHERE patientID = @patientID
      `);

    if (deactivate.rowsAffected[0] === 0)
      return res.status(404).json({ message: "Patient not found." });

    res.status(200).json({ message: "Patient deactivated successfully" });

  } catch (err) {
    console.error("❌ Error deactivating patient:", err);
    res.status(500).json({ message: "Server error deactivating patient" });
  }
});



///===APPOINTMENTS ROUTES===////
// -----------------------------
// APPOINTMENTS API
// -----------------------------

// GET all appointments
app.get("/appointments", async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT appointmentID, patientID, patientName, appointmentDate, doctorID, doctorUsername, purpose, status
      FROM appointments
      ORDER BY appointmentDate DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching appointments:", err);
    res.status(500).json({ message: "Error fetching appointments" });
  }
});

// Check doctor availability (body: { doctorID, appointmentDate })
app.post("/appointments/check-availability", async (req, res) => {
  const { doctorID, appointmentDate } = req.body;
  if (!doctorID || !appointmentDate) return res.status(400).json({ message: "Missing fields" });
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("doctorID", sql.NVarChar, doctorID)
      .input("appointmentDate", sql.DateTime, appointmentDate)
      .query("SELECT 1 FROM appointments WHERE doctorID = @doctorID AND appointmentDate = @appointmentDate");

    res.json({ available: result.recordset.length === 0 });
  } catch (err) {
    console.error("Availability check error:", err);
    res.status(500).json({ message: "Error checking availability" });
  }
});

// GET patient by patientID (returns { patientID, fullName, email })
app.get("/patients/:id", async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("patientID", sql.NVarChar, req.params.id)
      .query("SELECT patientID, fullName, email FROM patients WHERE patientID = @patientID");
    if (!result.recordset.length) return res.status(404).json({ message: "Patient not found" });
    res.json(result.recordset[0]);
  } catch (err) {
    console.error("Fetch patient error:", err);
    res.status(500).json({ message: "Error fetching patient" });
  }
});

// GET user by userID (Doctor/Nurse) (returns { userID, username, role })
app.get("/users/:id", async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("userID", sql.NVarChar, req.params.id)
      .query("SELECT userID, username, role FROM users WHERE userID = @userID");
    if (!result.recordset.length) return res.status(404).json({ message: "User not found" });
    res.json(result.recordset[0]);
  } catch (err) {
    console.error("Fetch user error:", err);
    res.status(500).json({ message: "Error fetching user" });
  }
});

// Add appointment (validates, availability, saves, sends email)
app.post("/appointments/add", async (req, res) => {
  const { patientID, patientName, appointmentDate, doctorID, doctorUsername, purpose, status } = req.body;

  // minimal required fields
  if (!patientID || !appointmentDate || !doctorID || !doctorUsername || !status) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  // parse and validate appointmentDate
  const apptDate = new Date(appointmentDate);
  if (isNaN(apptDate.getTime())) return res.status(400).json({ message: "Invalid appointment date" });
  if (apptDate <= new Date()) return res.status(400).json({ message: "Appointment must be in the future" });

  try {
    const pool = await getPool();

    // validate patient exists and has email
    const pRes = await pool.request()
      .input("pid", sql.NVarChar, patientID)
      .query("SELECT patientID, fullName, email FROM patients WHERE patientID = @pid");
    if (!pRes.recordset.length) return res.status(400).json({ message: "Invalid patient ID" });
    const patient = pRes.recordset[0];
    if (!patient.email) return res.status(400).json({ message: "Patient has no email registered" });

    // validate doctor/nurse
    const dRes = await pool.request()
      .input("did", sql.NVarChar, doctorID)
      .query("SELECT userID, username, role FROM users WHERE userID = @did");
    if (!dRes.recordset.length) return res.status(400).json({ message: "Invalid doctor/nurse ID" });
    const doctor = dRes.recordset[0];
    if (!["Doctor", "Nurse"].includes(doctor.role)) return res.status(400).json({ message: "Selected user is not a doctor or nurse" });
    if (doctor.username !== doctorUsername) return res.status(400).json({ message: "Doctor username does not match user record" });

    // check availability (same exact timestamp)
    const avail = await pool.request()
      .input("doctorID", sql.NVarChar, doctorID)
      .input("appointmentDate", sql.DateTime, appointmentDate)
      .query("SELECT 1 FROM appointments WHERE doctorID = @doctorID AND appointmentDate = @appointmentDate");
    if (avail.recordset.length > 0) return res.status(400).json({ message: "Doctor not available at this time" });

    // insert appointment
    await pool.request()
      .input("patientID", sql.NVarChar, patientID)
      .input("patientName", sql.NVarChar, patientName || patient.fullName)
      .input("appointmentDate", sql.DateTime, appointmentDate)
      .input("doctorID", sql.NVarChar, doctorID)
      .input("doctorUsername", sql.NVarChar, doctorUsername)
      .input("purpose", sql.NVarChar, purpose || null)
      .input("status", sql.NVarChar, status)
      .query(`
        INSERT INTO appointments (patientID, patientName, appointmentDate, doctorID, doctorUsername, purpose, status)
        VALUES (@patientID, @patientName, @appointmentDate, @doctorID, @doctorUsername, @purpose, @status)
      `);

    // send email (await inside async route)
    const mailOptions = {
      from: process.env.EMAIL, // set in .env
      to: patient.email,
      subject: "Appointment Scheduled",
      html: `
        <h3>Appointment Confirmation</h3>
        <p>Dear ${patient.fullName || patientName},</p>
        <p>Your appointment is scheduled for <b>${apptDate.toLocaleString()}</b> with <b>${doctorUsername}</b>.</p>
        <p>Purpose: ${purpose || "Not specified"}</p>
        <p>Status: ${status}</p>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log("Email sent to", patient.email);
    } catch (emailErr) {
      console.error("Email send failed:", emailErr);
      // do not fail the whole request if email fails
    }

    return res.json({ message: "Appointment added successfully" });
  } catch (err) {
    console.error("Add appointment error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});


// =========================================
// FOLLOW-UP ROUTES




/** ==============================
 * GET all follow-ups
 * ============================== */
app.get("/followups", async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT recordID, patientID, fullname, appointmentDate, nextVisitDate, notes, status
      FROM followups
      ORDER BY appointmentDate DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching follow-ups:", err);
    res.status(500).json({ message: "Error fetching follow-ups" });
  }
});

/** ==============================
 * ADD a follow-up
 * ============================== */
app.post("/followups/add", async (req, res) => {
  const { patientID, fullname, appointmentDate, nextVisitDate, notes, status } = req.body;

  if (!patientID || !appointmentDate || !status) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const apptDate = appointmentDate ? new Date(appointmentDate) : null;
    const nextDate = nextVisitDate ? new Date(nextVisitDate) : null;

    const pool = await getPool();

    await pool.request()
      .input("patientID", sql.NVarChar, patientID)
      .input("fullname", sql.NVarChar, fullname || null)
      .input("appointmentDate", sql.Date, apptDate)
      .input("nextVisitDate", sql.Date, nextDate)
      .input("notes", sql.NVarChar, notes || null)
      .input("status", sql.NVarChar, status)
      .query(`
        INSERT INTO followups (patientID, fullname, appointmentDate, nextVisitDate, notes, status)
        VALUES (@patientID, @fullname, @appointmentDate, @nextVisitDate, @notes, @status)
      `);

    // Optional email
    const patientRes = await pool.request()
      .input("pid", sql.NVarChar, patientID)
      .query("SELECT email FROM patients WHERE patientID = @pid");

    const patient = patientRes.recordset[0];
    if (patient && patient.email) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL,
          to: patient.email,
          subject: "Follow-up Record Added",
          html: `<p>Dear ${fullname || "Patient"}, your follow-up record has been added. Next visit: ${nextVisitDate || "N/A"}.</p>`
        });
      } catch (mailErr) {
        console.error("Email sending failed:", mailErr);
      }
    }

    res.json({ message: "Follow-up added successfully" });

  } catch (err) {
    console.error("Add follow-up error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/** ==============================
 * UPDATE a follow-up
 * ============================== */
app.put("/followups/update/:id", async (req, res) => {
  const { patientID, fullname, appointmentDate, nextVisitDate, notes, status } = req.body;

  if (!patientID || !appointmentDate || !status) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const apptDate = appointmentDate ? new Date(appointmentDate) : null;
    const nextDate = nextVisitDate ? new Date(nextVisitDate) : null;

    const pool = await getPool();

    await pool.request()
      .input("id", sql.Int, req.params.id)
      .input("patientID", sql.NVarChar, patientID)
      .input("fullname", sql.NVarChar, fullname || null)
      .input("appointmentDate", sql.Date, apptDate)
      .input("nextVisitDate", sql.Date, nextDate)
      .input("notes", sql.NVarChar, notes || null)
      .input("status", sql.NVarChar, status)
      .query(`
        UPDATE followups
        SET patientID=@patientID,
            fullname=@fullname,
            appointmentDate=@appointmentDate,
            nextVisitDate=@nextVisitDate,
            notes=@notes,
            status=@status
        WHERE recordID=@id
      `);

    res.json({ message: "Follow-up updated successfully" });

  } catch (err) {
    console.error("Update follow-up error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/** ==============================
 * DELETE a follow-up
 * ============================== */
app.delete("/followups/delete/:id", async (req, res) => {
  try {
    const pool = await getPool();

    await pool.request()
      .input("id", sql.Int, req.params.id)
      .query("DELETE FROM followups WHERE recordID=@id");

    res.json({ message: "Follow-up deleted successfully" });

  } catch (err) {
    console.error("Delete follow-up error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


/// -------------------------------
// USER MANAGEMENT ROUTES
// -------------------------------

// Get all users
app.get("/users", async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        id,
        userID,
        fullname,
        age,
        gender,
        role,
        username,
        email,
        contact
      FROM users
      ORDER BY id DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Error fetching users" });
  }
});

// Add new user
app.post("/users/add", async (req, res) => {
  let { userID, fullname, age, gender, role, username, password, email, contact } = req.body;

  if (!userID || !fullname || !role || !username || !password)
    return res.status(400).json({ message: "Missing required fields" });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const pool = await getPool();
    await pool.request()
      .input("userID", sql.NVarChar, userID)
      .input("fullname", sql.NVarChar, fullname)
      .input("age", sql.Int, age || null)
      .input("gender", sql.NVarChar, gender || null)
      .input("role", sql.NVarChar, role)
      .input("username", sql.NVarChar, username)
      .input("password", sql.NVarChar, hashedPassword)
      .input("email", sql.NVarChar, email || null)
      .input("contact", sql.NVarChar, contact || null)
      .query(`
        INSERT INTO users (userID, fullname, age, gender, role, username, password, email, contact)
        VALUES (@userID, @fullname, @age, @gender, @role, @username, @password, @email, @contact)
      `);

    res.json({ message: "User added", userID });
  } catch (err) {
    console.error("Error adding user:", err);
    res.status(500).json({ message: "Error adding user" });
  }
});

// Update user
app.put("/users/update/:id", async (req, res) => {
  const { id } = req.params;
  const { fullname, age, gender, role, username, password, email, contact } = req.body;

  try {
    const pool = await getPool();
    let query = `
      UPDATE users 
      SET fullname=@fullname, age=@age, gender=@gender, role=@role, username=@username, email=@email, contact=@contact
    `;
    if (password) query += `, password=@password`;
    query += ` WHERE id=@id`;

    const request = pool.request()
      .input("fullname", sql.NVarChar, fullname)
      .input("age", sql.Int, age || null)
      .input("gender", sql.NVarChar, gender || null)
      .input("role", sql.NVarChar, role)
      .input("username", sql.NVarChar, username)
      .input("email", sql.NVarChar, email || null)
      .input("contact", sql.NVarChar, contact || null)
      .input("id", sql.Int, id);

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      request.input("password", sql.NVarChar, hashedPassword);
    }

    const result = await request.query(query);
    if (result.rowsAffected[0] === 0)
      return res.status(404).json({ message: "User not found" });

    res.json({ message: "User updated" });
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ message: "Error updating user" });
  }
});

// Delete user
app.delete("/users/delete/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("DELETE FROM users WHERE id=@id");

    if (result.rowsAffected[0] === 0)
      return res.status(404).json({ message: "User not found" });

    res.json({ message: "User deleted" });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ message: "Error deleting user" });
  }
});


// ==========================================
// HEALTH TIPS ROUTES
// ==========================================


// Create upload folder if not exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Multer storage
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => cb(null, Date.now() + "_" + file.originalname),
});
const upload = multer({ storage });

// Add new health tip
app.post("/tips/add", upload.single("file"), async (req, res) => {
  const { topic, description } = req.body;
  const file = req.file ? req.file.path : null;

  if (!topic || !description) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Auto-generate tipsID: TIP + timestamp
  const tipsID = "TIP" + Date.now();

  try {
    const pool = await getPool();
    await pool.request()
      .input("tipsID", sql.NVarChar, tipsID)
      .input("topic", sql.NVarChar, topic)
      .input("description", sql.NVarChar, description)
      .input("filePath", sql.NVarChar, file)
      .input("dateCreated", sql.DateTime, new Date())
      .query("INSERT INTO HealthTips (tipsID, topic, description, filePath, dateCreated) VALUES (@tipsID, @topic, @description, @filePath, @dateCreated)");

    res.json({ message: "Health tip saved successfully!", tipsID });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error saving health tip" });
  }
});

// Get all health tips
app.get("/tips", async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query("SELECT * FROM HealthTips ORDER BY dateCreated DESC");
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching health tips" });
  }
});
/////=====UPDATE HEALTH TIPS=====////
app.put("/tips/update/:id", upload.single("file"), async (req, res) => {
  const { id } = req.params;
  const { topic, description } = req.body;

  const filePath = req.file ? req.file.path : null;

  try {
    const pool = await getPool();

    // If new file uploaded
    let query;
    if (filePath) {
      query = `
        UPDATE HealthTips 
        SET topic=@topic, description=@description, filePath=@filePath
        WHERE tipsID=@tipsID
      `;
    } else {
      query = `
        UPDATE HealthTips 
        SET topic=@topic, description=@description
        WHERE tipsID=@tipsID
      `;
    }

    await pool.request()
      .input("tipsID", sql.NVarChar, id)
      .input("topic", sql.NVarChar, topic)
      .input("description", sql.NVarChar, description)
      .input("filePath", sql.NVarChar, filePath)
      .query(query);

    res.json({ message: "Health tip updated!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating health tip" });
  }
});
/////====DELETE HEALTH TIPS ROUTE=====///
app.delete("/tips/delete/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await getPool();
    
    await pool.request()
      .input("tipsID", sql.NVarChar, id)
      .query("DELETE FROM HealthTips WHERE tipsID=@tipsID");

    res.json({ message: "Health tip deleted!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error deleting health tip" });
  }
});



// =============================
// REMINDERS MODULE API ROUTES
// =============================

// GET all reminders
app.get("/reminders", async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query("SELECT id, patientID, fullName, message, status FROM reminders ORDER BY id DESC");
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching reminders" });
  }
});

// Add reminder + send email
app.post("/reminders/add", async (req, res) => {
  const { patientID, fullName, message, status } = req.body;
  if (!patientID || !message) return res.status(400).json({ message: "Missing required fields" });

  try {
    const pool = await getPool();
    // fetch patient email
    const pRes = await pool.request()
      .input("pid", sql.NVarChar, patientID)
      .query("SELECT fullName, email FROM patients WHERE patientID = @pid");
    if (!pRes.recordset.length) return res.status(400).json({ message: "Patient not found" });
    const patient = pRes.recordset[0];
    if (!patient.email) return res.status(400).json({ message: "Patient has no email" });

    // insert reminder
    await pool.request()
      .input("patientID", sql.NVarChar, patientID)
      .input("fullName", sql.NVarChar, fullName || patient.fullName)
      .input("message", sql.NVarChar, message)
      .input("status", sql.NVarChar, status || "Pending")
      .query("INSERT INTO reminders (patientID, fullName, message, status) VALUES (@patientID,@fullName,@message,@status)");

    // send email
    const mailOptions = {
      from: process.env.EMAIL,
      to: patient.email,
      subject: "Reminder Notification",
      html: `<p>Dear ${patient.fullName},</p>
             <p>You have a reminder:</p>
             <p>${message}</p>
             <p>Status: ${status}</p>`
    };

    try { await transporter.sendMail(mailOptions); } 
    catch(err) { console.error("Email send failed:", err); }

    res.json({ message: "Reminder added successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update reminder
app.put("/reminders/update/:id", async (req, res) => {
  const { id } = req.params;
  const { patientID, fullName, message, status } = req.body;
  try {
    const pool = await getPool();
    await pool.request()
      .input("id", sql.Int, id)
      .input("patientID", sql.NVarChar, patientID)
      .input("fullName", sql.NVarChar, fullName)
      .input("message", sql.NVarChar, message)
      .input("status", sql.NVarChar, status)
      .query("UPDATE reminders SET patientID=@patientID, fullName=@fullName, message=@message, status=@status WHERE id=@id");
    res.json({ message: "Reminder updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete reminder
app.delete("/reminders/delete/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getPool();
    await pool.request()
      .input("id", sql.Int, id)
      .query("DELETE FROM reminders WHERE id=@id");
    res.json({ message: "Reminder deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});



// ===============================================
// REPORT GENERATION ROUTES
// ===============================================


// Ensure "reports" folder exists
const reportsFolder = path.join(__dirname, "reports");
if (!fs.existsSync(reportsFolder)) fs.mkdirSync(reportsFolder);

// -------------------------------
// 1. PDF Report
// -------------------------------
app.post("/reports/generate/pdf", (req, res) => {
  const { reportTitle, reportType, fromDate, toDate } = req.body;
  const safeTitle = reportTitle.replace(/[^a-z0-9]/gi, "_");
  const filePath = path.join(reportsFolder, `${safeTitle}.pdf`);

  const doc = new PDFDocument();
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  doc.fontSize(22).text("SYSTEM REPORT", { align: "center" });
  doc.moveDown();

  doc.fontSize(14).text(`Report Title: ${reportTitle}`);
  doc.text(`Report Type: ${reportType}`);
  doc.text(`Date Range: ${fromDate} to ${toDate}`);
  doc.moveDown();
  doc.text("This report was automatically generated by the hospital management system.");

  doc.end();

  stream.on("finish", () => res.download(filePath));
});

// -------------------------------
// 2. Excel Report
// -------------------------------
app.post("/reports/generate/excel", async (req, res) => {
  const { reportTitle, reportType, fromDate, toDate } = req.body;
  const safeTitle = reportTitle.replace(/[^a-z0-9]/gi, "_");
  const filePath = path.join(reportsFolder, `${safeTitle}.xlsx`);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Report Summary");

  sheet.addRow(["Report Title", reportTitle]);
  sheet.addRow(["Report Type", reportType]);
  sheet.addRow(["Date Range", `${fromDate} to ${toDate}`]);
  sheet.addRow([]);
  sheet.addRow(["This report was generated by the hospital system"]);

  await workbook.xlsx.writeFile(filePath);
  res.download(filePath);
});

// -------------------------------
// 3. Word Report
// -------------------------------
app.post("/reports/generate/word", async (req, res) => {
  const { reportTitle, reportType, fromDate, toDate } = req.body;
  const safeTitle = reportTitle.replace(/[^a-z0-9]/gi, "_");
  const filePath = path.join(reportsFolder, `${safeTitle}.docx`);

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [new TextRun({ text: "SYSTEM REPORT", bold: true, size: 36 })],
            alignment: "center",
          }),
          new Paragraph(""),
          new Paragraph(`Report Title: ${reportTitle}`),
          new Paragraph(`Report Type: ${reportType}`),
          new Paragraph(`Date Range: ${fromDate} to ${toDate}`),
          new Paragraph(""),
          new Paragraph("This report was auto-generated by the hospital reporting system."),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(filePath, buffer);

  res.download(filePath);
});

// ======================================
// DASHBOARD DATA ROUTE
// ======================================
// ======================================
// DASHBOARD DATA ROUTE
// ======================================
app.get("/api/dashboard/stats", async (req, res) => {
  try {
    const pool = await getPool();

    // Total ACTIVE patients
    const patientsResult = await pool.request().query(`
      SELECT COUNT(*) AS totalPatients 
      FROM patients
      WHERE status = 'Active';
    `);

    // Total SCHEDULED appointments
    const appointmentsResult = await pool.request().query(`
      SELECT COUNT(*) AS upcomingAppointments
      FROM appointments
      WHERE status = 'Scheduled';
    `);

    // Total FOLLOW-UPS
    const followupsResult = await pool.request().query(`
      SELECT COUNT(*) AS pendingFollowUps
      FROM followups
      WHERE status IN ('started', 'not completed');
    `);

    // ⭐ TOTAL STAFF (Doctors + Nurses + Admins)
    const staffResult = await pool.request().query(`
      SELECT COUNT(*) AS totalStaff
      FROM users
      WHERE role IN ('Doctor', 'Nurse', 'Admin');
    `);

    res.json({
      success: true,
      totalPatients: patientsResult.recordset[0].totalPatients || 0,
      upcomingAppointments: appointmentsResult.recordset[0].upcomingAppointments || 0,
      pendingFollowUps: followupsResult.recordset[0].pendingFollowUps || 0,
      totalStaff: staffResult.recordset[0].totalStaff || 0
    });

  } catch (err) {
    console.error("Dashboard fetch error:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard data",
      details: err.message
    });
  }
});



// ===============================
// 4. PRINT VIA FRONTEND ONLY
// ===============================

// -------------------------------
// Start Server
// -------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));

// -------------------------------
// NOTE FOR FRONTEND
// -------------------------------
// - Remove any DOM/browser code (document.addEventListener...) from this file. Put it in your frontend JS file.
// - When calling update/delete from frontend, use appointmentID (the integer PK) for appointments.
// - Example endpoints:
//    POST   /appointments/add
//    GET    /appointments/list
//    GET    /appointments/get/:appointmentID
//    PUT    /appointments/update/:appointmentID
//    DELETE /appointments/delete/:appointmentID
// -------------------------------
