import React, { useState } from 'react';
import { useWeb3 } from '../context/useWeb3';
import { BigNumber } from 'ethers';

interface ReviewsProps {
  orderId: BigNumber;
  sellerAddress: string;
}

export default function Reviews({ orderId, sellerAddress }: ReviewsProps): JSX.Element {
  const { contracts } = useWeb3();
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);

  const submitReview = async (): Promise<void> => {
    if (!contracts.ratings) return;
    try {
      const tx = await contracts.ratings.submitReview(orderId, sellerAddress, rating, comment);
      await tx.wait();
      setSubmitted(true);
      alert("Review submitted successfully!");
    } catch (error) {
      console.error("Failed to submit review", error);
      alert("Could not submit review. Ensure you haven't reviewed this order already.");
    }
  };

  if (submitted) {
    return <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-2xl border border-green-200">✓ Review submitted. Thank you!</div>;
  }

  return (
    <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 mt-4">
      <h3 className="font-semibold text-gray-800 mb-3">Rate this delivery</h3>
      <div className="flex flex-col md:flex-row items-center gap-3">
        <select 
          className="p-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 w-full md:w-auto font-medium"
          value={rating} 
          onChange={e => setRating(Number(e.target.value))}
        >
          <option value={5}>⭐⭐⭐⭐⭐ (5)</option>
          <option value={4}>⭐⭐⭐⭐ (4)</option>
          <option value={3}>⭐⭐⭐ (3)</option>
          <option value={2}>⭐⭐ (2)</option>
          <option value={1}>⭐ (1)</option>
        </select>
        <input 
          className="flex-1 p-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 w-full" 
          placeholder="Leave a comment about the service..." 
          value={comment}
          onChange={e => setComment(e.target.value)} 
        />
        <button 
          onClick={submitReview} 
          disabled={!comment}
          className="bg-yellow-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-yellow-600 transition disabled:opacity-50 w-full md:w-auto"
        >
          Submit
        </button>
      </div>
    </div>
  );
}