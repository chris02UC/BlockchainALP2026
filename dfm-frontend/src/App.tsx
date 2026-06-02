import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, formatEther, parseEther } from 'ethers';
import { MARKETPLACE_ADDRESS, MARKETPLACE_ABI } from './config';

// Define the Gig type based on your Solidity struct
interface Gig {
  id: bigint;
  seller: string;
  title: string;
  description: string;
  category: string;
  price: bigint;
  active: boolean;
  createdAt: bigint;
}

declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function App() {
  const [account, setAccount] = useState<string | null>(null);
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [marketplaceContract, setMarketplaceContract] = useState<Contract | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');

  // Connect to MetaMask
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const web3Provider = new BrowserProvider(window.ethereum);
        const accounts = await web3Provider.send("eth_requestAccounts", []);
        const signer = await web3Provider.getSigner();
        
        const contract = new Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);
        
        setProvider(web3Provider);
        setAccount(accounts[0]);
        setMarketplaceContract(contract);
      } catch (error) {
        console.error("Connection failed", error);
      }
    } else {
      alert("Please install a Web3 wallet like MetaMask!");
    }
  };

  // Fetch all active gigs
  const fetchGigs = async () => {
    if (!marketplaceContract) return;

    try {
      const gigIds: bigint[] = await marketplaceContract.getAllGigs();
      const gigPromises = gigIds.map(id => marketplaceContract.getGig(id));
      const fetchedGigs = await Promise.all(gigPromises);
      
      setGigs(fetchedGigs.filter(g => g.active));
    } catch (error) {
      console.error("Error fetching gigs:", error);
    }
  };

  useEffect(() => {
    if (marketplaceContract) {
      fetchGigs();
    }
  }, [marketplaceContract]);

  // Create a new gig
  const handleCreateGig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!marketplaceContract) return;

    try {
      const priceInWei = parseEther(price); 
      const tx = await marketplaceContract.createGig(title, description, category, priceInWei);
      await tx.wait(); 
      
      alert("Gig created successfully on dfm!");
      fetchGigs(); 
      
      setTitle('');
      setDescription('');
      setCategory('');
      setPrice('');
    } catch (error) {
      console.error("Error creating gig:", error);
      alert("Failed to create gig");
    }
  };

  // Place an order for a gig
  const handleBuy = async (gigId: bigint, gigPrice: bigint) => {
    if (!marketplaceContract) return;
    
    try {
      const tx = await marketplaceContract.placeOrder(gigId, { value: gigPrice });
      await tx.wait();
      alert("Order placed successfully on dfm!");
    } catch (error) {
      console.error("Error placing order:", error);
      alert("Failed to place order.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span className="text-3xl font-extrabold text-indigo-600 tracking-tighter">dfm.</span>
            </div>
            <div>
              {!account ? (
                <button 
                  onClick={connectWallet} 
                  className="bg-indigo-600 text-white px-5 py-2 rounded-full font-medium hover:bg-indigo-700 transition shadow-sm"
                >
                  Connect Wallet
                </button>
              ) : (
                <div className="flex items-center space-x-3">
                  <div className="text-sm font-medium bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full border border-indigo-100">
                    {account.slice(0, 6)}...{account.slice(-4)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {!account ? (
          <div className="text-center py-20">
            <h1 className="text-5xl font-extrabold text-gray-900 mb-6 tracking-tight">
              Welcome to <span className="text-indigo-600">dfm</span>
            </h1>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
              The decentralized freelance marketplace. Connect your wallet to start buying and selling services securely on the blockchain.
            </p>
            <button 
              onClick={connectWallet} 
              className="bg-indigo-600 text-white px-8 py-3 rounded-full text-lg font-semibold hover:bg-indigo-700 transition shadow-lg"
            >
              Get Started
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            
            {/* Sidebar: Create Gig Form */}
            <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-24">
                <h2 className="text-xl font-bold mb-6 text-gray-800">Post a Service</h2>
                <form onSubmit={handleCreateGig} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Title</label>
                    <input required value={title} onChange={e => setTitle(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition" placeholder="I will..." />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                    <textarea required rows={3} value={description} onChange={e => setDescription(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition" placeholder="Describe your service in detail..." />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                    <input required value={category} onChange={e => setCategory(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition" placeholder="e.g. Design, Development" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Price (ETH)</label>
                    <div className="relative">
                      <input required type="number" step="0.0001" value={price} onChange={e => setPrice(e.target.value)} className="w-full border border-gray-300 rounded-lg pl-4 pr-12 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition" placeholder="0.05" />
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                        <span className="text-gray-500 text-sm font-medium">ETH</span>
                      </div>
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition font-bold shadow-md">
                    Publish on dfm
                  </button>
                </form>
              </div>
            </div>

            {/* Main Content: Gig List */}
            <div className="lg:col-span-2">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Explore Services</h2>
                <span className="text-sm text-gray-500 font-medium">{gigs.length} active gigs</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {gigs.length === 0 ? (
                  <div className="col-span-full bg-white p-10 rounded-2xl border border-dashed border-gray-300 text-center">
                    <p className="text-gray-500 text-lg">No services found on dfm yet. Be the first to post!</p>
                  </div>
                ) : (
                  gigs.map((gig, index) => (
                    <div key={index} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md uppercase tracking-wide">
                            {gig.category}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mt-2 leading-tight">{gig.title}</h3>
                        <p className="text-gray-600 mt-3 text-sm line-clamp-3 leading-relaxed">{gig.description}</p>
                      </div>
                      
                      <div className="mt-6 pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex-shrink-0"></div>
                            <p className="text-xs text-gray-500 font-medium truncate w-24">
                              {gig.seller.slice(0, 6)}...{gig.seller.slice(-4)}
                            </p>
                          </div>
                          <span className="font-extrabold text-lg text-gray-900">{formatEther(gig.price)} ETH</span>
                        </div>
                        
                        <button 
                          onClick={() => handleBuy(gig.id, gig.price)}
                          className="w-full bg-gray-900 text-white px-4 py-2.5 rounded-lg hover:bg-black transition font-semibold"
                        >
                          Order Now
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}