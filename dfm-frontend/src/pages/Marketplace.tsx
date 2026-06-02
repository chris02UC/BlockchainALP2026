import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/useWeb3';
import { ethers, BigNumber } from 'ethers';
import type { Gig } from '../types';

interface GigFormState {
  title: string;
  description: string;
  category: string;
  price: string;
}

export default function Marketplace(): JSX.Element {
  const { contracts } = useWeb3();
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [form, setForm] = useState<GigFormState>({ title: '', description: '', category: '', price: '' });

  useEffect(() => {
    if (contracts.marketplace) {
      fetchGigs();
    } else {
      setLoading(false);
    }
  }, [contracts]);

  const fetchGigs = async (): Promise<void> => {
    if (!contracts.marketplace) return;
    try {
      const gigIds: BigNumber[] = await contracts.marketplace.getAllGigs();
      const gigsData: Gig[] = await Promise.all(
        gigIds.map(id => contracts.marketplace!.getGig(id))
      );
      setGigs(gigsData.filter(g => g.active));
    } catch (error) {
      console.error("Error fetching gigs:", error);
    } finally {
      setLoading(false);
    }
  };

  const createGig = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!contracts.marketplace) return;

    try {
      const priceWei = ethers.utils.parseEther(form.price);
      const tx = await contracts.marketplace.createGig(form.title, form.description, form.category, priceWei);
      await tx.wait();
      fetchGigs();
      setForm({ title: '', description: '', category: '', price: '' });
    } catch (error) {
      console.error("Failed to create gig", error);
      alert("Transaction failed. Check console for details.");
    }
  };

  const buyGig = async (gigId: bigint, price: bigint): Promise<void> => {
    if (!contracts.marketplace) return;
    try {
      const tx = await contracts.marketplace.placeOrder(gigId, { value: price });
      await tx.wait();
      alert("Order placed securely! Funds are in escrow.");
    } catch (error) {
      console.error("Transaction failed", error);
      alert("Failed to place order.");
    }
  };

  if (loading) return <div className="text-center mt-20 text-gray-500">Loading marketplace data...</div>;

  return (
    <div className="max-w-7xl mx-auto px-6">
      
      {/* Create Gig Section */}
      <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm mb-12">
        <h2 className="text-2xl font-bold mb-6">Post a New Gig</h2>
        <form onSubmit={createGig} className="flex flex-col md:flex-row gap-4">
          <input 
            className="flex-1 p-4 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition" 
            placeholder="Gig Title" 
            value={form.title} 
            onChange={e => setForm({...form, title: e.target.value})} 
            required 
          />
          <input 
            className="flex-1 p-4 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition" 
            placeholder="Category (e.g. Design)" 
            value={form.category} 
            onChange={e => setForm({...form, category: e.target.value})} 
            required 
          />
          <input 
            className="flex-1 p-4 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition" 
            placeholder="Description" 
            value={form.description} 
            onChange={e => setForm({...form, description: e.target.value})} 
            required 
          />
          <input 
            className="w-full md:w-40 p-4 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition" 
            type="number" 
            step="0.0001" 
            placeholder="ETH Price" 
            value={form.price} 
            onChange={e => setForm({...form, price: e.target.value})} 
            required 
          />
          <button type="submit" className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-semibold hover:bg-black transition">
            Publish
          </button>
        </form>
      </div>

      {/* Gig List */}
      <h2 className="text-2xl font-bold mb-6">Available Services</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {gigs.length === 0 ? (
          <p className="text-gray-500 col-span-full">No active gigs found.</p>
        ) : (
          gigs.map(gig => (
            <div key={gig.id.toString()} className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm hover:shadow-md transition flex flex-col justify-between">
              <div>
                <span className="inline-block bg-blue-50 text-blue-600 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-4">
                  {gig.category}
                </span>
                <h3 className="text-xl font-bold leading-tight mb-2">{gig.title}</h3>
                <p className="text-sm text-gray-500 line-clamp-3 mb-4">{gig.description}</p>
                <div className="flex items-center gap-2 mb-6">
                  <div className="h-6 w-6 rounded-full bg-gray-200"></div>
                  <p className="text-xs text-gray-500 font-medium">{gig.seller.substring(0,6)}...{gig.seller.substring(38)}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-lg font-extrabold">{ethers.utils.formatEther(gig.price)} ETH</span>
                <button 
                  onClick={() => buyGig(gig.id, gig.price)} 
                  className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition"
                >
                  Order
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}