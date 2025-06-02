require("dotenv").config();
const sql = require("mssql");
const nodemailer = require("nodemailer");

const sqlConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: false, // unless you're using SSL
    trustServerCertificate: true,
  },
};

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function getStudyCacheFailures() {
  try {
    const pool = await sql.connect(sqlConfig);
    const result = await pool
      .request()
      .query("SELECT * FROM dbo.study_cache_failure");
    await sql.close();
    return result.recordset; // ✅ This is the actual data (an array of rows)
  } catch (err) {
    console.error("Database query failed:", err);
    await sql.close();
    throw err;
  }
}

async function sendEmail(body) {
  return transporter
    .sendMail({
      from: "EncaptureMD <no-reply@encapturemd.com>",
      to: "jon.bishop@encapturemd.com",
      subject: "Entries found in study_cache_failure table",
      text: `Failure(s) found in table dbo.study_cache_failure;\n ${JSON.stringify(body, null, 2)}`,
    })
    .then((info) => {
      return `Message sent: ${info.messageId}`;
    })
    .catch((err) => {
      console.error("Error sending email:", err);
      throw err;
    });
}

getStudyCacheFailures().then((res) => sendEmail(res));
