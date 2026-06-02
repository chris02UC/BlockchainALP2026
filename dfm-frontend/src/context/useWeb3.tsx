import React, { useState, createContext, useContext, type ReactNode, useEffect } from 'react';
import { ethers } from 'ethers';
import { type Web3ContextType, type Web3Contracts } from '../types';
import { MARKETPLACE_ADDRESS, DISPUTES_ADDRESS, RATINGS_ADDRESS } from '../config';

import MarketplaceABI from '../abis/Marketplace.json';
import DisputesABI from '../abis/Disputes.json';
import RatingsABI from '../abis/Ratings.json';


const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export const Web3Provider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [contracts, setContracts] = useState<Web3Contracts>({});

  const connectWallet = async (): Promise<void> => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = provider.getSigner();
        const address = await signer.getAddress();
        
        const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MarketplaceABI.abi || MarketplaceABI, signer);
        const disputes = new ethers.Contract(DISPUTES_ADDRESS, DisputesABI.abi || DisputesABI, signer);
        const ratings = new ethers.Contract(RATINGS_ADDRESS, RatingsABI.abi || RatingsABI, signer);

        setAccount(address);
        setContracts({ marketplace, disputes, ratings });
      } catch (error) {
        console.error("Connection failed", error);
      }
    } else {
      alert("Please install a Web3 wallet like MetaMask.");
    }
  };

  // Auto-connect if already authorized
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
        if (accounts.length > 0) connectWallet();
      });
      
      window.ethereum.on('accountsChanged', () => window.location.reload());
      window.ethereum.on('chainChanged', () => window.location.reload());
    }
  }, []);

  return (
    <Web3Context.Provider value={{ account, contracts, connectWallet }}>
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = (): Web3ContextType => {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};