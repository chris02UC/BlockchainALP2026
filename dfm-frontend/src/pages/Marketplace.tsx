import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/useWeb3';
import { ethers, BigNumber } from 'ethers';
import type { Gig } from '../types';
import GigCard from '../components/GigCard';

interface GigFormState {
  title: string;
  description: string;
  category: string;
  price: string;
}

export default function Marketplace(): JSX.Element {
  const { contracts, account } = useWeb3();
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
            <GigCard 
              key={gig.id.toString()} 
              gig={gig} 
              userWallet={account || ""} // Pass the connected wallet address down
            />
          ))
        )}
      </div>
    </div>
  );
}