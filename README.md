# AtmoFi Weather Derivatives dApp

**Version 2.0.0**
**Last Updated: June 21, 2025**

## 1. Project Overview

AtmoFi is a sophisticated decentralized application (dApp) that demonstrates a complete lifecycle for peer-to-peer parametric derivatives. It allows users to create and automatically settle financial contracts based on external data, secured by the Ethereum blockchain and powered by Chainlink's oracle network.

This project is a fully functional Minimum Viable Product (MVP) deployed on the **Sepolia testnet**, showcasing advanced smart contract capabilities and a modern, reactive frontend.

## 2. The Core Concept (The Use Case)

The application is built around a simple, real-world story:

A **beverage company** in Singapore wants to hedge against the financial risk of unseasonably cool weather, which hurts their sales of cold drinks. They use AtmoFi to enter into a derivative contract with an **insurer**.

* **If the "weather" is cooler than a pre-agreed "strike temperature,"** the beverage company automatically receives a large payout from the insurer.
* **If the "weather" is warmer,** the insurer keeps their collateral and also earns the premium paid by the beverage company.

This creates a transparent, two-party financial agreement that executes automatically based on real-world data, without the need for a traditional intermediary.

## 3. Key Features

This dApp integrates a powerful stack of Web3 technologies to create a truly autonomous system:

* **Chainlink Data Feeds:** The contract uses live ETH/USD price data as a real-time, on-chain data source to determine settlement outcomes.
* **Chainlink VRF (Verifiable Random Function):** To make the outcome more dynamic, a provably random number from Chainlink VRF is used as a multiplier during settlement, adding a layer of gamified unpredictability.
* **Chainlink Automation:** The settlement process is fully autonomous. A "Custom Logic" Upkeep job monitors all active contracts and automatically triggers the settlement function for any derivative whose time period has expired. This removes the need for any user to manually execute the final step.
* **Persistent History:** The frontend uses the browser's `localStorage` to save the creation transaction hash for each derivative, providing a persistent and verifiable link to the on-chain record on Etherscan.

## 4. Development Simplifications & Demo Enhancements

To create a robust and smooth MVP for demonstration purposes, we made several pragmatic simplifications:

1.  **ETH/USD as a Proxy for Temperature:** Instead of sourcing real-world weather data (which is complex and not readily available on testnets), we use the live, reliable **Chainlink ETH/USD Data Feed**. In our dApp's narrative, a lower price represents "cooler" weather.
2.  **UI-Simulated Settlement Status:** On-chain settlement can take time due to network congestion and VRF callback latency. To ensure a smooth demo experience, the **Derivative History table simulates the final "Settled" status on the frontend**. It fetches the true on-chain state once, and if a contract's end time has passed, it immediately displays it as "Settled" in the UI, even while the true on-chain transaction is confirming. This makes the UI feel instant and predictable.
3.  **Local Transaction History:** The link between a derivative ID and its creation transaction hash is stored in the browser's `localStorage`. This is a simple and effective solution for an MVP. A full production system would use a more robust, decentralized solution like indexing contract events.

## 5. Technology Stack

### Backend (Smart Contract)
* **Blockchain:** Ethereum (Sepolia Testnet)
* **Language:** Solidity
* **Framework:** Hardhat
* **Libraries:** OpenZeppelin Ownable, Chainlink Contracts (Data Feeds, VRF, Automation)

### Frontend (User Interface)
* **Framework:** React (via Vite + TypeScript)
* **Web3 Connectivity:** `wagmi`, `viem`
* **Wallet Modal:** `RainbowKit`
* **Charting:** `Recharts`

## 6. Project Setup

### A. Backend (`atmofi`)
1.  **Install Dependencies:** `npm install`
2.  **Create `.env` file:** Copy `.env.example` if it exists, and add your `SEPOLIA_RPC_URL` and `PRIVATE_KEY`.
3.  **Compile:** `npx hardhat compile`
4.  **Deploy:**
    * Update the `vrfSubscriptionId` in `scripts/deploy.ts` with your ID from the [Chainlink VRF Dashboard](https://vrf.chain.link/sepolia).
    * Run `npx hardhat run scripts/deploy.ts --network sepolia`.
5.  **Post-Deploy:** Add the new contract address as a "consumer" on your VRF subscription page. Register a new "Custom Logic" upkeep on the [Chainlink Automation Dashboard](https://automation.chain.link/sepolia), pointing it to your new contract address.

### B. Frontend (`atmofi-frontend`)
1.  **Install Dependencies:** `npm install`
2.  **Configure Contract:** Update `src/contract.ts` with the new contract address from the deployment step. Ensure the ABI in `src/abis` is up-to-date.
3.  **Run Locally:** `npm run dev`

## 7. Example User Flow

1.  **Connect Wallet:** The user (acting as the "Insurer") connects their MetaMask wallet on the Sepolia testnet.
2.  **Observe Live Data:** The UI displays the live ETH/USD price, which is polling every 5 seconds.
3.  **Create Derivative:** The Insurer fills out the form:
    * Specifies the `Beverage Co. Address`.
    * Sets a `Premium` (e.g., 0.01 ETH), which they will pay.
    * Sets a `Payout` (e.g., 0.1 ETH), which is their collateral.
    * Sets a `Strike Price`.
    * The UI shows a live preview of who would win under current conditions.
    * They click "Create Derivative" and approve the transaction, paying the premium.
4.  **Fund Derivative:** The UI automatically switches to the "Funding" view. The Insurer clicks "Deposit Collateral" and approves the transaction to send the payout amount to the contract. The History Table now shows this derivative's status as "Active".
5.  **Wait for Settlement:** The contract now waits for its duration to expire (e.g., 2 minutes for testing).
6.  **Autonomous Settlement:** Once the end time passes, the user does nothing. The off-chain Chainlink Automation network detects the expired contract, calls our `settleContract` function, which in turn requests a random number from Chainlink VRF.
7.  **View Outcome:** After a few moments, the VRF callback finalizes the settlement on-chain. The History Table on the frontend, which polls for data every 5 seconds, automatically updates to show the final "Settled" status and the outcome.