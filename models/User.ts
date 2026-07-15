import { Schema, model, models, type Model, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    image: { type: String },
    provider: {
      type: String,
      enum: ["credentials", "google"],
      required: true,
      default: "credentials",
    },
    phone: { type: String },
    address: { type: String },
    designation: { type: String },
    occupation: { type: String },
    lastLogin: { type: Date },
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: string };

export const User = (models.User as Model<UserDoc>) ?? model<UserDoc>("User", userSchema);
