# AtmoFi Weather Derivatives dApp

**Version 1.0.0**
**Last Updated: June 20, 2025**

## 1. Project Overview

AtmoFi is a decentralized application (dApp) that allows users to create and participate in peer-to-peer parametric derivatives. Instead of traditional insurance, which can be slow and subjective, AtmoFi uses smart contracts and live data from Chainlink oracles to create agreements that settle automatically, instantly, and transparently based on predefined data points.

While the concept is designed for real-world weather data, this MVP (Minimum Viable Product) uses the live **ETH/USD price feed** as a stand-in for temperature, demonstrating the full end-to-end functionality on the Sepolia testnet.

## 2. The Problem We Solve (The Use Case)

Imagine a **beverage company in Singapore**. Their sales are directly tied to the weather—hot days mean high sales, but an unseasonably cool week can significantly hurt their revenue.

AtmoFi allows this beverage company to hedge against that risk. They can enter a financial agreement where they receive an automatic payout if the "temperature" (in our case, the ETH/USD price) drops below a certain level during a specific period.

This creates a simple, two-party contract:
* **The Hedger (The Beverage Company):** Pays a small premium to protect against a financial loss from "cool" weather.
* **The Counterparty (The Insurer):** Provides the collateral for the payout, betting that the weather will be normal or "hot," allowing them to collect the premium as profit.

## 3. Technology Stack

The AtmoFi project is a full-stack dApp built with modern, industry-standard tools.

### Backend (On-Chain)
* **Blockchain:** Ethereum (Sepolia Testnet)
* **Smart Contract Language:** Solidity
* **Development Environment:** Hardhat (for compiling, testing, and deploying)
* **Oracle Service:** Chainlink Data Feeds (for live price data)

### Frontend (Off-Chain)
* **Framework:** React (using Vite for a fast development experience)
* **Language:** TypeScript
* **Web3 Connectivity:**
    * `wagmi`: A powerful library of React Hooks for all blockchain interactions.
    * `viem`: A lightweight and efficient Ethereum interface used by wagmi.
    * `RainbowKit`: Provides a beautiful and user-friendly "Connect Wallet" button and modal.
* **Charting Library:** `Recharts` for visualizing historical data.

## 4. Project Setup

To run this project, you will need to set up both the backend (smart contract) and the frontend.

### A. Backend Setup (Hardhat)

This sets up the environment for compiling and deploying the smart contract.

1.  **Prerequisites:** Ensure you have Node.js and npm installed.
2.  **Clone & Install:**
    ```bash
    # This assumes you have the project in a directory called 'atmofi-evm'
    cd atmofi-evm
    npm install
    ```
3.  **Environment Variables:** Create a `.env` file in the `atmofi-evm` root directory and add your credentials. This is needed for deployment.
    ```env
    SEPOLIA_RPC_URL="YOUR_ALCHEMY_HTTPS_URL"
    PRIVATE_KEY="YOUR_METAMASK_PRIVATE_KEY"
    ```
4.  **Compile & Deploy:**
    ```bash
    # Compile the contract
    npx hardhat compile

    # Deploy to Sepolia testnet
    npx hardhat run scripts/deploy.ts --network sepolia
    ```
    After deployment, copy the new contract address.

### B. Frontend Setup (React App)

This sets up the user interface.

1.  **Prerequisites:** This guide assumes you have started the frontend from the official Moralis boilerplate (`web3-dapp-boilerplate`) and named the project `atmofi-frontend`.
2.  **Install Dependencies:**
    ```bash
    cd atmofi-frontend
    npm install
    ```
3.  **Contract Configuration:**
    * Copy the ABI from `atmofi-evm/artifacts/contracts/Atmofi.sol/Atmofi.json` into `atmofi-frontend/src/abis/Atmofi.json`.
    * Update `atmofi-frontend/src/contract.ts` with the **new contract address** from your deployment step.
4.  **Run the Frontend:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:5173` (or a similar port).

## 5. Example User Flow: A Live Walkthrough

Here’s how a user would interact with the dApp. For this example, we'll assume the live ETH/USD price is approximately **$2,550**.

#### Step 1: The Insurer Creates the Contract

An insurer (the user who has connected their wallet) wants to earn a premium by betting that the price will stay high.

1.  **Connect Wallet:** The insurer connects their MetaMask wallet to the dApp. The wallet is on the **Sepolia Testnet**.
2.  **Observe Live Data:** They see the live price is **$2,550**.
3.  **Fill Out the Form:**
    * **Beverage Co. Address:** The insurer enters the address of the counterparty they are making the deal with (e.g., `0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5`).
    * **Premium:** They set the premium they want to earn, e.g., `0.01` ETH.
    * **Payout:** They set the collateral they are willing to risk, e.g., `0.1` ETH.
    * **Strike Price:** They bet the price will stay high, so they agree to a strike price of `2500`.
4.  **Review the Outcome Preview:** The UI shows: "🔴 Current conditions favor the **Insurer**. They would profit 0.01 ETH," because the live price ($2,550) is *above* the strike price ($2,500).
5.  **Create Derivative:** The insurer clicks the button. MetaMask pops up, and they confirm the transaction, which sends the **0.01 ETH premium** to the new smart contract.

#### Step 2: The Insurer Funds the Contract

After the transaction confirms, the UI automatically switches to the "Funding View."

1.  **See Contract Status:** The UI shows "Status: **Pending Funding**".
2.  **Deposit Collateral:** The insurer clicks the "Deposit Collateral" button. MetaMask pops up, and they confirm, sending the **0.1 ETH payout amount** to the contract.

The contract is now fully funded and active. The total balance held by the smart contract is 0.11 ETH.

#### Step 3: Settlement

The contract's duration is set to a short period for testing. After this time passes, the "Settle Contract" button becomes enabled.

1.  **Anyone can initiate settlement.** The insurer (or anyone) returns to the dApp and clicks "Settle Contract." MetaMask pops up to confirm sending the transaction (paying only a small gas fee).
2.  **The Contract Acts:**
    * The `settleContract` function is called.
    * It immediately asks the Chainlink oracle for the current ETH/USD price. Let's say the price has dropped to **$2,480**.
    * The contract compares: **Is $2,480 (settled price) < $2,500 (strike price)?** Yes, it is.
    * The condition is met, so the **Beverage Company wins**.
3.  **The Payout:** The smart contract automatically transfers its entire balance (0.11 ETH) to the winner's address (`0x9522...`).

#### Step 4: View the Outcome

The UI automatically updates to the "Settled View."

1.  **Final Outcome:** The UI shows the results:
    * Settled "Temperature": **$2480**
    * Winner: **The Beverage Company**
2.  **History Chart:** The new outcome appears on the history chart at the bottom of the page, showing a visual record of the settled derivative.

This flow demonstrates a complete, transparent, and automated financial agreement, all handled by on-chain logic and real-world data.