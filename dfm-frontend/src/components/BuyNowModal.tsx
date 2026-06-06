import React, { useState } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../context/useWeb3';

export default function BuyNowModal({ gig, onClose }: any) {
  const { contracts } = useWeb3();
  const [isPurchasing, setIsPurchasing] = useState(false);

  const handleBuy = async () => {
    if (!contracts.marketplace) return alert("Please connect your wallet first.");
    
    setIsPurchasing(true);
    try {
      // Calls the smart contract and passes the exact gig price in Wei
      const tx = await contracts.marketplace.placeOrder(gig.id, { value: gig.price });
      await tx.wait(); // Wait for the blockchain to mine the transaction
      
      alert("Order placed securely! Funds are in escrow.");
      onClose(); // Close the modal on success
    } catch (error) {
      console.error("Transaction failed", error);
      alert("Failed to place order. Did you reject the transaction?");
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Confirm Purchase</h2>
        
        <p className="mb-4 text-gray-700">
          You are about to purchase <strong>{gig.title}</strong> securely through the blockchain.
        </p>

        <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
          <div className="flex justify-between mb-2 text-sm text-gray-600">
            <span>Service Price:</span>
            <span>{ethers.utils.formatEther(gig.price)} ETH</span>
          </div>
          <div className="flex justify-between mb-2 text-sm text-gray-600">
            <span>Escrow Fee:</span>
            <span>0.00 ETH</span>
          </div>
          <hr className="my-2 border-gray-200" />
          <div className="flex justify-between text-lg font-bold">
            <span>Total:</span>
            <span>{ethers.utils.formatEther(gig.price)} ETH</span>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button 
            onClick={onClose} 
            disabled={isPurchasing}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-medium transition"
          >
            Cancel
          </button>
          <button 
            onClick={handleBuy}
            disabled={isPurchasing}
            className="bg-blue-600 text-white px-6 py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center min-w-[140px]"
          >
            {isPurchasing ? 'Processing...' : 'Confirm & Pay'}
          </button>
        </div>
      </div>
    </div>
  );
}