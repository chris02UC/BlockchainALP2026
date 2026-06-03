import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Web3Provider } from './context/useWeb3';

import Navbar from './components/Navbar';
import Marketplace from './pages/Marketplace';
import Orders from './/pages/Orders';
import Disputes from './pages/Disputes';

export default function App(): JSX.Element {
  return (
    <Web3Provider>
      <Router>
        <div className="bg-gray-50 min-h-screen min-w-screen overflow-x-hidden font-sans text-gray-800">
          <Navbar />
          <main className="pt-8 pb-20">
            <Routes>
              <Route path="/" element={<Marketplace />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/disputes" element={<Disputes />} />
            </Routes>
          </main>
        </div>
      </Router>
    </Web3Provider>
  );
}