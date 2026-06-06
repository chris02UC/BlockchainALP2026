import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
// Using the Prisma 7.8.0 configuration
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true, parameterLimit: 1000000 }));

// ==========================================
// 1. USER PROFILE APIs
// ==========================================

// Get a user's profile
app.get('/api/users/:wallet', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { walletAddress: req.params.wallet.toLowerCase() }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Create or update a user profile
app.post('/api/users', async (req, res) => {
  try {
    const { wallet_address, username, email, bio, profile_picture_url } = req.body;
    const user = await prisma.user.upsert({
      where: { walletAddress: wallet_address.toLowerCase() },
      update: { username, email, bio, profilePictureUrl: profile_picture_url },
      create: { 
        walletAddress: wallet_address.toLowerCase(), 
        username, 
        email,
        bio, 
        profilePictureUrl: profile_picture_url 
      }
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Update user profile (PATCH)
app.patch('/api/users/:wallet', async (req, res) => {
  try {
    const { username, email, bio, profilePictureUrl } = req.body;
    const user = await prisma.user.upsert({
      where: { walletAddress: req.params.wallet.toLowerCase() },
      update: {
        ...(username && { username }),
        ...(email && { email }),
        ...(bio !== undefined && { bio }),
        ...(profilePictureUrl && { profilePictureUrl })
      },
      create: {
        walletAddress: req.params.wallet.toLowerCase(),
        username: username || `User_${req.params.wallet.slice(2, 6)}`,
        email,
        bio,
        profilePictureUrl
      }
    });
    res.json(user);
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ==========================================
// 2. SERVICE REQUEST APIs
// ==========================================

// Buyer sends a custom request to a seller
app.post('/api/requests', async (req, res) => {
  try {
    const { gigId, buyerWallet, sellerWallet, requirements, proposedPrice } = req.body;
    
    const buyerWalletLower = buyerWallet.toLowerCase();
    const sellerWalletLower = sellerWallet.toLowerCase();
    
    // CRITICAL FIX: Ensure buyer and seller User records exist before creating the request
    // This prevents foreign key constraint errors
    await prisma.user.upsert({
      where: { walletAddress: buyerWalletLower },
      update: {},
      create: { 
        walletAddress: buyerWalletLower, 
        username: "User_" + buyerWalletLower.slice(2, 6)
      }
    });
    
    await prisma.user.upsert({
      where: { walletAddress: sellerWalletLower },
      update: {},
      create: { 
        walletAddress: sellerWalletLower, 
        username: "User_" + sellerWalletLower.slice(2, 6)
      }
    });
    
    // Now safely create the service request
    const newRequest = await prisma.serviceRequest.create({
      data: {
        gigId: Number(gigId),
        buyerWallet: buyerWalletLower,
        sellerWallet: sellerWalletLower,
        requirements,
        proposedPrice
      }
    });
    res.status(201).json(newRequest);
  } catch (error) {
    console.error("Backend Error:", error);
    res.status(500).json({ error: "Failed to save request" });
  }
});

// Seller fetches all requests sent to them
app.get('/api/requests/seller/:wallet', async (req, res) => {
  try {
    const requests = await prisma.serviceRequest.findMany({
      where: { sellerWallet: req.params.wallet.toLowerCase() },
      orderBy: { createdAt: 'desc' },
      include: { 
        buyer: true,
        seller: true
      }
    });
    res.json(requests);
  } catch (err) {
    console.error("Error fetching requests:", err);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// Buyer fetches all orders they've placed
app.get('/api/requests/buyer/:wallet', async (req, res) => {
  try {
    const requests = await prisma.serviceRequest.findMany({
      where: { buyerWallet: req.params.wallet.toLowerCase() },
      orderBy: { createdAt: 'desc' },
      include: { 
        buyer: true,
        seller: true
      }
    });
    res.json(requests);
  } catch (err) {
    console.error("Error fetching buyer requests:", err);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// Seller accepts or rejects a request or uploads delivery data
app.patch('/api/requests/:id', async (req, res) => {
  try {
    const { status, deliveryHash } = req.body;
    const updateData: Record<string, any> = {};
    if (status) updateData.status = status;
    if (deliveryHash) updateData.deliveryHash = deliveryHash;

    const request = await prisma.serviceRequest.update({
      where: { id: parseInt(req.params.id) },
      data: updateData
    });
    res.json(request);
  } catch (err) {
    console.error('Error updating request:', err);
    res.status(500).json({ error: 'Failed to update request' });
  }
});

// ==========================================
// 3. SAVED GIGS APIs
// ==========================================

// Toggle heart icon (save/unsave)
app.post('/api/saved-gigs/toggle', async (req, res) => {
  try {
    const { wallet, gigId } = req.body;
    
    // Safety check: Make sure frontend actually sent the data
    if (!wallet || gigId === undefined) {
      return res.status(400).json({ error: 'Missing wallet or gigId' });
    }

    const userWallet = wallet.toLowerCase();

    // 🌟 THE FIX: Ensure the user exists in the DB before saving the gig!
    // If they don't exist, this creates a blank profile for them instantly.
    await prisma.user.upsert({
      where: { walletAddress: userWallet },
      update: {}, // Do nothing if they already exist
      create: { 
        walletAddress: userWallet, 
        username: "User_" + userWallet.slice(2, 6) // Gives them a default name like "User_f39f"
      }
    });

    const existing = await prisma.savedGig.findUnique({
      where: { wallet_gigId: { wallet: userWallet, gigId } }
    });

    if (existing) {
      await prisma.savedGig.delete({ where: { id: existing.id } });
      return res.json({ saved: false });
    } else {
      await prisma.savedGig.create({
        data: { wallet: userWallet, gigId }
      });
      return res.json({ saved: true });
    }
  } catch (err) {
    console.error("TOGGLE ERROR:", err); // This prints the exact error to your terminal!
    res.status(500).json({ error: 'Database error' });
  }
});

// Get an array of saved gig IDs to display hearts on the frontend
app.get('/api/saved-gigs/:wallet', async (req, res) => {
  try {
    const saved = await prisma.savedGig.findMany({
      where: { wallet: req.params.wallet.toLowerCase() },
      select: { gigId: true }
    });
    // Maps the database objects into a simple array of numbers like [1, 4, 7]
    res.json(saved.map((s: { gigId: number }) => s.gigId));
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// ==========================================
// START THE SERVER
// ==========================================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 API Backend running at http://localhost:${PORT}`);
});