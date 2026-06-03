# How to run and test

## terminal 1
npx hardhat compile
npx hardhat node => creates 20 test accounts

## terminal 2
cd dfm-frontend
npm run dev / pnpm dev

## terminal 3
npx hardhat run scripts/run.ts --network localhost => there will be 3 accounts shown, change the addresses in config.ts to the three accounts

## browser
open http://localhost:5173/
open Rabby Wallet extension
top left > add new account > import private key > paste one of the private keys from terminal 1
top right > settings > add custom network > fill this in:
    chain id = 31337
    network name = up to you
    RPC URL = http://127.0.0.1:8545
    currency symbol = ETH
bottom right > custom network > select the custom network you just made
click on connect wallet in website page
feel free to test the rest

## "nonce too high" error
open Rabby Wallet extension
top right > clear pending locally > tick "also reset my local nonce data" > confirm