import { inject, injectable } from "inversify";
import { TYPES } from "../ioc-container/types";
import { UserService } from "./UserService";
import { Transaction } from "../types/user";
import { getTransactionTool } from "../tools/langGraphTools";

@injectable()
export class TransactionService {
  constructor(
    @inject(TYPES.UserService) private userService: UserService
  ) {}

  async addTransaction(
    address: string,
    txHash: string
  ): Promise<{ data: Transaction }> {
    try {
      // Ensure MCP connection
      console.log("Fetching transaction info for hash:", txHash);
      // Call get_transaction tool directly
      const toolResult = await getTransactionTool.call({ txHash });
      console.log("Tool result:", toolResult);
      const text = toolResult?.content?.[0]?.text ?? "";
      console.log("Parsed tool output:", text);
      const txObject = JSON.parse(text);
      if (txObject) {
        const response = await this.userService.addUserTransaction(address, {
          hash: txObject?.hash,
          value: txObject?.value,
          token: txObject?.token,
          gas: txObject?.gas,
          gasPrice: txObject?.gasPrice,
          from: txObject?.from,
          to: txObject?.to,
          type: txObject?.type,
          input: txObject?.input,
          blockNumber: txObject?.blockNumber,
        });
        console.log("this is transaction data", response);
        return {
          data: response,
        };
      } else {
        throw new Error("Error in fetching transaction info");
      }
    } catch (err) {
      throw new Error(`Error in fetching transaction info ${err}`);
    }
  }
}
