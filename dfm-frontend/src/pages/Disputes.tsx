import React, { useState } from 'react';
import { useWeb3 } from '../context/useWeb3';

interface DisputeFormState { orderId: string; respondent: string; reason: string; }
interface EvidenceFormState { disputeId: string; hash: string; }

export default function Disputes(): JSX.Element {
  const { contracts } = useWeb3();
  const [disputeForm, setDisputeForm] = useState<DisputeFormState>({ orderId: '', respondent: '', reason: '' });
  const [evidenceForm, setEvidenceForm] = useState<EvidenceFormState>({ disputeId: '', hash: '' });

  const openDispute = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!contracts.disputes) return;
    try {
      const tx = await contracts.disputes.openDispute(disputeForm.orderId, disputeForm.respondent, disputeForm.reason);
      await tx.wait();
      alert("Dispute opened successfully. An admin will review the case.");
      setDisputeForm({ orderId: '', respondent: '', reason: '' });
    } catch (error) {
      console.error(error);
      alert("Failed to open dispute.");
    }
  };

  const submitEvidence = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!contracts.disputes) return;
    try {
      const tx = await contracts.disputes.submitEvidence(evidenceForm.disputeId, evidenceForm.hash);
      await tx.wait();
      alert("Evidence submitted to the blockchain.");
      setEvidenceForm({ disputeId: '', hash: '' });
    } catch (error) {
      console.error(error);
      alert("Failed to submit evidence.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-10">
      
      <div className="bg-white p-10 rounded-3xl border border-gray-200 shadow-sm">
        <div className="mb-8">
          <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3 inline-block">Issue Resolution</span>
          <h2 className="text-3xl font-bold">Open a Dispute</h2>
          <p className="text-gray-500 mt-2">Freeze escrow funds while an admin reviews your case.</p>
        </div>
        
        <form onSubmit={openDispute} className="flex flex-col gap-5">
          <input 
            className="p-4 bg-gray-50 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400 transition" 
            placeholder="Order ID" 
            value={disputeForm.orderId}
            onChange={e => setDisputeForm({...disputeForm, orderId: e.target.value})} 
            required 
          />
          <input 
            className="p-4 bg-gray-50 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400 transition" 
            placeholder="Respondent Address (The other party)" 
            value={disputeForm.respondent}
            onChange={e => setDisputeForm({...disputeForm, respondent: e.target.value})} 
            required 
          />
          <textarea 
            className="p-4 bg-gray-50 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400 transition resize-none" 
            rows={4} 
            placeholder="Detailed reason for dispute..." 
            value={disputeForm.reason}
            onChange={e => setDisputeForm({...disputeForm, reason: e.target.value})} 
            required 
          />
          <button type="submit" className="bg-red-500 text-white px-6 py-4 rounded-2xl font-bold mt-2 hover:bg-red-600 transition shadow-sm">
            Submit Dispute
          </button>
        </form>
      </div>

      <div className="bg-gray-900 p-10 rounded-3xl shadow-sm text-white">
        <div className="mb-8">
          <span className="bg-gray-800 text-gray-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3 inline-block">Data Upload</span>
          <h2 className="text-3xl font-bold">Submit Evidence</h2>
          <p className="text-gray-400 mt-2">Provide IPFS hashes containing chat logs or deliverables.</p>
        </div>
        
        <form onSubmit={submitEvidence} className="flex flex-col gap-5">
          <input 
            className="p-4 bg-gray-800 rounded-2xl border border-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-600 text-white placeholder-gray-500 transition" 
            placeholder="Dispute ID" 
            value={evidenceForm.disputeId}
            onChange={e => setEvidenceForm({...evidenceForm, disputeId: e.target.value})} 
            required 
          />
          <input 
            className="p-4 bg-gray-800 rounded-2xl border border-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-600 text-white placeholder-gray-500 transition" 
            placeholder="IPFS Hash (e.g. Qm...)" 
            value={evidenceForm.hash}
            onChange={e => setEvidenceForm({...evidenceForm, hash: e.target.value})} 
            required 
          />
          <button type="submit" className="bg-white text-gray-900 px-6 py-4 rounded-2xl font-bold mt-2 hover:bg-gray-200 transition">
            Attach Evidence
          </button>
        </form>
      </div>
      
    </div>
  );
}