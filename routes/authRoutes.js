const express = require("express");

const router = express.Router();

const authController = require("../controllers/authController");

router.post("/register", authController.register);

router.post("/login", authController.login);

router.put("/change-admin", authController.changeAdmin);

module.exports = router;