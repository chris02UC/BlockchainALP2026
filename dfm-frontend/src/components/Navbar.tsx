import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWeb3 } from '../context/useWeb3';

export default function Navbar(): JSX.Element {
  const { account, connectWallet } = useWeb3();
  const location = useLocation();

  const navLinkStyle = (path: string) => 
    `px-4 py-2 rounded-xl transition font-medium ${
      location.pathname === path ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-100'
    }`;

  return (
    <nav className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
      <div className="flex items-center gap-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-blue-600">DFM</h1>
        <div className="hidden md:flex gap-2">
          <Link to="/" className={navLinkStyle('/')}>Marketplace </Link>
          <span className="text-gray-400">|</span>
          <Link to="/orders" className={navLinkStyle('/orders')}> My Orders </Link>
          <span className="text-gray-400">|</span>
          <Link to="/disputes" className={navLinkStyle('/disputes')}> Resolution Center</Link>
        </div>
      </div>
      
      <div>
        {account ? (
          <div className="bg-green-50 text-green-700 px-5 py-2.5 rounded-xl border border-green-200 font-medium">
            {account.substring(0, 6)}...{account.substring(38)}
          </div>
        ) : (
          <button 
            onClick={connectWallet}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition shadow-sm"
          >
            Connect Wallet
          </button>
        )}
      </div>
    </nav>
  );
}