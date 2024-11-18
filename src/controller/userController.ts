import mongoose, { Schema } from "mongoose";
import { Request, Response, NextFunction } from "express";
import expressAsyncHandler from "express-async-handler";
import User from "../modal/userSchema";
import jwt from "jsonwebtoken";
import { userSchemaTypes } from "../types/user";
import jwt_decode from "jwt-decode";
import { googlePayloadTypes } from "../types/user";
import { IRequest } from "../middleware/auth-middleware";
import Survey from "../modal/survey";

function isUsernameValid(username: string): boolean {
  const pattern = /^[a-zA-Z0-9]+$/;
  return pattern.test(username);
}

const jwtToken = (id: mongoose.Types.ObjectId) => {
  return jwt.sign({ id }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const Signup = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { fullName, email, username, profilePic, password } = req.body;
    if (!fullName || !email || !username || !password) {
      res.status(400);
      throw new Error("some fields are missing");
    }

    const AlreadyExist = await User.findOne({
      $or: [{ email: req.body.email }, { username: req.body.username }],
    });
    if (AlreadyExist) {
      res.status(403);
      throw new Error("user already exist with the email or username");
    }

    const isValid = isUsernameValid(username);
    if (username.length > 15) {
      res.status(400);
      throw new Error("Username cannot be more than 15 characters");
    }
    if (username.length <= 2) {
      res.status(400);
      throw new Error("Username cannot be less than 3 characters");
    }
    if (username === "admin") {
      res.status(400);
      throw new Error("Username cannot be admin");
    }
    if (username === "Admin") {
      res.status(400);
      throw new Error("Username cannot be Admin");
    }
    if (username === "ADMIN") {
      res.status(400);
      throw new Error("Username cannot be ADMIN");
    }
    if (!isValid) {
      res.status(400);
      throw new Error("Username cannot contain special characters");
    }

    const newUser = await User.create({
      fullName: req.body.fullName,
      email: req.body.email.trim(),
      username: req.body.username.trim(),
      password: req.body.password,
      profilePic: req.body.profilePic,
    });
    if (newUser) {
      res.status(200).json({
        _id: newUser._id,
        fullName: newUser.fullName,
        username: newUser.username,
        profilePic: newUser.profilePic,
        token: jwtToken(newUser._id),
      });
    }
  }
);

const Login = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { username, email, password } = req.body;

    if (!username && !email) {
      res.status(400);
      throw new Error("username or email is required");
    }
    if (!password) {
      res.status(400);
      throw new Error("password is required");
    }
    const userExist = await User.findOne({
      $or: [{ username }, { email }],
    }).select("+password");

    if (!userExist) {
      res.status(404);
      throw new Error("user not found");
    }
    if (userExist.loggedInWithGoogle) {
      res.status(405);
      throw new Error("You are already logged in via Google with this email");
    }
    if (req.body.password !== userExist.password) {
      res.status(401);
      throw new Error("password doesn't match");
    }
    res.status(200).json({
      _id: userExist._id,
      fullName: userExist.fullName,
      username: userExist.username,
      profilePic: userExist.profilePic,
      token: jwtToken(userExist._id),
    });
  }
);

const AutoLogin = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const heade = req.headers["authorization"];
    const token = heade?.split(" ")[1];

    if (!token) {
      res.status(401);
      throw new Error("Token not found");
    }

    const decode = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: Schema.Types.ObjectId;
    };
    const user: userSchemaTypes | null = await User.findById(decode.id).select(
      "fullName profilePic username role"
    );
    if (!user) {
      res.status(401);
      throw new Error("Invalid token! User not found");
    }
    res.status(200).json(user);
  }
);

