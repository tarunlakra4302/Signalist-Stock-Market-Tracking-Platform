import { Schema, model, models, InferSchemaType, HydratedDocument } from 'mongoose';

const NotificationSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    type: { 
      type: String, 
      required: true, 
      enum: ['alert_triggered', 'system'] as const, 
      default: 'alert_triggered' as const 
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    metadata: {
      alertId: { type: String },
      symbol: { type: String },
      currentPrice: { type: Number },
      threshold: { type: Number },
      condition: { type: String, enum: ['upper', 'lower'] as const },
    },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
NotificationSchema.index(
  { userId: 1, 'metadata.alertId': 1, createdAt: 1 },
  { sparse: true }
);

export type INotification = InferSchemaType<typeof NotificationSchema>;
export type NotificationDocument = HydratedDocument<INotification>;

export const Notification = models.Notification || model('Notification', NotificationSchema);
