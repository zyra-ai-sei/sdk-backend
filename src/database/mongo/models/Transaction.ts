import { model, Mongoose, Schema, SchemaTimestampsConfig } from "mongoose";
import { Transaction } from "../../../types/user";


const transactionSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref:'User',
        required:true,
    },
    hash: {type: String},
    value: {type: String},
    status: {type: String},
    token: {type: String},
    timestamp: {type: Date, default: Date.now},
    gas: {type:String},
    gasPrice: {type:String},
    from: {type:String},
    to: {type:String},
    type:{type:String},
    input:{type:String},
    blockNumber:{type:String},
    orderId:{type:String, required:false},
},
{
    timestamps:true,
});

transactionSchema.index({user:1});

export type ITransaction = Transaction & Document & SchemaTimestampsConfig ;

export const TransactionData = model<ITransaction>("Transaction", transactionSchema);
