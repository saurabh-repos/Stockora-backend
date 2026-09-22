const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: '../.env' }); // Load env if needed

const updateToSuperAdmin = async () => {
  try {
    // Hardcoding URI for safety
    await mongoose.connect(process.env.MONGO_URI);
    
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // Find the first user or a specific one and update their role
    // Using a broad query to just get the first admin user
    const result = await usersCollection.updateOne(
      {}, // Empty filter matches first document
      { $set: { role: 'SuperAdmin' } }
    );
    
    console.log(`Matched ${result.matchedCount} document(s) and modified ${result.modifiedCount} document(s).`);
    console.log('Successfully upgraded the first user to SuperAdmin!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error upgrading user:', error);
    process.exit(1);
  }
};

updateToSuperAdmin();
