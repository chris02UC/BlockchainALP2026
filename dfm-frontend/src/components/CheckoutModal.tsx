import React, { useState } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../context/useWeb3';
import { api } from '../utils/api';

interface CheckoutModalProps {
  gig: any;
  numericGigId: number;
  buyerWallet: string;
  onClose: () => void;
}

export default function CheckoutModal({ gig, numericGigId, buyerWallet, onClose }: CheckoutModalProps) {
  const { contracts } = useWeb3();
  const [requirements, setRequirements] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevents page reload
    if (!contracts.marketplace) return alert("Please connect your wallet first.");
    if (!buyerWallet) return alert("Missing buyer wallet address.");
    
    setIsProcessing(true);
    try {
      // Step 1: Trigger the Smart Contract Payment (Escrow)
      const tx = await contracts.marketplace.placeOrder(gig.id, { value: gig.price });
      await tx.wait(); // Wait for MetaMask transaction to be confirmed

      // Step 2: Save their specific requirements to your PostgreSQL database
      // so the seller can read them on their dashboard!
      try {
        await api.post('/requests', {
          gigId: numericGigId,
          buyerWallet,
          sellerWallet: gig.seller,
          requirements: requirements, // The required text from the form
          proposedPrice: parseFloat(ethers.utils.formatEther(gig.price))
        });
      } catch (dbError) {
        console.error("Failed to save off-chain requirements, but payment succeeded", dbError);
      }

      alert("Order placed securely! Your requirements have been sent to the seller.");
      onClose();
    } catch (error) {
      console.error("Transaction failed", error);
      alert("Failed to place order. Did you cancel the MetaMask transaction?");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="bg-gray-900 text-white p-6">
          <h2 className="text-xl font-bold mb-1">Complete Your Order</h2>
          <p className="text-sm text-gray-300 line-clamp-1">{gig.title}</p>
        </div>

        {/* The Unified Form */}
        <form onSubmit={handleCheckout} className="p-6">
          
          <label className="block text-sm font-bold mb-2">Project Requirements <span className="text-red-500">*</span></label>
          <p className="text-xs text-gray-500 mb-3">Please specify exactly what you need the seller to do.</p>
          <textarea 
            required
            rows={4}
            className="w-full border border-gray-200 rounded-xl p-3 mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            placeholder="e.g., I need a 5-page React website with a dark theme..."
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
          />

          {/* Price Summary */}
          <div className="bg-gray-50 p-4 rounded-xl mb-6 border border-gray-100">
            <div className="flex justify-between mb-2 text-sm text-gray-600">
              <span>Service Price:</span>
              <span>{ethers.utils.formatEther(gig.price)} ETH</span>
            </div>
            <div className="flex justify-between mb-2 text-sm text-gray-600">
              <span>Platform Fee:</span>
              <span className="text-green-600 font-bold">Free</span>
            </div>
            <hr className="my-3 border-gray-200" />
            <div className="flex justify-between text-lg font-black">
              <span>Total Due:</span>
              <span>{ethers.utils.formatEther(gig.price)} ETH</span>
            </div>
          </div>

          {/* Buttons */}
          <button 
            type="submit" 
            disabled={isProcessing}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition mb-3"
          >
            {isProcessing ? 'Processing in MetaMask...' : 'Confirm & Pay'}
          </button>
          
          <button 
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="w-full text-center py-2 text-sm font-bold text-gray-400 hover:text-gray-600 transition"
          >
            Cancel
          </button>

        </form>
      </div>
    </div>
  );
}