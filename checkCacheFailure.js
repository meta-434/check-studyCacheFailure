require("dotenv").config();
const sql = require("mssql");

const sqlConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME, // optional, but recommended
  options: {
    encrypt: false, // unless you're using SSL
    trustServerCertificate: true,
  },
};

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

getStudyCacheFailures().then((res) => console.log("result: ", res));
