const sql = require("mssql");
const config = {
  user: "node_user",
  password: "MyStrongPassword123",
  server: "DESKTOP-KMC7JCO",
  database: "patient_system",
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function testConnection() {
  try {
    await sql.connect(config);
    console.log("✅ Connected successfully to SQL Server!");
    const result = await sql.query`SELECT name FROM sys.databases`;
    console.log("📋 Databases:", result.recordset);
  } catch (err) {
    console.error("❌ Connection failed:", err);
  }
}

testConnection();
