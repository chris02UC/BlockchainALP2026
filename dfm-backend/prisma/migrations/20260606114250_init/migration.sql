-- CreateTable
CREATE TABLE "User" (
    "walletAddress" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "bio" TEXT,
    "profilePictureUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("walletAddress")
);

-- CreateTable
CREATE TABLE "ServiceRequest" (
    "id" SERIAL NOT NULL,
    "gigId" INTEGER NOT NULL,
    "buyerWallet" TEXT NOT NULL,
    "sellerWallet" TEXT NOT NULL,
    "requirements" TEXT NOT NULL,
    "proposedPrice" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedGig" (
    "id" SERIAL NOT NULL,
    "wallet" TEXT NOT NULL,
    "gigId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedGig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "SavedGig_wallet_gigId_key" ON "SavedGig"("wallet", "gigId");

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_buyerWallet_fkey" FOREIGN KEY ("buyerWallet") REFERENCES "User"("walletAddress") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_sellerWallet_fkey" FOREIGN KEY ("sellerWallet") REFERENCES "User"("walletAddress") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedGig" ADD CONSTRAINT "SavedGig_wallet_fkey" FOREIGN KEY ("wallet") REFERENCES "User"("walletAddress") ON DELETE CASCADE ON UPDATE CASCADE;
