import mongoose from "mongoose";

export const connectDB = async () => {
  console.log("MongoDB connected");
  // try {
  //   const mongoUri = process.env.MONGO_URI;
  //   if (!mongoUri) {
  //     throw new Error("Mongo URI is not defined");
  //   }
  //   await mongoose.connect(mongoUri);
  //   console.log("MongoDB connected");
  // } catch (error) {
  //   console.error("MongoDB connection error", error);
  //   process.exit(1);
  // }
};
