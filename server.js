import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import chalk from "chalk";
import { checkConnections } from "./src/config/db.js";
import createAllTable from "./src/utils/userDbUtils.js";
import authRoutes from "./src/routes/authRoutes.js";
import path from "path";
import { fileURLToPath } from "url";

// Recreate __dirname for ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file located outside admin-service (at backend/.env)
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
app.use(express.json());
app.use(cors());

// Add ngrok-skip-browser-warning header to all responses
// app.use((req, res, next) => {
//   res.setHeader("ngrok-skip-browser-warning", "true");
//   next();
// });

app.use("/api/auth", authRoutes);

const PORT = process.env.USER_PORT || 3002;

app.listen(PORT, async () => {
  console.log(chalk.green(`Server running on port ${PORT}`));

  try {
    await checkConnections();
    await createAllTable();

    // const url = await ngrok.connect({
    //   addr: 3002,
    //   authtoken: "2xiVNcXNyW3dLNpqeEV5QaBaPjR_3oTUKvQvT77R9CpgZykj9", // ✅ Use token from .env
    // });
    // app.locals.baseURL = url;
    // console.log(chalk.blue(`Ngrok tunnel established at ${url}`));
  } catch (error) {
    console.log(chalk.red("Failed to initialize User-Service Database"), error);
  }
});
