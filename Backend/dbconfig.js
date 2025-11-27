const config = {
  user: "node_user",
  password: "MyStrongPassword123",
  server: "DESKTOP-KMC7JCO",
  database: "patient_system",
  options: {
    encrypt: false,                // ✅ Turn off encryption
    trustServerCertificate: true   // ✅ Accept self-signed certificate
  }
};

module.exports = config;