const googleLogin = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const token = req.body.token;
    if (!token) {
      res.status(400);
      throw new Error("No token found");
    }
    const payload: googlePayloadTypes = jwt_decode(token);

    const { email_verified, email, name, picture } = payload;
    const user = await User.findOne({ email: email });
    if (user) {
      if (!user.loggedInWithGoogle) {
        user.loggedInWithGoogle = true;
        user.profilePic = picture;
        user.email_verified = email_verified;
        await user.save();
        res.status(200).json({
          _id: user._id,
          fullName: user.fullName,
          username: user.username,
          profilePic: user.profilePic,
          token: jwtToken(user._id),
        });
      }
      if (user.loggedInWithGoogle) {
        res.status(200).json({
          _id: user._id,
          fullName: user.fullName,
          username: user.username,
          profilePic: user.profilePic,
          token: jwtToken(user._id),
        });
      }
    }
    if (!user) {
      const newuser = await User.create({
        fullName: name,
        email: email,
        email_verified: email_verified,
        profilePic: picture,
        username: email.split("@")[0].replace(/\./g, ""),
        loggedInWithGoogle: true,
      });
      if (newuser) {
        res.status(200).json({
          _id: newuser._id,
          fullName: newuser.fullName,
          username: newuser.username,
          profilePic: newuser.profilePic,
          token: jwtToken(newuser._id),
        });
      }
    }
  }
);

const AddRemoveFollower = expressAsyncHandler(
  async (req: IRequest, res: Response, next: NextFunction) => {
    const myId = req.currentUserId;
    const userId: unknown = req.params.id;
    const user = await User.findById(userId);
    if (!user) {
      res.json("User not found");
    }

    if (userId === myId) {
      throw new Error("You can't follow yourself");
    }

    const myUser = await User.findById(myId);
    const alreadyFollow = myUser?.following.includes(
      userId as Schema.Types.ObjectId
    );

    const option = alreadyFollow ? "$pull" : "$addToSet";
    await User.findByIdAndUpdate(
      myId,
      {
        [option]: { following: userId },
      },
      { new: true }
    );
    await User.findByIdAndUpdate(userId, { [option]: { followers: myId } });
    res.status(200).json("Follow updated");
  }
);

const getUser = expressAsyncHandler(
  async (req: IRequest, res: Response, next: NextFunction) => {
    const reqUsername = req.params.username;
    const currentUser = req.username;

    let slectedFields =
      "createdAt fullName profilePic username bio followers following genre email_verified facebook twitter instagram github ";

    let ownProfile = false;
    let isFollowing = false;

    if (reqUsername === currentUser || req.currentUserRole === "admin") {
      slectedFields += "email";
    }

    if (reqUsername === currentUser) {
      ownProfile = true;
    }

    const user = await User.findOne({
      username: reqUsername,
    }).select(slectedFields);

    if (!user) {
      throw new Error("User not found");
    }

    if (!ownProfile) {
      const id: unknown = user._id;
      isFollowing = await User.findOne({ username: currentUser })
        .select("following")
        .then((data) => {
          return data?.following.includes(id as Schema.Types.ObjectId)!;
        });
    }
    const mewuser = user.toObject();
    res.status(200).json({ ...mewuser, ownProfile, isFollowing });
  }
);

const editProfile = expressAsyncHandler(
  async (req: IRequest, res: Response, next: NextFunction) => {
    const {
      fullName,
      username,
      bio,
      genre,
      facebook,
      twitter,
      instagram,
      github,
      _id,
    } = req.body;

    const currenUser = req.currentUserId;
    const currentUserRole = req.currentUserRole;
    const user = await User.findById(
      currentUserRole === "admin" ? _id : currenUser
    );
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    const userExist = await User.findOne({ username: username });
    if (userExist && userExist._id.toString() !== currenUser!.toString()) {
      res.status(403);
      throw new Error("Username already taken");
    }

    let genreArray: string[] = [];
    const updateFields: any = {};
    if (fullName !== undefined) {
      updateFields.fullName = fullName;
    }
    if (username !== undefined) {
      updateFields.username = username.toLowerCase();
    }
    if (bio !== undefined) {
      updateFields.bio = bio;
    }
    if (genre !== undefined) {
      if (genre.length <= 0) {
        updateFields.genre = genreArray;
      } else {
        const genrestring = genre.map(
          (item: { label: string; value: string }) => item.label
        );
        updateFields.genre = genrestring;
      }
    }
    if (facebook !== undefined) {
      updateFields.facebook = facebook;
    }
    if (twitter !== undefined) {
      updateFields.twitter = twitter;
    }
    if (instagram !== undefined) {
      updateFields.instagram = instagram;
    }
    if (github !== undefined) {
      updateFields.github = github;
    }
    Object.assign(user, updateFields);
    await user.save();
    res.status(200).json("Profile updated");
  }
);

