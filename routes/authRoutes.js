const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcrypt");


// Create user
router.post("/register", async (req, res) => {

    try {

        const {
            username,
            password,
            role,
            name,
            category,
            age
        } = req.body;


        const existingUser = await User.findOne({ username });

        if(existingUser){
            return res.status(400).json({
                message:"Username already exists"
            });
        }


        const hashedPassword = await bcrypt.hash(password, 10);


        const user = new User({

            username,
            password: hashedPassword,
            role,
            name,
            category,
            age

        });


        await user.save();


        res.json({
            message:"User created successfully"
        });


    } catch(error){

        res.status(500).json({
            error:error.message
        });

    }

});


module.exports = router;