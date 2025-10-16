import { pool } from "../config/db.js";
import chalk from "chalk";

const usersTableQuery = `CREATE TABLE IF NOT EXISTS users (
  userid INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  passwordhash VARCHAR(255) NOT NULL,
  needs_password BOOLEAN DEFAULT FALSE,
  phone VARCHAR(20),
  role VARCHAR(50),
  street VARCHAR(255),
  city VARCHAR(100),
  province VARCHAR(100),
  zip VARCHAR(20),
  is_verified BOOLEAN DEFAULT FALSE,
  verification_code VARCHAR(6) DEFAULT NULL,
  code_expires_at DATETIME DEFAULT NULL
)`;

const userPreferencesTableQuery = `CREATE TABLE IF NOT EXISTS user_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  categories JSON NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(userid) ON DELETE CASCADE
)`;
// Create individual table
const createTable = async (tableName, query) => {
  try {
    await pool.query(query);
    console.log(
      chalk.cyan(`${tableName} table is ready (created if not exists).`)
    );
  } catch (error) {
    console.log(chalk.red(`Error creating ${tableName} table:`, error));
    throw error;
  }
};

// Create all tables
const createAllTable = async () => {
  try {
    await createTable("users", usersTableQuery);
    await createTable("user_preferences", userPreferencesTableQuery);
  } catch (error) {
    console.log(chalk.red("Error setting up tables."), error);
    throw error;
  }
};

export default createAllTable;
