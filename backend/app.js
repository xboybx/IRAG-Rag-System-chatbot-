const express = require("express");
const app = express();
const cookieParser = require('cookie-parser');
require("dotenv").config();
const PORT = process.env.PORT || 5000;
const connectDB = require("./cofig/db.config");
const UserAuthRoutes = require("./Routes/auth.routes");
const AIRoutes = require("./Routes/ai.Routes");
const cors = require("cors");

app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }))

app.get("/", (req, res) => {
    res.send("Server is running");
});

connectDB().then(() => {
    console.log("MongoDB connected successfully");
}).catch((err) => {
    console.log(err);
    process.exit(1);
});

app.use("/user", UserAuthRoutes);
app.use("/ai", AIRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});