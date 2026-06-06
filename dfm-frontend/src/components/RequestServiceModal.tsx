import React, { useState } from 'react';
import { api } from '../utils/api';

export default function RequestServiceModal({ gigId, sellerWallet, buyerWallet, onClose }: any) {
  const [requirements, setRequirements] = useState("");
  const [proposedPrice, setProposedPrice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await api.post('/requests', {
        gigId,
        buyerWallet,
        sellerWallet,
        requirements,
        proposedPrice: parseFloat(proposedPrice)
      });
      alert("Custom request sent successfully!");
      onClose();
    } catch (error) {
      alert("Failed to send request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Request Custom Service</h2>
        
        <label className="block text-sm font-medium mb-1">Project Requirements</label>
        <textarea 
          required
          rows={4}
          className="w-full border rounded p-2 mb-4"
          placeholder="Describe exactly what you need..."
          value={requirements}
          onChange={(e) => setRequirements(e.target.value)}
        />

        <label className="block text-sm font-medium mb-1">Proposed Budget (ETH)</label>
        <input 
          type="number" 
          step="0.01"
          className="w-full border rounded p-2 mb-6"
          placeholder="e.g. 0.5"
          value={proposedPrice}
          onChange={(e) => setProposedPrice(e.target.value)}
        />

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-4 py-2 rounded">
            {isSubmitting ? 'Sending...' : 'Send Request'}
          </button>
        </div>
      </form>
    </div>
  );
}