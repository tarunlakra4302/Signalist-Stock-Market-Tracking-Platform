import { Schema, model, models, InferSchemaType, HydratedDocument } from 'mongoose';

const AlertSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    symbol: { type: String, required: true, uppercase: true, trim: true },
    company: { type: String, required: true, trim: true },
    alertName: { type: String, required: true, trim: true },
    alertType: { type: String, required: true, enum: ['upper', 'lower'] as const },
    threshold: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    triggeredAt: { type: Date },
    lastNotifiedAt: { type: Date },
  },
  { timestamps: false }
);

AlertSchema.index({ userId: 1, symbol: 1, isActive: 1 });
AlertSchema.index({ userId: 1, symbol: 1, threshold: 1, alertType: 1 }, { unique: true });

export type IAlert = InferSchemaType<typeof AlertSchema>;
export type AlertDocument = HydratedDocument<IAlert>;

export const Alert = models.Alert || model('Alert', AlertSchema);
