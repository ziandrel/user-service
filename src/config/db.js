import chalk from "chalk";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

// Load .env file located outside admin-service (at backend/.env)
dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10,
  queueLimit: 1,
  waitForConnections: true,
};

// Function to create the database if it doesn't exist
const createDatabaseIfNotExists = async (dbName) => {
  const connection = await mysql.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
  });

  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    const [rows] = await connection.query(`SHOW DATABASES LIKE '${dbName}';`);
    if (rows.length > 0) {
      console.log(chalk.blue(`Database ${dbName} exists.`));
    }
  } catch (error) {
    console.error(chalk.red(`Error creating database ${dbName}:`), error);
    throw error;
  } finally {
    await connection.end();
  }
};

// Create the pool after ensuring the database exists
const createPool = async () => {
  await createDatabaseIfNotExists(dbConfig.database);
  return mysql.createPool(dbConfig);
};

// Create pool instance
export const pool = await createPool();

// Check DB connection
export const checkConnections = async () => {
  try {
    const connection = await pool.getConnection();
    console.log(chalk.green("Connected to User-Service Database"));
    connection.release();
  } catch (error) {
    console.log(chalk.red("Error connecting to User-Service Database"));
    throw error;
  }
};
