import { pool } from "../config/db.js";

// Find by email
export const findUserByEmail = async (email) => {
  const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [
    email,
  ]);
  return rows[0];
};

// Find by phone
export const findUserByPhone = async (phone) => {
  const [rows] = await pool.query("SELECT * FROM users WHERE phone = ?", [
    phone,
  ]);
  return rows[0];
};

// Create user (with verification code system)
export const createUser = async ({
  name,
  email,
  passwordhash,
  phone,
  role,
  verification_code,
  code_expires_at,
  is_verified = false,
  needs_password = false,
}) => {
  const [result] = await pool.query(
    `INSERT INTO users (name, email, passwordhash, phone, role, verification_code, code_expires_at, is_verified, needs_password)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      email,
      passwordhash,
      phone,
      role,
      verification_code,
      code_expires_at,
      is_verified,
      needs_password,
    ]
  );
  return result.insertId;
};

// Create seller (if using separate registration flow)
export const createSeller = async ({
  name,
  email,
  passwordhash,
  phone,
  role,
  verification_code,
}) => {
  const [result] = await pool.query(
    `INSERT INTO users (name, email, passwordhash, phone, role, verification_code)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, email, passwordhash, phone, role, verification_code]
  );
  return result.insertId;
};

// Get seller info
export const getSellerByUserId = async (userId) => {
  const [rows] = await pool.query(`SELECT * FROM sellers WHERE userId = ?`, [
    userId,
  ]);
  return rows[0];
};

// Save user preferences (JSON categories)
export const saveUserPreferences = async (userId, categories) => {
  const [existing] = await pool.query(
    `SELECT id FROM user_preferences WHERE user_id = ?`,
    [userId]
  );

  const categoriesJSON = JSON.stringify(categories);
  console.log("Saving to DB:", userId, categoriesJSON);

  if (existing.length > 0) {
    await pool.query(
      `UPDATE user_preferences SET categories = ? WHERE user_id = ?`,
      [categoriesJSON, userId]
    );
  } else {
    await pool.query(
      `INSERT INTO user_preferences (user_id, categories) VALUES (?, ?)`,
      [userId, categoriesJSON]
    );
  }
};

// Get user preferences
export const getUserPreferences = async (userId) => {
  const [rows] = await pool.query(
    `SELECT categories FROM user_preferences WHERE user_id = ?`,
    [userId]
  );

  if (rows.length === 0) return [];

  const categories = rows[0].categories;

  if (Array.isArray(categories)) return categories;

  try {
    const parsed = JSON.parse(categories);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

//ADMIN

const User = {
  // Get all users
  get: async () => {
    const [rows] = await pool.query(
      "SELECT userid, name, email, phone, role, street, city, province, zip FROM users"
    );
    return rows;
  },

  // Create a new user
  create: async (user) => {
    const sql = `
      INSERT INTO users (
        name, email, passwordhash, phone, role,
        street, city, province, zip
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query(sql, [
      user.name,
      user.email,
      user.passwordhash,
      user.phone,
      user.role,
      user.street,
      user.city,
      user.province,
      user.zip,
    ]);
    return { userid: result.insertId, ...user };
  },

  // Update a user by userid
  update: async (userid, user) => {
    const sql = `
      UPDATE users SET
        name = ?, email = ?, phone = ?, role = ?,
        street = ?, city = ?, province = ?, zip = ?
      WHERE userid = ?
    `;
    await pool.query(sql, [
      user.name,
      user.email,
      user.phone,
      user.role,
      user.street,
      user.city,
      user.province,
      user.zip,
      userid,
    ]);
    return { userid, ...user };
  },

  // Delete a user by userid
  delete: async (userid) => {
    const sql = "DELETE FROM users WHERE userid = ?";
    const [result] = await pool.query(sql, [userid]);
    return result;
  },

  getById: async (userid) => {
    const [rows] = await pool.query("SELECT * FROM users WHERE userid = ?", [
      userid,
    ]);
    return rows[0];
  },

  updatePassword: async (userid, passwordHash) => {
    const sql = "UPDATE users SET passwordhash = ? WHERE userid = ?";
    const [result] = await pool.query(sql, [passwordHash, userid]);
    return result;
  },
};

export default User;
