import { injectable } from "inversify";
import { Transaction, User } from "../../types/user";
import { IUser, UserData } from "./models/User";
import { ObjectId } from "mongoose";
import { HistoryData } from "./models/History";
import { Chat } from "../../types/history";
import { TransactionData } from "./models/Transaction";

@injectable()
export class UserOp {
  constructor() {}

  async getUserById(id: string): Promise<User | null> {
    try {
      const result = await UserData.findOne({ address: id as String }).lean();
      if (!result) {
        return null;
      }
      return this.transformUserData(result);
    } catch (err) {
      throw new Error("Error in getting user Data");
    }
  }

  async getUserHistory(id: string): Promise<Chat[]> {
    try {
      const user: any = await UserData.findOne({ address: id as String }).lean();
      if (!user) return [];
      const result: any = await HistoryData.findOne({ user: user._id }).lean();
      return result?.chat || [];
    } catch (err) {
      console.log("error in fetching user history", err);
      return [];
    }
  }

  async getUserTransactions(id: string) : Promise<Transaction[]> {
    try{
      const user = await UserData.findOne({address: id}).lean();
      if(!user) throw new Error("No user found");
      const result = await TransactionData.find({user: user._id}).sort({timestamp: -1}).lean();
      return result as Transaction[];
    } catch(err){
      throw new Error(`Error in fetch user transactions: ${err}`)
    }
  }

  async getAllUsers(page: number = 1): Promise<User[]> {
    const batchSize = 10;
    const users = await UserData.find()
      .skip((page - 1) * batchSize)
      .lean()
      .limit(batchSize)
      .exec();
    return users.map((user) => {
      return this.transformUserData(user);
    });
  }

  async updateUserData(
    userAddress: string,
    userData: Partial<User>
  ): Promise<boolean> {
    try {
      await UserData.updateOne({ address: userAddress }, userData, {
        upsert: true,
      });
      return true;
    } catch (err) {
      // console.log('error in registering the user',err)
      throw new Error("Error in registering the user");
    }
  }

  async updateUserHistory(userAddress: string, chats: Chat[]) {
    try {
      const user = await UserData.findOne({ address: userAddress });
      if (!user) return;
      // Upsert history document
      const historyDoc = await HistoryData.findOneAndUpdate(
        { user: user._id },
        {
          $push: {
            chat: {
              $each: chats,
              $slice: -10,
            },
          },
        },
        { upsert: true, new: true }
      );

      // No longer store history id on user document; history is kept in separate collection
    } catch (err) {
      // handle error
    }
  }

  async updateUserTransaction(userAddress: string, txData: Partial<Transaction>) {
    try{
      const user = await UserData.findOne({address: userAddress});
      if(!user) return;
      console.log('this is txData',txData)
      const transaction = await TransactionData.create({
        ...txData,
        user:user._id,
      })
      transaction.save();
      return transaction.toObject();
    } catch(err){
      throw new Error("Error in updating user Transaction")
    }
  }

  transformUserData(userData: any): User {
    return {
      _id: userData?._id,
      address: userData.address,
      apiKeys: userData?.apiKeys,
    };
  }
}