const getAllUsers = expressAsyncHandler(
  async (req: IRequest, res: Response, next: NextFunction) => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const field = "_id username fullName profilePic role createdAt";
    const sortQuery = req.query.sort;
    const currentUserId = req.currentUserId;

    try {
      let users = await User.find().skip(skip).limit(limit).select(field);

      if (sortQuery === "newest") {
        users = await User.find()
          .skip(skip)
          .limit(limit)
          .select(field)
          .sort({ createdAt: -1 });
      }

      const followingUsers = await User.find({
        _id: currentUserId,
      }).select("following  createdAt");
      const following = followingUsers[0].following;

      const usersWithFollow = users.map((user) => {
        const isFollowing = following.includes(
          user._id as unknown as Schema.Types.ObjectId
        );
        return {
          ...user.toObject(),
          isFollowing: isFollowing,
        };
      });

      if (usersWithFollow.length > 0) {
        res.status(200).json({
          page: page,
          results: usersWithFollow.length,
          data: usersWithFollow,
        });
      } else {
        res.status(404).json({
          message: "No users found",
        });
      }
    } catch (error) {
      res.status(500);
      throw new Error("something went wrong");
    }
  }
);

const getAllFollowers = expressAsyncHandler(
  async (req: IRequest, res: Response) => {
    const userId = req.params.id;
    const currentUserId = req.currentUserId;
    const user = await User.findOne({ _id: userId })
      .select("followers following _id")
      .populate("followers following", "fullName profilePic username role ");

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    const currentUser = await User.findOne({ _id: currentUserId });

    const newFollowersData = user.followers.map((item: any) => {
      const isFollowing = currentUser?.following.includes(item._id.toString());
      const isAFollower = currentUser?.followers.includes(item._id.toString());
      return {
        ...item.toObject(),
        isFollowing: isFollowing,
        isAFollower: isAFollower,
      };
    });

    const newFollowingData = user.following.map((item: any) => {
      const isFollowing = currentUser?.following.includes(item._id.toString());
      const isAFollower = currentUser?.followers.includes(item._id.toString());
      return {
        ...item.toObject(),
        isFollowing: isFollowing,
        isAFollower: isAFollower,
      };
    });

    res.status(200).json({
      followers: newFollowersData,
      following: newFollowingData,
    });
  }
);

const loginAsUser = expressAsyncHandler(
  async (req: IRequest, res: Response) => {
    const userId = req.params.id;
    const currentUserRole = req.currentUserRole;

    if (currentUserRole !== "admin") {
      res.status(403);
      throw new Error("You are not authorized to perform this action");
    }

    const user = await User.findById(userId).select(
      "fullName profilePic username role"
    );

    const token = jwtToken(user?._id!);

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }
    res.status(200).json({
      token: token,
    });
  }
);

const SearchUsers = expressAsyncHandler(
  async (req: IRequest, res: Response, next: NextFunction) => {
    const searchTerm = req.query.q;
    const currentUserRole = req.currentUserRole;

    if (currentUserRole !== "admin") {
      res.status(403);
      throw new Error("You are not authorized to perform this action");
    }

    if (!searchTerm) {
      res.status(400);
      throw new Error("Search term is required");
    }
    const regex = new RegExp(searchTerm as string, "i");
    const users = await User.find({
      $or: [{ fullName: regex }, { username: regex }],
    }).select("_id username fullName profilePic role createdAt");
    if (users.length > 0) {
      res.status(200).json(users);
    } else {
      res.status(404);
      throw new Error("No users found");
    }
  }
);

const AddSurvey = expressAsyncHandler(async (req: Request, res: Response) => {
  const { name, source, otherSource, rating, feedback } = req.body;
  const survey = await Survey.create({
    name,
    source,
    otherSource,
    rating,
    feedback,
  });

  if (!survey) {
    res.status(400);
    throw new Error("Survey not created");
  }

  res.status(200).json({
    status: "success",
    message: "Survey submitted successfully",
  });
});

export {
  Signup,
  AutoLogin,
  Login,
  googleLogin,
  AddRemoveFollower,
  getUser,
  editProfile,
  getAllUsers,
  getAllFollowers,
  loginAsUser,
  SearchUsers,
  AddSurvey,
};
