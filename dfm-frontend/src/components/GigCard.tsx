import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { api } from '../utils/api';
import { ethers } from 'ethers';
import { useWeb3 } from '../context/useWeb3';
import CheckoutModal from './CheckoutModal';

interface GigCardProps {
  gig: any; 
  userWallet: string; 
}

export default function GigCard({ gig, userWallet }: GigCardProps) {
  const { contracts } = useWeb3(); // Extract contracts
  
  const [isSaved, setIsSaved] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false); 
  const [seller, setSeller] = useState<any>(null);
  
  // 3. New states for on-chain ratings
  const [rating, setRating] = useState<number>(0);
  const [reviewCount, setReviewCount] = useState<number>(0);

  const numericGigId = gig.id.toNumber ? gig.id.toNumber() : gig.id;

  // Fetch Saved Status
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

  // Fetch Off-chain Seller Profile
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

  // 4. Fetch On-chain Ratings!
  useEffect(() => {
    const fetchRating = async () => {
      if (!contracts.ratings || !gig.seller) return;
      try {
        const avgRating = await contracts.ratings.getSellerRating(gig.seller);
        const count = await contracts.ratings.getReviewCount(gig.seller);
        setRating(Number(avgRating));
        setReviewCount(Number(count));
      } catch (error) {
        console.error("Failed to fetch on-chain rating", error);
      }
    }
    fetchRating();
  }, [gig.seller, contracts]);

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
        
        {/* Seller Info + Ratings */}
        {seller && (
          <div className="flex items-center gap-3 mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
            {seller.profilePictureUrl ? (
              <img src={seller.profilePictureUrl} alt={seller.username} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm">👤</div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-800 truncate">{seller.username || 'Unknown'}</p>
              
              {/* 5. Display the Stars */}
              <div className="flex items-center gap-1 mt-0.5">
                {reviewCount > 0 ? (
                  <>
                    <span className="text-yellow-500 text-xs tracking-widest">
                      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
                    </span>
                    <span className="text-xs text-gray-500 font-semibold ml-1">({reviewCount})</span>
                  </>
                ) : (
                  <span className="text-xs text-gray-400 italic font-medium">New Seller</span>
                )}
              </div>

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
        <button 
          onClick={() => setShowCheckout(true)}
          disabled={!gig.active}
          className="w-full bg-blue-600 text-white font-bold px-4 py-3 rounded-xl disabled:opacity-50 hover:bg-blue-700 transition shadow-sm"
        >
          Order Now
        </button>
      </div>

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