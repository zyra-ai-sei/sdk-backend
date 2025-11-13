import { ObjectId } from "mongoose";

export type Chat = {
  role: string;
  parts: {text: string}[];
}
export type History = {
  _id: ObjectId;
  user: ObjectId;
  chat:Chat[];
};
