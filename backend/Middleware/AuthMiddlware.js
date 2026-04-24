const mongoose = require("mongoose");
const UserModel = require("../models/UserModel");
const jwt = require("jsonwebtoken");

const AuthMiddleware = async (req, res, next) => {
    try {
        const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                message: "Unauthorized"
            })
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await UserModel.findById(decoded.id);
        next();
    } catch (err) {
        console.log("error AuthMiddleware", err);
        if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: "Unauthorized: Token expired or invalid" });
        }
        return res.status(500).json({
            message: "Error AuthMiddleware",
            error: err.message
        })
    }
}

module.exports = AuthMiddleware;