// src/components/HistoryTable.tsx

import { formatEther } from 'viem';
import { useState, useEffect } from 'react';

// This type must match the 'Derivative' struct in your Solidity contract
type Derivative = {
  insurer: `0x${string}`;
  beverageCompany: `0x${string}`;
  premiumAmount: bigint;
  payoutAmount: bigint;
  strikeTemperature: bigint;
  startTimestamp: bigint;
  endTimestamp: bigint;
  state: number;
  insurerFunded: boolean;
  beverageCompanyFunded: boolean;
  settledTemperature: bigint;
};

// Define the types for the props we'll pass to this component
type TxHistory = {
  [derivativeId: string]: `0x${string}`;
};
interface HistoryTableProps {
  history: readonly Derivative[];
  txHistory: TxHistory;
  isLoading: boolean;
  error: Error | null;
}

export function HistoryTable({ history, txHistory, isLoading, error }: HistoryTableProps) {
  // Local state to manage the "faked" display data
  const [displayHistory, setDisplayHistory] = useState<readonly Derivative[]>([]);

  useEffect(() => {
    if (history) {
      const nowInSeconds = BigInt(Math.floor(Date.now() / 1000));
      
      const modifiedHistory = history.map(item => {
        // Rule 1: If it's Active (state 1) and its time is up, show it as Settled (state 2) immediately.
        if (item.state === 1 && item.endTimestamp < nowInSeconds) {
          return { ...item, state: 2 }; // Return a modified copy
        }
        return item; // Return original otherwise
      });
      setDisplayHistory(modifiedHistory);

      // Rule 2: For any "Active" items that are still time-valid, set a timer to fake settlement.
      modifiedHistory.forEach(item => {
        if (item.state === 1 && item.endTimestamp >= nowInSeconds) {
          setTimeout(() => {
            setDisplayHistory(prev =>
              prev.map(historyItem =>
                historyItem.startTimestamp === item.startTimestamp // Find the item by a unique value
                  ? { ...historyItem, state: 2 } // and update its state
                  : historyItem
              )
            );
          }, 5000); // 5 seconds for demo purposes
        }
      });
    }
  }, [history]); // This powerful effect re-runs whenever the `history` prop from the parent changes

  const getStatus = (state: number) => {
    switch (state) {
      case 0: return 'Pending Funding';
      case 1: return 'Active';
      case 2: return 'Settled';
      default: return 'Unknown';
    }
  };

  if (isLoading) return <div className="history-container"><p>Loading history...</p></div>;
  if (error) {
    console.error("HistoryTable Error:", error);
    return <div className="history-container"><p>Error loading history. Check console.</p></div>;
  }
  if (!displayHistory || displayHistory.length === 0) {
    return (
        <div className="history-container">
            <h3>Derivative History</h3>
            <p>No derivatives have been created on this contract yet.</p>
        </div>
    );
  }

  const totalDerivatives = displayHistory.length;

  return (
    <div className="history-container">
      <h3>Derivative History</h3>
      <table className="history-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Status</th>
            <th>Strike Price</th>
            <th>Payout</th>
            <th>Transaction</th>
          </tr>
        </thead>
        <tbody>
          {displayHistory.map((item, index) => {
            const derivativeId = BigInt(totalDerivatives - 1 - index);
            const txHash = txHistory[derivativeId.toString()];
            return (
              <tr key={index}>
                <td>#{derivativeId.toString()}</td>
                <td>{getStatus(item.state)}</td>
                <td>${Number(item.strikeTemperature)}</td>
                <td>{formatEther(item.payoutAmount)} ETH</td>
                <td>
                  {txHash ? (
                    <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer">
                      View on Etherscan
                    </a>
                  ) : ( 'N/A' )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  );
}