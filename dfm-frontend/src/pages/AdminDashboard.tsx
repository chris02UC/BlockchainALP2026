import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/useWeb3';
import { ethers } from 'ethers';

export default function AdminDashboard() {
  const { account, contracts } = useWeb3();
  const [disputesList, setDisputesList] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Status and Resolution Enums mapped to text
  const STATUS_MAP = ['OPEN', 'EVIDENCE SUBMITTED', 'RESOLVED', 'REJECTED'];
  const RESOLUTION_MAP = ['REFUND BUYER', 'PAY SELLER', 'PARTIAL SPLIT'];

  useEffect(() => {
    loadAdminData();
  }, [account, contracts]);

  const loadAdminData = async () => {
    if (!account || !contracts.disputes) return;
    setIsLoading(true);

    try {
      // 1. Check if connected wallet is the Admin
      const adminAddress = await contracts.disputes.admin();
      if (adminAddress.toLowerCase() !== account.toLowerCase()) {
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }
      setIsAdmin(true);

      // 2. Fetch all disputes (Loop until we hit an empty ID)
      const fetched = [];
      let currentId = 1;
      
      while (true) {
        try {
          const dispute = await contracts.disputes.getDispute(currentId);
          
          if (dispute.initiator === ethers.constants.AddressZero) break; 
          
          // Fetch evidence for this specific dispute
          const evidenceList = await contracts.disputes.getDisputeEvidence(currentId);
          
          fetched.push({
            id: Number(dispute.id),
            orderId: Number(dispute.orderId),
            initiator: dispute.initiator,
            respondent: dispute.respondent,
            reason: dispute.reason,
            status: Number(dispute.status),
            resolution: Number(dispute.resolution),
            evidence: evidenceList
          });
          currentId++;
        } catch (err) {
          // If the mapping reverts or goes out of bounds, we've found all disputes
          break; 
        }
      }
      
      // Reverse so the newest disputes show at the top
      setDisputesList(fetched.reverse());
    } catch (err) {
      console.error("Failed to load admin data", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolve = async (disputeId: number, resolutionType: number) => {
    if (!contracts.disputes) return;
    setActionLoadingId(disputeId);
    try {
      const tx = await contracts.disputes.resolveDispute(disputeId, resolutionType);
      await tx.wait();
      alert(`Dispute #${disputeId} successfully resolved!`);
      await loadAdminData(); // Refresh UI
    } catch (err) {
      console.error(err);
      alert("Failed to resolve dispute. Check console.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (disputeId: number) => {
    if (!contracts.disputes) return;
    setActionLoadingId(disputeId);
    try {
      const tx = await contracts.disputes.rejectDispute(disputeId);
      await tx.wait();
      alert(`Dispute #${disputeId} rejected.`);
      await loadAdminData(); // Refresh UI
    } catch (err) {
      console.error(err);
      alert("Failed to reject dispute. Check console.");
    } finally {
      setActionLoadingId(null);
    }
  };

  if (isLoading) return <div className="text-center mt-20 text-gray-500 font-bold">Checking Admin Credentials...</div>;

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto mt-20 p-10 bg-red-50 border-2 border-red-200 rounded-3xl text-center">
        <h1 className="text-3xl font-black text-red-700 mb-4">Access Denied</h1>
        <p className="text-red-900">You are not authorized to view the Admin Dashboard. Please switch to the contract deployer's wallet.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex justify-between items-end mb-8 border-b pb-4">
        <div>
          <span className="bg-black text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 inline-block">Control Center</span>
          <h1 className="text-4xl font-black text-gray-900">Admin Dashboard</h1>
        </div>
        <div className="text-gray-500 text-sm font-mono bg-gray-100 px-4 py-2 rounded-lg">
          Admin: {account?.substring(0, 6)}...{account?.substring(38)}
        </div>
      </div>

      {disputesList.length === 0 ? (
        <div className="bg-gray-50 p-10 rounded-2xl border border-gray-200 text-center text-gray-500">
          No disputes have been opened yet. Everything is peaceful! 🕊️
        </div>
      ) : (
        <div className="space-y-6">
          {disputesList.map((dispute) => (
            <div key={dispute.id} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-8">
              
              {/* Left Side: Details & Evidence */}
              <div className="flex-1">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold">Dispute #{dispute.id} <span className="text-gray-400 text-base font-normal">(Order #{dispute.orderId})</span></h3>
                  
                  {/* Status Badge */}
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide ${
                    dispute.status === 0 ? 'bg-yellow-100 text-yellow-700' :
                    dispute.status === 1 ? 'bg-blue-100 text-blue-700' :
                    dispute.status === 2 ? 'bg-green-100 text-green-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {STATUS_MAP[dispute.status]}
                  </span>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-4 text-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <span className="text-gray-400 font-bold uppercase text-xs block">Initiator (Complainer)</span>
                      <span className="font-mono text-gray-800">{dispute.initiator.substring(0, 10)}...</span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-bold uppercase text-xs block">Respondent (Accused)</span>
                      <span className="font-mono text-gray-800">{dispute.respondent.substring(0, 10)}...</span>
                    </div>
                  </div>
                  <span className="text-gray-400 font-bold uppercase text-xs block mb-1">Reason for Dispute</span>
                  <p className="text-gray-800 font-medium whitespace-pre-wrap">{dispute.reason}</p>
                </div>

                {/* Evidence Section */}
                <div className="mb-4">
                  <span className="text-gray-400 font-bold uppercase text-xs block mb-2">Submitted Evidence ({dispute.evidence.length})</span>
                  {dispute.evidence.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No evidence uploaded yet.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {dispute.evidence.map((ev: any, index: number) => (
                        <a 
                          key={index}
                          href={`https://gateway.pinata.cloud/ipfs/${ev.evidenceHash.replace('ipfs://', '')}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100 hover:bg-blue-100 transition inline-block w-fit"
                        >
                          📎 View Evidence #{index + 1} (from {ev.submitter.substring(0,6)}...)
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side: Admin Actions */}
              <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-gray-100 pt-6 md:pt-0 md:pl-6 flex flex-col justify-center gap-3">
                
                {(dispute.status === 0 || dispute.status === 1) ? (
                  <>
                    <span className="text-xs text-gray-400 font-bold uppercase text-center block mb-2">Admin Actions</span>
                    <button 
                      onClick={() => handleResolve(dispute.id, 0)} // 0 = REFUND_BUYER
                      disabled={actionLoadingId === dispute.id}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl shadow-sm disabled:opacity-50 transition"
                    >
                      {actionLoadingId === dispute.id ? 'Processing...' : 'Refund Buyer'}
                    </button>
                    <button 
                      onClick={() => handleResolve(dispute.id, 1)} // 1 = PAY_SELLER
                      disabled={actionLoadingId === dispute.id}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-sm disabled:opacity-50 transition"
                    >
                      Pay Seller
                    </button>
                    <button 
                      onClick={() => handleResolve(dispute.id, 2)} // 2 = PARTIAL_SPLIT
                      disabled={actionLoadingId === dispute.id}
                      className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 rounded-xl shadow-sm disabled:opacity-50 transition"
                    >
                      Split 50/50
                    </button>
                    <div className="my-2 border-b border-gray-200"></div>
                    <button 
                      onClick={() => handleReject(dispute.id)} 
                      disabled={actionLoadingId === dispute.id}
                      className="w-full bg-red-100 hover:bg-red-200 text-red-700 border border-red-200 font-bold py-3 rounded-xl transition"
                    >
                      Reject Dispute
                    </button>
                  </>
                ) : (
                  <div className="text-center p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <span className="block text-gray-500 font-bold text-sm mb-1">Final Outcome</span>
                    <span className={`font-black text-lg ${dispute.status === 3 ? 'text-red-600' : 'text-green-600'}`}>
                      {dispute.status === 3 ? 'REJECTED' : RESOLUTION_MAP[dispute.resolution]}
                    </span>
                  </div>
                )}
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}