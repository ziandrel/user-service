import express from "express";
import {
  loginUser,
  loginSeller,
  registerUser,
  googleLogin,
  verifyEmail,
  verifyCode,
  checkEmail,
  // sendVerification,
  registerSeller,
  setUserPreferences,
  getUserPreferencesHandler,
  loginRider,
} from "../controller/authController.js";

const router = express.Router();

router.post("/login", loginUser);
router.post("/register", registerUser);
router.post("/google-login", googleLogin);
router.get("/verify-email", verifyEmail);
router.post("/verify-code", verifyCode);

router.post("/check-email", checkEmail);
// router.post("/send-verification-code", sendVerification);
router.post("/register-seller", registerSeller);
router.post("/login-seller", loginSeller); // seller-specific

router.post("/preferences", setUserPreferences);
router.get("/preferences/:userId", getUserPreferencesHandler);

router.post("/rider/login", loginRider);

export default router;
