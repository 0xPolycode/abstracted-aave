import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { klasterNodeHost } from "klaster-sdk";
import { firstValueFrom } from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class iTxQueueService {

  queue = new Queue<RootObject>()

  constructor(private http: HttpClient) {

  }

  fetchItxResult(iTxHash: string) {
    return firstValueFrom(this.http.get<RootObject>(
      `${klasterNodeHost.default}/explorer/${iTxHash}`
    ))
  }

    

}

interface IQueue<T> {
  enqueue(item: T): void;
  dequeue(): T | undefined;
  size(): number;
}

class Queue<T> implements IQueue<T> {
  private storage: T[] = [];

  constructor(private capacity: number = Infinity) {}

  enqueue(item: T): void {
    if (this.size() === this.capacity) {
      throw Error("Queue has reached max capacity, you cannot add more items");
    }
    this.storage.push(item);
  }
  dequeue(): T | undefined {
    return this.storage.shift();
  }
  size(): number {
    return this.storage.length;
  }
}



interface PaymentInfo {
  masterWallet: string;
  salt: string;
  token: string;
  chainId: string;
  tokenAmount: string;
  tokenValue: string;
}

interface UserOp {
  sender: string;
  nonce: string;
  initCode: string;
  callData: string;
  callGasLimit: string;
  verificationGasLimit: string;
  preVerificationGas: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  paymasterAndData: string;
}

interface UserOpInfo {
  userOp: UserOp;
  userOpHash: string;
  lowerBoundTimestamp: string;
  upperBoundTimestamp: string;
  maxGasLimit: string;
  chainId: string;
  executionStatus: string;
  executionData: string;
}

interface RootObject {
  itxHash: string;
  node: string;
  commitment: string;
  paymentInfo: PaymentInfo;
  userOps: UserOpInfo[];
}