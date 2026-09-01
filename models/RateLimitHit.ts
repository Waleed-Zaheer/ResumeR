import { Schema, model, models, type Model, type InferSchemaType } from "mongoose";

// One document per (key, fixed window). `expiresAt` carries a TTL index so
// MongoDB reaps old windows on its own — no cron/cleanup job needed.
const rateLimitHitSchema = new Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, required: true, default: 0 },
  expiresAt: { type: Date, required: true },
});

rateLimitHitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type RateLimitHitDoc = InferSchemaType<typeof rateLimitHitSchema> & { _id: string };

export const RateLimitHit =
  (models.RateLimitHit as Model<RateLimitHitDoc>) ?? model<RateLimitHitDoc>("RateLimitHit", rateLimitHitSchema);
