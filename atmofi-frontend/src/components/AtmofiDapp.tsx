// src/components/AtmofiDapp.tsx
import { useState } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { atmofiContract } from '../contract';
import { parseEther } from 'viem';

export function AtmofiDapp() {
  const { writeContractAsync } = useWriteContract();
  const { data: nextId, refetch } = useReadContract({
    ...atmofiContract,
    functionName: 'nextDerivativeId',
  });

  // --- THIS IS THE FIX ---
  // Initialize the state with `undefined` instead of an empty string
  const [latestTxHash, setLatestTxHash] = useState<`0x${string}` | undefined>();
  
  const { isLoading, isSuccess } = useWaitForTransactionReceipt({ hash: latestTxHash });

  // Form state
  const [beverageCo, setBeverageCo] = useState('');
  const [payout, setPayout] = useState('');
  const [premium, setPremium] = useState('');
  const [strike, setStrike] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const hash = await writeContractAsync({
        ...atmofiContract,
        functionName: 'initialize',
        args: [beverageCo, parseEther(payout), BigInt(strike), 60 * 60 * 24],
        value: parseEther(premium),
      });
      setLatestTxHash(hash);
    } catch (err) {
      console.error('Error initializing derivative:', err);
    }
  }

  if (isSuccess) {
    refetch();
  }

  return (
  <div className="dapp-container">
    <h3>AtmoFi Contract Control</h3>
      <p>Total Derivatives Created: {nextId?.toString() ?? 'Loading...'}</p>

      <form onSubmit={submit} className="contract-form">
        <h4>Create New Derivative</h4>
        <input name="beverageCo" placeholder="Beverage Co. Address (0x...)" onChange={(e) => setBeverageCo(e.target.value)} required />
        <input name="premium" placeholder="Premium (e.g., 0.01 ETH)" onChange={(e) => setPremium(e.target.value)} required />
        <input name="payout" placeholder="Payout (e.g., 0.1 ETH)" onChange={(e) => setPayout(e.target.value)} required />
        <input name="strike" placeholder="Strike Price (e.g., 27)" onChange={(e) => setStrike(e.target.value)} required />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Derivative'}
        </button>
      </form>

      {/* This conditional rendering still works perfectly with `undefined` */}
      {latestTxHash && <p>Transaction submitted: <a href={`https://sepolia.etherscan.io/tx/${latestTxHash}`} target="_blank" rel="noopener noreferrer">{latestTxHash.substring(0,10)}...</a></p>}
      {isLoading && <p>Waiting for confirmation...</p>}
      {isSuccess && <p>Transaction confirmed! New derivative created.</p>}
    </div>
  );
}