import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../context/useWeb3';
import axios from 'axios';

// A simple utility to upload to Pinata IPFS (Requires VITE_PINATA_JWT in .env)
const uploadToIPFS = async (file: File) => {
  console.log("Pinata Key Check:", import.meta.env.VITE_PINATA_JWT);
  const formData = new FormData();
  formData.append('file', file);
  const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
    headers: { Authorization: `Bearer ${import.meta.env.VITE_PINATA_JWT}` }
  });
  return `ipfs://${res.data.IpfsHash}`;
};

export default function Orders() {
  const { account, contracts } = useWeb3();
  const [orders, setOrders] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  useEffect(() => {
    if (contracts.marketplace && account) {
      loadOrders();
    }
  }, [contracts, account]);

  const loadOrders = async () => {
    // Note: You might need to adjust this depending on how many orders the user has
    // This is a simplified fetch assuming you have a getBuyerOrders / getSellerOrders hook
    try {
      const buyerOrderIds = await contracts.marketplace!.getBuyerOrders(account);
      const sellerOrderIds = await contracts.marketplace!.getSellerOrders(account);
      
      const allOrderIds = [...new Set([...buyerOrderIds, ...sellerOrderIds])];
      const fetchedOrders = await Promise.all(
        allOrderIds.map(id => contracts.marketplace!.getOrder(id))
      );
      setOrders(fetchedOrders);
    } catch (err) {
      console.error("Error loading orders", err);
    }
  };

  const deliverWork = async (orderId: number) => {
    if (!file || !contracts.marketplace) return;
    setLoadingId(orderId);
    try {
      const ipfsHash = await uploadToIPFS(file);
      const tx = await contracts.marketplace.completeOrder(orderId, ipfsHash);
      await tx.wait();
      loadOrders();
    } catch (err) {
      console.error(err);
      alert("Failed to deliver work.");
    }
    setLoadingId(null);
  };

  const confirmDelivery = async (orderId: number) => {
    setLoadingId(orderId);
    try {
      const tx = await contracts.marketplace!.confirmDelivery(orderId);
      await tx.wait();
      loadOrders();
    } catch (err) {
      console.error(err);
      alert("Failed to confirm. Make sure the order is not disputed.");
    }
    setLoadingId(null);
  };

  const autoClaim = async (orderId: number) => {
    setLoadingId(orderId);
    try {
      const tx = await contracts.marketplace!.autoConfirmDelivery(orderId);
      await tx.wait();
      loadOrders();
    } catch (err) {
      console.error(err);
      alert("Cannot claim yet. 3 days have not passed or a dispute is active.");
    }
    setLoadingId(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Active Orders</h1>
      <div className="space-y-4">
        {orders.map((order) => {
          const isSeller = order.seller.toLowerCase() === account?.toLowerCase();
          const isBuyer = order.buyer.toLowerCase() === account?.toLowerCase();
          
          // 3 days = 259200 seconds
          const canAutoClaim = order.completedAt > 0 && 
            (Math.floor(Date.now() / 1000) >= Number(order.completedAt) + 259200);

          return (
            <div key={order.id} className="p-4 border rounded-lg shadow-sm bg-white">
              <div className="flex justify-between border-b pb-2 mb-4">
                <h3 className="font-semibold">Order #{order.id.toString()}</h3>
                <span className="text-blue-600 font-bold">{ethers.utils.formatEther(order.amount)} ETH</span>
              </div>

              {/* Status PENDING - Seller needs to deliver */}
              {order.status === 0 && isSeller && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Upload the final files for the buyer:</p>
                  <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="mb-2 block" />
                  <button 
                    onClick={() => deliverWork(order.id)}
                    disabled={loadingId === order.id || !file}
                    className="bg-blue-600 text-white px-4 py-2 rounded"
                  >
                    {loadingId === order.id ? 'Uploading...' : 'Deliver Work'}
                  </button>
                </div>
              )}

              {/* Status COMPLETED - Buyer needs to review */}
              {order.status === 1 && isBuyer && (
                <div>
                  <p className="text-green-600 mb-2">Work delivered! Please review and confirm.</p>
                  <a 
                    href={`https://gateway.pinata.cloud/ipfs/${order.deliveryHash.replace('ipfs://', '')}`} 
                    target="_blank" rel="noreferrer"
                    className="text-blue-500 underline mb-4 block"
                  >
                    Download File
                  </a>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => confirmDelivery(order.id)}
                      disabled={loadingId === order.id}
                      className="bg-green-600 text-white px-4 py-2 rounded"
                    >
                      {loadingId === order.id ? 'Processing...' : 'Confirm Delivery'}
                    </button>
                    {/* Add a button to route to Disputes page here */}
                  </div>
                </div>
              )}

              {/* Status COMPLETED - Seller waiting or claiming */}
              {order.status === 1 && isSeller && (
                <div className="bg-yellow-50 p-3 rounded">
                  <p className="text-sm text-yellow-800">Waiting for buyer to confirm.</p>
                  <button 
                    onClick={() => autoClaim(order.id)}
                    disabled={!canAutoClaim || loadingId === order.id}
                    className="mt-2 bg-yellow-600 text-white px-4 py-2 rounded disabled:opacity-50"
                  >
                    {loadingId === order.id ? 'Processing...' : 'Auto-Claim Funds (After 3 Days)'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}