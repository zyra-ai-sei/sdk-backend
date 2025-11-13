import { inject, injectable } from "inversify";
import { TYPES } from "../ioc-container/types";
import { UserOp } from "../database/mongo/UserOp";
import { Chat } from "../types/history";
import { Transaction } from "../types/user";
import { ethers } from "ethers";
import env from "../envConfig";
import { twapABI } from "./twapABI";

interface OrderBid {
    time: number;
    taker: string;
    exchange: string;
    dstAmount: string;
    dstFee: string;
    data: string;
  }
  
  interface OrderAsk {
    exchange: string;
    srcToken: string;
    dstToken: string;
    srcAmount: string;
    srcBidAmount: string;
    dstMinAmount: string;
    deadline: number;
    bidDelay: number;
    fillDelay: number;
    data: string;
  }
  
  interface Order {
    id: string;
    status: number;
    time: number;
    filledTime: number;
    srcFilledAmount: string;
    maker: string;
    ask: OrderAsk;
    bid: OrderBid;
  }
@injectable()
export class UserService {
    constructor(
        @inject(TYPES.UserOp) private userOp:UserOp
    ){}

    async getUserInfo(address:string) {
        const user = await this.userOp.getUserHistory(address);
        return user;
    }

    async addUserHistory(address:string, chats:Chat[]) {
        const result = await this.userOp.updateUserHistory(address,chats);
        return result;
    }

    async addUserTransaction(address: string, transaction:Partial<Transaction>) {
        const result = await this.userOp.updateUserTransaction(address, transaction);
        return result;
    }

    async getUserTransactions(address:string) {
        const userTransactions = await this.userOp.getUserTransactions(address);
        return userTransactions;
    }
    async getOrderStatus(address: string): Promise<any> {
        //get order details from contract using ethers
        const provider = new ethers.JsonRpcProvider(env.RPC_URL);
        const twapAddress = '0xde737dB24548F8d41A4a3Ca2Bac8aaaDc4DBA099'
        const contract = new ethers.Contract(twapAddress, twapABI, provider);
        const orderIDs = await contract.orderIdsByMaker(address);
        console.log('orderIDs', orderIDs);
        const rawOrders = await Promise.all(orderIDs.map((orderID) => contract.order(orderID)));
        return rawOrders.map((order: any[]) => {
            const [
              id,
              status,
              time,
              filledTime,
              srcFilledAmount,
              maker,
              askData,
              bidData
            ] = order;
        
            const [
              exchange,
              srcToken,
              dstToken,
              srcAmount,
              srcBidAmount,
              dstMinAmount,
              deadline,
              bidDelay,
              fillDelay,
              askDataBytes
            ] = askData;
        
            const [
              bidTime,
              taker,
              bidExchange,
              dstAmount,
              dstFee,
              bidDataBytes
            ] = bidData;
        
            return {
              id: id.toString(),
              status: Number(status),
              time: Number(time),
              filledTime: Number(filledTime),
              srcFilledAmount: srcFilledAmount.toString(),
              maker,
              ask: {
                exchange,
                srcToken,
                dstToken,
                srcAmount: srcAmount.toString(),
                srcBidAmount: srcBidAmount.toString(),
                dstMinAmount: dstMinAmount.toString(),
                deadline: Number(deadline),
                bidDelay: Number(bidDelay),
                fillDelay: Number(fillDelay),
                data: askDataBytes
              },
              bid: {
                time: Number(bidTime),
                taker,
                exchange: bidExchange,
                dstAmount: dstAmount.toString(),
                dstFee: dstFee.toString(),
                data: bidDataBytes
              }
            };
          });  
      }
}