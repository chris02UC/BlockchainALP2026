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
          <Link to="/" className={navLinkStyle('/')}>Marketplace</Link>
          <Link to="/orders" className={navLinkStyle('/orders')}>My Orders</Link>
          <Link to="/dashboard" className={navLinkStyle('/dashboard')}>My Services</Link>
          <Link to="/disputes" className={navLinkStyle('/disputes')}>Resolution Center</Link>
        </div>
      </div>
      
      <div>
        {account ? (
          <Link to="/profile" className="inline-flex items-center" aria-label="Profile">
            <img
              src={`https://avatars.dicebear.com/api/identicon/${account}.svg`}
              alt="Profile"
              className="w-10 h-10 rounded-full border border-gray-200"
            />
          </Link>
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