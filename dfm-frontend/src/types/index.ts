import { Contract } from 'ethers';

export interface Gig {
  id: bigint;         
  seller: string;
  title: string;
  description: string;
  category: string;
  price: bigint;       
  active: boolean;
  createdAt: bigint;   
}

export type OrderStatus = 0 | 1 | 2 | 3 | 4;

export interface Order {
  id: bigint;
  gigId: bigint;
  buyer: string;
  seller: string;
  amount: bigint;
  status: OrderStatus;
  escrowAmount: bigint;
  createdAt: bigint;
  completedAt: bigint;
}

export interface Web3Contracts {
  marketplace?: Contract;
  disputes?: Contract;
  ratings?: Contract;
}

export interface Web3ContextType {
  account: string | null;
  contracts: Web3Contracts;
  connectWallet: () => Promise<void>;
}

declare global {
  interface Window {
    ethereum?: any;
  }
}