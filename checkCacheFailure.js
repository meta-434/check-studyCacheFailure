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

/**
 * Queries the MSSQL database for all entries in the `study_cache_failure` table.
 *
 * Uses the 'sqlConfig' object for connection details and returns the full result set.
 * Closes the connection after querying. Throws on connection or query error.
 *
 * @returns {Promise<Object[]>} A promise that resolves to an array of result objects from the table.
 */
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

/**
 * Sends an email notification with the provided database results.
 *
 * Uses preconfigured transporter and environment-based recipient address. The message body is
 * stringified for readability. Logs and throws on failure.
 *
 * @param {Object[]} body - Array of result objects from the DB query.
 * @returns {Promise<string>} A promise that resolves to a confirmation message (messageID).
 */
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

/**
 * Generates a SHA-256 hash for a database error entry.
 *
 * The hash includes the timestamp (`date` field), ensuring uniqueness
 * even if identical error records exist in the database with different times.
 *
 * @param {Object} entry - A database record containing error details.
 * @param {string} entry.medical_study_id - The ID of the medical study.
 * @param {string} entry.message - The failure message.
 * @param {string} entry.corporate_entity_id - The corporate entity identifier.
 * @param {string} entry.username - The username responsible for the operation.
 * @param {string} entry.date - The ISO timestamp of the error event.
 *
 * @returns {string} A SHA-256 hash uniquely representing the error entry.
 *
 * @see getStudyCacheFailures
 */
function hashEntry(entry) {
  const hashInput = `${entry.medical_study_id}-${entry.message}-${entry.corporate_entity_id}-${entry.username}-${entry.date}`;
  return crypto.createHash("sha256").update(hashInput).digest("hex");
}

/**
 * Reads the cross_reference.json file and parses it into an array of entry hashes.
 *
 * If the file does not exist, resolves to an empty array. Throws on other I/O or JSON errors.
 *
 * @returns {Promise<string[]>} A promise that resolves to an array of SHA-256 hashes.
 */
async function readCrossReference() {
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

function main() {
  let crossRef;

  readCrossReference()
    .then((res) => {
      crossRef = res;
      console.log("crossRef: ", crossRef);
      return getStudyCacheFailures();
    })
    .then((dbRes) => {
      const newEntries = dbRes.filter((e) => {
        const hash = hashEntry(e);
        return !crossRef.includes(hash);
        // filter adds vals where cb fn evals true, so return includes(hash) expr needs to eval to true if new val
      });
      if (newEntries.length === 0) return null; // no new entries

      return sendEmail(newEntries).then(() => {
        const newHashes = newEntries.map((e) => hashEntry(e));
        const newCrossRef = [...new Set([...crossRef, ...newHashes])];
        return writeCrossReference(newCrossRef);
      });
    })
    .catch((err) => console.error("script failed:", err));
}

main();
