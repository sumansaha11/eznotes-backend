import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";

const options = {
    sameSite: 'Strict',
    path: '/',
};

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = await user.generateAccessToken()
        const refreshToken = await user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh tokens!")
    }
};

const registerUser = asyncHandler(async (req, res) => {

    const { email, fullname, password } = req.body;

    if (
        [email, fullname, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required!")
    }

    const existedUser = await User.findOne({ email: email.toLowerCase() })
    if (existedUser) {
        throw new ApiError(409, "User with same email already exists!")
    }

    const user = await User.create({
        email: email.toLowerCase(),
        fullname,
        password,
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user!")
    }

    return res
        .status(201)
        .json(
            new ApiResponse(200, createdUser, "User registered.")
        )
});

const loginUser = asyncHandler(async (req, res) => {

    const { email, password } = req.body;

    if (!email) {
        throw new ApiError(400, "Email is required!");
    }

    const user = await User.findOne({ email })
    if (!user) {
        throw new ApiError(404, "User with email does not exist!");
    }

    const isPasswordValid = await user.isPasswordCorrect(password)
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials!");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User logged-in."
            )
        )
});

const logoutUser = asyncHandler(async (req, res) => {

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    )

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(200, {}, "User logged-out.")
        )
});

const refreshAccessToken = asyncHandler(async (req, res) => {

    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request!")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

        const user = await User.findById(decodedToken?._id)
        if (!user) {
            throw new ApiError(401, "Invalid refresh token!")
        }

        if (incomingRefreshToken !== user.refreshToken) {
            throw new ApiError(401, "Refresh token is expired!")
        }

        const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken,
                        refreshToken
                    },
                    "Access token refreshed."
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

});

const changeCurrentPassword = asyncHandler(async (req, res) => {

    const { oldPassword, newPassword, confirmPassword } = req.body

    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if (!isPasswordCorrect) {
        throw new ApiError(400, "Incorrect password!")
    }

    if (oldPassword === newPassword) {
        throw new ApiError(400, "New password is same as old password!")
    }

    if (newPassword !== confirmPassword) {
        throw new ApiError(400, "Passwords do not match!")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "Password changed.")
        )
});

const getCurrentUser = asyncHandler(async (req, res) => {

    return res
        .status(200)
        .json(
            new ApiResponse(200, req.user, "Current user fetched.")
        )
});

const updateAccountDetails = asyncHandler(async (req, res) => {

    const { email, fullname } = req.body

    if (!email && !fullname) {
        throw new ApiError(400, "Either full name or email is required!")
    }

    let user;
    if (email) {
        const existedUser = await User.findOne({ email: email.toLowerCase() })
        if (existedUser) {
            throw new ApiError(409, "User with same email already exists!!!!!")
        }
        user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set: {
                    email: email.toLowerCase()
                }
            },
            { new: true }

        ).select("-password -refreshToken")
    }

    if (fullname) {
        user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set: {
                    fullname
                }
            },
            { new: true }

        ).select("-password -refreshToken")
    }
    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Account details updated.")
        )
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
};