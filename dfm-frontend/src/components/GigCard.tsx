import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { api } from '../utils/api';
import { ethers } from 'ethers';
import CheckoutModal from './CheckoutModal'; // Import the unified modal

interface GigCardProps {
  gig: any; 
  userWallet: string; 
}

export default function GigCard({ gig, userWallet }: GigCardProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false); // Single state for the new modal
  const [seller, setSeller] = useState<any>(null);

  const numericGigId = gig.id.toNumber ? gig.id.toNumber() : gig.id;

  useEffect(() => {
    const checkSavedStatus = async () => {
      if (!userWallet) return;
      try {
        const { data } = await api.get(`/saved-gigs/${userWallet}`);
        setIsSaved(data.includes(numericGigId));
      } catch (error) {
        console.error("Failed to fetch saved status", error);
      }
    };
    checkSavedStatus();
  }, [numericGigId, userWallet]);
  // Fetch seller profile
  useEffect(() => {
    const fetchSeller = async () => {
      if (!gig.seller) return;
      try {
        const { data } = await api.get(`/users/${gig.seller.toLowerCase()}`);
        setSeller(data);
      } catch (error) {
        console.error("Failed to fetch seller info", error);
      }
    }
    fetchSeller();
  }, [gig.seller]);
  const toggleSave = async () => {
    if (!userWallet) return alert("Please connect your wallet");
    try {
      const { data } = await api.post('/saved-gigs/toggle', {
        wallet: userWallet,
        gigId: numericGigId 
      });
      setIsSaved(data.saved); 
    } catch (error) {
      console.error("Failed to toggle save", error);
    }
  };

  return (
    <div className="border rounded-2xl p-5 shadow-sm relative bg-white flex flex-col h-full hover:shadow-md transition duration-300">
      <button 
        onClick={toggleSave} 
        className="absolute top-5 right-5 text-red-500 hover:scale-110 transition"
      >
        <Heart fill={isSaved ? "currentColor" : "none"} size={22} />
      </button>

      <div className="flex-grow">
        <h3 className="text-lg font-extrabold mt-2 pr-8 leading-tight">{gig.title}</h3>
        <p className="text-sm text-gray-500 mt-2 line-clamp-2">{gig.description}</p>
        
        {/* Seller Info */}
        {seller && (
          <div className="flex items-center gap-2 mt-4 p-3 bg-gray-50 rounded-lg">
            {seller.profilePictureUrl ? (
              <img src={seller.profilePictureUrl} alt={seller.username} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs">👤</div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-800 truncate">{seller.username || 'Unknown'}</p>
              {seller.bio && <p className="text-xs text-gray-600 truncate">{seller.bio}</p>}
            </div>
          </div>
        )}
        
        <div className="mt-6 mb-2">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Starting at</span>
          <p className="text-gray-900 font-black text-xl">
            {ethers.utils.formatEther(gig.price)} ETH
          </p>
        </div>
        
        {!gig.active && (
          <span className="bg-red-50 text-red-600 text-xs font-bold px-2 py-1 rounded mt-1 inline-block">
            Currently Paused
          </span>
        )}
      </div>

      <div className="mt-4">
        {/* Single unified button */}
        <button 
          onClick={() => setShowCheckout(true)}
          disabled={!gig.active}
          className="w-full bg-blue-600 text-white font-bold px-4 py-3 rounded-xl disabled:opacity-50 hover:bg-blue-700 transition"
        >
          Order Now
        </button>
      </div>

      {/* Render the unified modal */}
      {showCheckout && (
        <CheckoutModal 
          gig={gig} 
          numericGigId={numericGigId}
          buyerWallet={userWallet}
          onClose={() => setShowCheckout(false)} 
        />
      )}
    </div>
  );
}