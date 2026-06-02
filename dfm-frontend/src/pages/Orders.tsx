import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/useWeb3';
import { ethers } from 'ethers';
import { type Order } from '../types'; // We import this but will cast it away to avoid the error
import Reviews from '../components/Reviews';

// 1. Label array to replace the broken Enum text rendering
const STATUS_LABELS = ["PENDING", "COMPLETED", "CONFIRMED", "CANCELED", "DISPUTED"];

export default function Orders(): JSX.Element {
  const { account, contracts } = useWeb3();
  
  // 2. Use any[] instead of Order[] to bypass the locked BigNumber type mismatch
  const [orders, setOrders] = useState<any[]>([]); 
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (contracts.marketplace && account) {
      fetchOrders();
    } else {
      setLoading(false);
    }
  }, [contracts, account]);

  const fetchOrders = async (): Promise<void> => {
    if (!contracts.marketplace || !account) return;
    
    try {
      // 3. Bypass strict array mapping types
      const buyerIds = await contracts.marketplace.getBuyerOrders(account);
      const sellerIds = await contracts.marketplace.getSellerOrders(account);
      
      const uniqueIds = Array.from(new Set([...buyerIds, ...sellerIds].map((id: any) => id.toString())));

      const orderData = await Promise.all(
        uniqueIds.map(id => contracts.marketplace!.getOrder(id))
      );
      
      // 4. Use Number() to sort instead of .toNumber()
      setOrders(orderData.sort((a: any, b: any) => Number(b.createdAt) - Number(a.createdAt)));
    } catch (error) {
      console.error("Error fetching orders", error);
    } finally {
      setLoading(false);
    }
  };

  // 5. Change parameters to 'any' to stop the BigNumber vs bigint fight
  const completeOrder = async (orderId: any): Promise<void> => {
    if (!contracts.marketplace) return;
    try {
      const tx = await contracts.marketplace.completeOrder(orderId);
      await tx.wait();
      fetchOrders();
    } catch (e) {
      alert("Failed to mark as complete.");
    }
  };

  const confirmDelivery = async (orderId: any): Promise<void> => {
    if (!contracts.marketplace) return;
    try {
      const tx = await contracts.marketplace.confirmDelivery(orderId);
      await tx.wait();
      alert("Funds released from escrow!");
      fetchOrders();
    } catch (e) {
      alert("Failed to confirm delivery.");
    }
  };

  const cancelOrder = async (orderId: any): Promise<void> => {
    if (!contracts.marketplace) return;
    try {
      const tx = await contracts.marketplace.cancelOrder(orderId);
      await tx.wait();
      fetchOrders();
    } catch (e) {
      alert("Failed to cancel order.");
    }
  };

  // 6. Hardcoded numbers instead of Enum
  const getStatusColor = (status: number) => {
    switch (status) {
      case 0: return 'bg-yellow-100 text-yellow-800'; // PENDING
      case 1: return 'bg-blue-100 text-blue-800';   // COMPLETED
      case 2: return 'bg-green-100 text-green-800'; // CONFIRMED
      case 3: return 'bg-red-100 text-red-800';     // CANCELED
      case 4: return 'bg-purple-100 text-purple-800'; // DISPUTED
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Safe Ethers format fallback (handles both v5 and v6)
  const formatEth = (wei: any) => {
    // @ts-ignore
    return ethers.utils ? ethers.utils.formatEther(wei || 0) : ethers.formatEther(wei || 0);
  };

  if (loading) return <div className="text-center mt-20 text-gray-500">Loading orders...</div>;
  if (!account) return <div className="text-center mt-20 text-gray-500">Please connect wallet to view orders.</div>;

  return (
    <div className="max-w-5xl mx-auto px-6">
      <h1 className="text-3xl font-bold mb-8">My Escrow Vault</h1>
      
      <div className="flex flex-col gap-6">
        {orders.length === 0 ? (
          <p className="text-gray-500 bg-white p-8 rounded-3xl border border-gray-200 text-center">You have no active or past orders.</p>
        ) : (
          orders.map((order: any) => {
            const isBuyer = order.buyer === account;
            const isSeller = order.seller === account;
            
            return (
              <div key={order.id.toString()} className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-bold text-gray-400">ORDER #{order.id.toString()}</span>
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold tracking-wide ${getStatusColor(order.status)}`}>
                        {STATUS_LABELS[order.status]}
                      </span>
                    </div>
                    <p className="text-gray-600 font-medium">Escrow Locked: <span className="text-black font-bold">{formatEth(order.escrowAmount)} ETH</span></p>
                    <p className="text-sm text-gray-500 mt-1">
                      {isBuyer ? `Seller: ${order.seller}` : `Buyer: ${order.buyer}`}
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-3">
                    {isSeller && order.status === 0 && (
                      <button onClick={() => completeOrder(order.id)} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition">
                        Deliver Work
                      </button>
                    )}
                    
                    {isBuyer && order.status === 1 && (
                      <button onClick={() => confirmDelivery(order.id)} className="bg-green-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-green-600 transition shadow-sm border border-green-600">
                        Approve & Release Funds
                      </button>
                    )}
                    
                    {(order.status === 0 || order.status === 1) && (
                      <button onClick={() => cancelOrder(order.id)} className="bg-red-50 text-red-600 px-6 py-2.5 rounded-xl font-semibold hover:bg-red-100 transition border border-red-200">
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {/* Show review component if order is fully confirmed and user is the buyer */}
                {isBuyer && order.status === 2 && (
                  <Reviews orderId={order.id} sellerAddress={order.seller} />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}