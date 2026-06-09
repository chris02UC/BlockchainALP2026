import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useWeb3 } from '../context/useWeb3';
import { ethers } from 'ethers';
import { uploadToIPFS } from '../utils/ipfs';

export default function SellerDashboard() {
  const { account, contracts } = useWeb3();

  // States
  const [myGigs, setMyGigs] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadFiles, setUploadFiles] = useState<Record<number, File | null>>({});
  const [uploadLoadingId, setUploadLoadingId] = useState<number | null>(null);
  const [confirmLoadingId, setConfirmLoadingId] = useState<number | null>(null);

  // NEW: State to track which gig is currently clicked/expanded
  const [expandedGigId, setExpandedGigId] = useState<number | null>(null);

  // 1. Fetch On-Chain Gigs
  useEffect(() => {
    const fetchMyGigs = async () => {
      if (!account || !contracts.marketplace) return;
      const marketplaceContract = contracts.marketplace;

      try {
        const gigIds = await marketplaceContract.getSellerGigs(account);
        const gigsData = await Promise.all(
          gigIds.map(async (id: any) => {
            const gig = await marketplaceContract.getGig(id);
            return {
              id: gig.id.toNumber(),
              title: gig.title,
              active: gig.active,
              price: ethers.utils.formatEther(gig.price)
            };
          })
        );
        setMyGigs(gigsData);
      } catch (error) {
        console.error("Failed to fetch gigs", error);
      }
    };
    fetchMyGigs();
  }, [account, contracts]);

  // 2. Fetch Off-Chain Orders
  useEffect(() => {
    const fetchOrders = async () => {
      if (!account) {
        setIsLoading(false);
        return;
      }
      try {
        // Make sure this matches the backend route exactly
        const { data } = await api.get(`/requests/seller/${account.toLowerCase()}`);
        console.log("Orders fetched from API:", data);
        setOrders(data || []);
      } catch (error) {
        console.error("Failed to fetch orders", error);
        setOrders([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrders();
  }, [account]);

  // Handle on-chain Pause/Unpause
  const handleTogglePause = async (gigId: number) => {
    const marketplaceContract = contracts.marketplace;
    if (!marketplaceContract) return alert("Contract not loaded");
    try {
      const tx = await marketplaceContract.toggleGigStatus(gigId);
      await tx.wait();
      alert("Gig status updated!");
      window.location.reload();
    } catch (error) {
      console.error("Transaction failed", error);
    }
  };

  // Handle updating order status in Postgres
  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      await api.patch(`/requests/${orderId}`, { status: newStatus });
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch (error) {
      alert("Failed to update order status.");
    }
  };

  const setUploadFileForOrder = (orderId: number, file: File | null) => {
    setUploadFiles(prev => ({ ...prev, [orderId]: file }));
  };

  const deliverWork = async (orderId: number) => {
    const file = uploadFiles[orderId];
    if (!file) return alert('Please choose a file to upload.');
    if (!account) return alert('Connect your wallet first.');
    if (!contracts.marketplace) return alert('Contract not loaded.');

    setUploadLoadingId(orderId);
    try {
      // 1. Upload file to IPFS
      const deliveryHash = await uploadToIPFS(file);

      // 2. Call smart contract to mark order as COMPLETED with delivery hash
      const tx = await contracts.marketplace.completeOrder(orderId, deliveryHash);
      await tx.wait();

      // 3. Update database
      const response = await api.patch(`/requests/${orderId}`, {
        status: 'AWAITING_BUYER_REVIEW',
        deliveryHash
      });
      setOrders(orders.map(o => o.id === orderId ? response.data : o));
      setUploadFiles(prev => ({ ...prev, [orderId]: null }));
      alert('Work uploaded and sent to buyer for review.');
    } catch (error) {
      console.error('Failed to deliver work:', error);
      alert('Failed to upload work.');
    } finally {
      setUploadLoadingId(null);
    }
  };

  const confirmDelivery = async (orderId: number) => {
    if (!contracts.marketplace) return;
    setConfirmLoadingId(orderId);
    try {
      const tx = await contracts.marketplace.confirmDelivery(orderId);
      await tx.wait();
      await updateOrderStatus(orderId, 'CONFIRMED');
      alert('Delivery confirmed and payment released.');
    } catch (err) {
      console.error('Failed to confirm delivery', err);
      alert('Failed to confirm delivery.');
    } finally {
      setConfirmLoadingId(null);
    }
  };

  // Toggle the expanded view for a specific gig
  const toggleExpand = (gigId: number) => {
    if (expandedGigId === gigId) {
      setExpandedGigId(null); // Close it if it's already open
    } else {
      setExpandedGigId(gigId); // Open the clicked one
    }
  };

  const requestRevision = async (orderId: number) => {
    if (!contracts.marketplace) return;
    try {
      // 1. Send the transaction to the smart contract
      const tx = await contracts.marketplace.requestRevision(orderId);
      await tx.wait();

      // 2. Update your off-chain database to send it back to the seller
      await updateOrderStatus(orderId, 'IN_PROGRESS');

      alert('Revision requested! The order has been sent back to the seller.');
    } catch (err) {
      console.error('Failed to request revision', err);
      alert('Failed to request revision.');
    }
  };

  if (isLoading) return <div className="text-center mt-20 text-gray-500 font-bold">Loading Dashboard...</div>;
  console.log("DEBUG: Database Orders Received:", orders);
  console.log("DEBUG: Current Gigs Loaded:", myGigs);
  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-black mb-8 text-gray-900">Seller Dashboard</h1>

      {myGigs.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center text-gray-500">
          You haven't created any services yet.
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {myGigs.map(gig => {
            // Find all orders that belong specifically to THIS gig
            const safeGigId = gig.id.toNumber ? gig.id.toNumber() : Number(gig.id);

            // Now filter the orders using the safe numbers!
            const gigOrders = orders.filter(o => Number(o.gigId) === safeGigId);

            const pendingCount = gigOrders.filter(o => o.status === 'PENDING').length;
            const isExpanded = expandedGigId === gig.id;

            return (
              <div key={gig.id} className={`border border-gray-200 rounded-2xl bg-white shadow-sm overflow-hidden transition-all ${isExpanded ? 'ring-2 ring-gray-900' : 'hover:shadow-md'}`}>

                {/* 1. The Service Header (Always Visible) */}
                <div
                  className="p-6 cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white"
                  onClick={() => toggleExpand(gig.id)}
                >
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-1">{gig.title}</h3>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-gray-500 font-medium">{gig.price} ETH</span>
                      <span className="text-gray-300">•</span>
                      <span className={gig.active ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                        {gig.active ? 'Active' : 'Paused'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 w-full md:w-auto">
                    {/* View Orders Badge */}
                    <div className="flex-1 md:flex-none text-right">
                      <span className={`text-sm font-bold ${pendingCount > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                        {gigOrders.length} {gigOrders.length === 1 ? 'Order' : 'Orders'}
                        {pendingCount > 0 && ` (${pendingCount} New!)`}
                      </span>
                    </div>

                    {/* On-Chain Pause Button (Stops the card from expanding when clicked) */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleTogglePause(gig.id); }}
                      className={`px-4 py-2 rounded-xl text-white text-sm font-bold transition-colors ${gig.active ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
                        }`}
                    >
                      {gig.active ? 'Pause' : 'Activate'}
                    </button>

                    {/* Dropdown Arrow Indicator */}
                    <div className="text-gray-400">
                      {isExpanded ? '▲' : '▼'}
                    </div>
                  </div>
                </div>

                {/* 2. The Orders Section (Only Visible if Expanded) */}
                {isExpanded && (
                  <div className="bg-gray-50 border-t border-gray-200 p-6">
                    <h4 className="font-bold mb-4 text-gray-700">Orders for this Service:</h4>

                    {gigOrders.length === 0 ? (
                      <p className="text-gray-500 text-sm italic">No buyers have purchased this service yet.</p>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {gigOrders.map(order => (

                          <div key={order.id} className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col md:flex-row gap-6 shadow-sm">

                            <div className="flex-1">
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-mono text-gray-400">
                                  Buyer: {order.buyerWallet.substring(0, 6)}...{order.buyerWallet.substring(38)}
                                </span>
                                <span className={`text-xs font-black px-2 py-1 rounded uppercase ${order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                    order.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                      order.status === 'AWAITING_BUYER_REVIEW' ? 'bg-purple-100 text-purple-700' :
                                        order.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                          'bg-red-100 text-red-700'
                                  }`}>
                                  {order.status}
                                </span>
                              </div>

                              <p className="text-sm font-medium text-gray-800 whitespace-pre-wrap mt-3 bg-gray-50 p-3 rounded border border-gray-100">
                                {order.requirements}
                              </p>
                            </div>

                            <div className="md:w-48 flex flex-col justify-center border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
                              <span className="text-xs text-gray-400 font-bold uppercase mb-1">Budget</span>
                              <span className="text-xl font-black text-gray-900 mb-4">{order.proposedPrice} ETH</span>

                              {order.status === 'PENDING' && (
                                <div className="flex flex-col gap-2">
                                  <button onClick={() => updateOrderStatus(order.id, 'IN_PROGRESS')} className="bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg font-bold">
                                    Start Order
                                  </button>
                                  <button onClick={() => updateOrderStatus(order.id, 'REJECTED')} className="bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 text-sm py-2 rounded-lg font-bold transition">
                                    Reject
                                  </button>
                                </div>
                              )}

                              {order.status === 'IN_PROGRESS' && (
                                <div className="space-y-3">

                                  {order.revisionNotes && (
                                    <div className="bg-orange-50 border-l-4 border-orange-500 p-3 rounded-r-md mb-4">
                                      <span className="text-xs font-black text-orange-800 uppercase block mb-1">
                                        Buyer Requested Revisions:
                                      </span>
                                      <p className="text-sm text-orange-900 whitespace-pre-wrap">
                                        {order.revisionNotes}
                                      </p>
                                    </div>
                                  )}

                                  {order.deliveryHash && (
                                    <a
                                      href={`https://gateway.pinata.cloud/ipfs/${order.deliveryHash.replace('ipfs://', '')}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="block text-sm text-blue-600 underline"
                                    >
                                      View previous upload
                                    </a>
                                  )}
                                  <div className="flex flex-col gap-2">
                                    <input
                                      type="file"
                                      onChange={(e) => setUploadFileForOrder(order.id, e.target.files?.[0] || null)}
                                      className="text-sm text-gray-600"
                                    />
                                    <button
                                      onClick={() => deliverWork(order.id)}
                                      disabled={uploadLoadingId === order.id}
                                      className="bg-green-600 hover:bg-green-700 text-white text-sm py-2 rounded-lg font-bold disabled:opacity-50"
                                    >
                                      {uploadLoadingId === order.id ? 'Uploading...' : 'Upload Work for Review'}
                                    </button>
                                  </div>
                                </div>
                              )}

                              {order.status === 'AWAITING_BUYER_REVIEW' && order.deliveryHash && (
                                <div className="space-y-3">
                                  <a
                                    href={`https://gateway.pinata.cloud/ipfs/${order.deliveryHash.replace('ipfs://', '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-sm text-blue-600 underline block"
                                  >
                                    View work for approval
                                  </a>

                                  {order.buyerWallet.toLowerCase() === account?.toLowerCase() && (
                                    <div className="flex flex-col gap-2">
                                      <button
                                        onClick={() => confirmDelivery(order.id)}
                                        disabled={confirmLoadingId === order.id}
                                        className="w-full bg-green-600 hover:bg-green-700 text-white text-sm py-2 rounded-lg font-bold disabled:opacity-50"
                                      >
                                        {confirmLoadingId === order.id ? 'Approving...' : 'Approve & Pay'}
                                      </button>

                                      {/* NEW: Request Revision Button */}
                                      <button
                                        onClick={() => requestRevision(order.id)}
                                        className="w-full bg-orange-100 hover:bg-orange-200 text-orange-800 border border-orange-300 text-sm py-2 rounded-lg font-bold transition"
                                      >
                                        Request Revision
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}

                              {order.status === 'COMPLETED' && order.deliveryHash && (
                                <a
                                  href={`https://gateway.pinata.cloud/ipfs/${order.deliveryHash.replace('ipfs://', '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-sm text-blue-600 underline block text-center py-2 bg-green-50 rounded"
                                >
                                  View completed work
                                </a>
                              )}
                            </div>

                          </div>
                        ))}
                      </div>
                    )}
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