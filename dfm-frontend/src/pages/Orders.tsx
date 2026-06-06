import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../context/useWeb3';
import { api } from '../utils/api';

export default function Orders() {
  const { account, contracts } = useWeb3();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmLoadingId, setConfirmLoadingId] = useState<number | null>(null);

  useEffect(() => {
    if (account) {
      loadOrders();
    }
  }, [account]);

  const loadOrders = async () => {
    if (!account) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/requests/buyer/${account.toLowerCase()}`);
      console.log('Buyer orders from API:', data);
      setOrders(data || []);
    } catch (err) {
      console.error('Error loading buyer orders', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelivery = async (orderId: number) => {
    if (!contracts.marketplace) return;
    setConfirmLoadingId(orderId);
    try {
      const tx = await contracts.marketplace.confirmDelivery(orderId);
      await tx.wait();
      await api.patch(`/requests/${orderId}`, { status: 'CONFIRMED' });
      await loadOrders();
      alert('Delivery approved and payment released to seller.');
    } catch (err) {
      console.error('Failed to approve delivery', err);
      alert('Failed to approve delivery.');
    } finally {
      setConfirmLoadingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">My Orders</h1>
      {loading ? (
        <div className="text-center text-gray-500">Loading your buyer orders...</div>
      ) : orders.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center text-gray-500">
          You have no active buyer orders yet.
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            return (
              <div key={order.id.toString()} className="p-4 border rounded-lg shadow-sm bg-white">
                <div className="flex justify-between border-b pb-2 mb-4">
                  <h3 className="font-semibold">Order #{order.id.toString()}</h3>
                  <span className="text-blue-600 font-bold">{order.proposedPrice} ETH</span>
                </div>

                {order.status === 'PENDING' && (
                  <div className="text-gray-600">
                    <p className="mb-2">Waiting for the seller to upload the work.</p>
                    <p className="text-sm text-gray-500">Check your seller's service page once they deliver.</p>
                  </div>
                )}

                {order.status === 'AWAITING_BUYER_REVIEW' && (
                  <div>
                    <p className="text-purple-600 mb-3 font-semibold">Seller has uploaded work! Please review and approve it.</p>
                    {order.deliveryHash ? (
                      <>
                        <a
                          href={`https://gateway.pinata.cloud/ipfs/${order.deliveryHash.replace('ipfs://', '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 underline mb-4 block font-medium"
                        >
                          📥 Download Work for Review
                        </a>
                        <button
                          onClick={() => confirmDelivery(order.id)}
                          disabled={confirmLoadingId === order.id}
                          className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-bold disabled:opacity-50 mb-2"
                        >
                          {confirmLoadingId === order.id ? 'Approving...' : '✓ Approve Work & Release Payment'}
                        </button>
                      </>
                    ) : (
                      <p className="text-sm text-gray-500 mb-4">Delivery file is not available yet.</p>
                    )}
                  </div>
                )}

                {order.status === 'IN_PROGRESS' && (
                  <div className="text-blue-600">
                    <p>Seller is working on your order.</p>
                  </div>
                )}

                {order.status === 'CONFIRMED' && (
                  <div className="text-green-700 bg-green-50 p-3 rounded">
                    <p className="font-semibold">✓ Order completed and approved.</p>
                    <p className="text-sm">Payment has been released to the seller.</p>
                  </div>
                )}

                {order.status === 'REJECTED' && (
                  <div className="text-red-700 bg-red-50 p-3 rounded">
                    <p className="font-semibold">Order was rejected by the seller.</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
