const mongoose = require('mongoose');

// ANSI colors (reused from server.js style)
const green  = '\x1b[32m';
const red    = '\x1b[31m';
const bold   = '\x1b[1m';
const dim    = '\x1b[2m';
const reset  = '\x1b[0m';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`${green}[OK]${reset}    MongoDB connected → ${bold}${conn.connection.host}${reset}`);
  } catch (error) {
    console.error(`${red}[ERROR]${reset} MongoDB connection failed: ${bold}${error.message}${reset}`);
    process.exit(1);
  }
};

module.exports = connectDB;
