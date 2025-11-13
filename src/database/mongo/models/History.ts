import mongoose, { model, Schema, SchemaTimestampsConfig } from "mongoose";
import validator from "validator";
import { History } from "../../../types/history";

const historySchema = new Schema(
  {
    user: Schema.Types.ObjectId,
    chat: {
      type:[
        {
          role: { type: String, required: true },
          parts: [
            {
              text: { type: String, required: true },
              _id:false
            },
          ],
          _id: false,
        }
      ]
    }
  },
  {
    timestamps: true,
  }
);


export type IHistory = History & Document & SchemaTimestampsConfig;

export const HistoryData = model<IHistory>("History", historySchema);
