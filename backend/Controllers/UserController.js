const UserModel = require("../models/UserModel");
const jwt = require("jsonwebtoken");


//Register User Controller
const User_Register = async (req, res) => {
    try {
        const { email, password, name, confirmPassword } = req.body;
        if (!email || !password || !confirmPassword || !name) {
            return res.status(400).json({
                message: "All fields are required"
            })
        }

        if (password != confirmPassword) {
            return res.status(400).json({
                message: "Password do not match",
            })
        }

        const existingUser = await UserModel.findOne({ email });

        if (existingUser) {
            return res.status(400).json({
                message: "User already exists"
            })
        }

        const user = await UserModel.create({
            email,
            name,
            password,

        })

        if (!user) {
            return res.status(400).json({
                message: "User not created"
            })
        }

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        if (!accessToken || !refreshToken) {
            return res.status(400).json({
                message: "Token not generated"
            })
        }

        res.cookie("token", refreshToken)

        return res.status(201).json({
            message: "User Registered Successfully",
            user,
            "short_lived_Token": accessToken,
            "long_lived_Token": refreshToken
        })


    } catch (err) {
        console.log("error Creating User", err);
        return res.status(500).json({
            message: "Error creating user",
            error: err.message
        })
    }
}

//Login User Controller
const User_Login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "All fields are required"
            })
        }


        /*
        Why? You added select: false to your password field in the Model. This hides it by default to prevent accidentally sending passwords to the frontend.
        When Logging In: You need to compare the typed password with the stored hash.
        The Fix: Adding .select("+password") tells Mongoose: "I know it's hidden, but for this specific query, please give me the password field so I can check it."
        */
        const user = await UserModel.findOne({ email }).select("+password");

        if (!user) {
            return res.status(400).json({
                message: "User not found"
            })
        }

        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return res.status(400).json({
                message: "Invalid credentials"
            })
        }

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        res.cookie("token", refreshToken)

        return res.status(201).json({
            message: "User Logged In Successfully",
            user,
            "short_lived_Token": accessToken,
            "long_lived_Token": refreshToken
        })




    } catch (err) {
        console.log("error Creating User", err);
        return res.status(500).json({
            message: "Error creating user",
            error: err.message
        })
    }
}


//Logout User Controller
const User_Logout = async (req, res) => {
    try {

        res.clearCookie("token")

        return res.status(201).json({
            message: "User Logged Out Successfully"
        })
    } catch (err) {
        console.log("error Creating User", err);
        return res.status(500).json({
            message: "Error creating user",
            error: err.message
        })
    }
}

//Me Controller
const User_Me = async (req, res) => {
    try {
        const user = await UserModel.findById(req.user.id);

        if (!user) {
            return res.status(400).json({
                message: "User not found"
            })
        }

        return res.status(201).json({
            message: "User Found Successfully",
            user
        })

    } catch (err) {
        console.log("error Creating User", err);
        return res.status(500).json({
            message: "Error creating user",
            error: err.message
        })
    }

}

//Refresh Token  (Long Lived Token) This controller is used to generate a 
// New Acess token (Short Lived Token) with the help of refreshToken (Long Lived Token)
/* 
Access Tokens are short-lived (e.g., 15 minutes) for security. 
When they expire, the user shouldn't be logged out. 
The Refresh Token (stored securely in a cookie) is used to get a new Access Token without asking for the password again. */
const User_Refresh = async (req, res) => {
    try {
        // 1. Get the refresh token from cookies
        const { token } = req.cookies;

        if (!token) {
            return res.status(400).json({
                message: "Refresh {Long Lived Token} not found"
            })
        }

        //verify the stored refreshToken (Long Lived Token) and chek with its user 
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await UserModel.findById(decoded.id);
        //if the user exits with that token then it is valid and we can create
        //new accessToken (Short Lived Token) and refreshToken (Long Lived Token) for that user

        if (!user) {
            return res.status(400).json({
                message: "User not found"
            })
        }

        const refreshToken = user.generateRefreshToken();
        const accessToken = user.generateAccessToken();

        res.cookie("token", refreshToken)

        return res.status(201).json({
            message: "User Refreshed Successfully and generated new  Acess-Token (short-lived-Token) with the help of old Refresh-Token (Long Lived-Token) and also generated new Refresh-Token (Long Lived-Token)",
            user,
            "short_lived_Token": accessToken,
            "long_lived_Token": refreshToken
        })




    } catch (err) {
        // Handle Token Expiration or Invalid Token gracefully
        if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: "Invalid or expired refresh token" });
        }

        console.log("error Refreshing User", err);
        return res.status(500).json({
            message: "Error Refreshing user",
            error: err.message
        })
    }
}

module.exports = {
    User_Register,
    User_Login,
    User_Logout,
    User_Me,
    User_Refresh
}   