import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../context/useWeb3';
import { api } from '../utils/api';

export default function Orders() {
  const { account, contracts } = useWeb3();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmLoadingId, setConfirmLoadingId] = useState<number | null>(null);
  const [revisionLoadingId, setRevisionLoadingId] = useState<number | null>(null);
  const [revisionOrderId, setRevisionOrderId] = useState<number | null>(null);
  const [revisionNotes, setRevisionNotes] = useState<string>('');

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

  const submitRevision = async (orderId: number) => {
    if (!contracts.marketplace) return;
    if (!revisionNotes.trim()) return alert('Please enter your revision notes.');

    setRevisionLoadingId(orderId);
    try {
      // 1. Call the new smart contract function
      const tx = await contracts.marketplace.requestRevision(orderId);
      await tx.wait();

      // 2. Update the backend database with IN_PROGRESS AND the notes
      await api.patch(`/requests/${orderId}`, { 
        status: 'IN_PROGRESS',
        revisionNotes: revisionNotes 
      });
      
      // 3. Reload the UI
      await loadOrders();
      alert('Revision requested! The order has been sent back to the seller.');
      
      // Clear the text box
      setRevisionOrderId(null);
      setRevisionNotes('');
    } catch (err) {
      console.error('Failed to request revision', err);
      alert('Failed to request revision. Check console for details.');
    } finally {
      setRevisionLoadingId(null);
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
                        
                        <div className="flex flex-col gap-2">
                          
                          <button
                            onClick={() => confirmDelivery(order.id)}
                            disabled={confirmLoadingId === order.id || revisionLoadingId === order.id}
                            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-bold disabled:opacity-50"
                          >
                            {confirmLoadingId === order.id ? 'Approving...' : '✓ Approve Work & Release Payment'}
                          </button>


                          {revisionOrderId === order.id ? (
                            <div className="mt-4 p-4 border border-orange-200 bg-orange-50 rounded-lg">
                              <h4 className="font-bold text-orange-800 mb-2">What needs to be revised?</h4>
                              <textarea
                                className="w-full border border-orange-300 p-2 rounded mb-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                                rows={3}
                                placeholder="Please explain the changes you need..."
                                value={revisionNotes}
                                onChange={(e) => setRevisionNotes(e.target.value)}
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => submitRevision(order.id)}
                                  disabled={revisionLoadingId === order.id}
                                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 rounded-lg font-bold text-sm disabled:opacity-50"
                                >
                                  {revisionLoadingId === order.id ? 'Submitting...' : 'Submit Notes'}
                                </button>
                                <button
                                  onClick={() => { setRevisionOrderId(null); setRevisionNotes(''); }}
                                  className="px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-lg font-bold text-sm"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setRevisionOrderId(order.id)}
                              disabled={confirmLoadingId === order.id}
                              className="w-full bg-orange-100 hover:bg-orange-200 text-orange-800 border border-orange-300 py-2 px-4 rounded-lg font-bold disabled:opacity-50 transition"
                            >
                              ↻ Request Revision
                            </button>
                          )}

                        </div>
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
