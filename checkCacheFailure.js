require("dotenv").config();
const path = require("path");
const crypto = require("crypto");
const fs = require("node:fs/promises");
const sql = require("mssql");
const nodemailer = require("nodemailer");

const CROSS_REF_FILE = path.join(__dirname, "cross_reference.json");

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
      .query("SELECT * FROM study_cache_failure");
    await sql.close();
    return result.recordset;
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
      to: process.env.RECIPIENT_EMAIL,
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

// adding date makes this unique no matter what, even if the error is identical and has multiple identical entries in DB (except TS)
function hashEntry(entry) {
  const hashInput = `${entry.medical_study_id}-${entry.message}-${entry.corporate_entity_id}-${entry.username}-${entry.date}`;
  return crypto.createHash("sha256").update(hashInput).digest("hex");
}

function readCrossReference() {
  return fs
    .readFile(CROSS_REF_FILE, "utf8")
    .then((data) => JSON.parse(data))
    .catch((err) => {
      // nonexistent file
      if (err.code === "ENOENT") return [];
      throw err;
    });
}

function writeCrossReference(refs) {
  const content = JSON.stringify(refs, null, 2);
  return fs.writeFile(CROSS_REF_FILE, content, "utf8");
}
// getStudyCacheFailures().then((res) => {
//   // console.log(res.length);
//   if (res.length > 0) {
//     sendEmail(res);
//   } else {
//     Promise.resolve();
//   }
// });

getStudyCacheFailures().then((res) => crossReferenceResults(res));
