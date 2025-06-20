// src/components/AtmofiDapp.tsx

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { atmofiContract } from '../contract';
import { parseEther, formatEther } from 'viem';
import { ethers } from 'ethers';
import AggregatorV3InterfaceAbi from '../abis/AggregatorV3Interface.json';
import { HistoryTable } from './HistoryTable';

type ViewState = 'CREATION' | 'FUNDING' | 'SETTLEMENT_PENDING' | 'POST_SETTLEMENT';
type TxHistory = { [derivativeId: string]: `0x${string}` };

export function AtmofiDapp() {
  const { address } = useAccount();

  const [view, setView] = useState<ViewState>('CREATION');
  const [activeDerivativeId, setActiveDerivativeId] = useState<bigint | null>(null);
  
  const [beverageCo, setBeverageCo] = useState('');
  const [payout, setPayout] = useState('');
  const [premium, setPremium] = useState('');
  const [strike, setStrike] = useState('');
  
  const [latestTxHash, setLatestTxHash] = useState<`0x${string}` | undefined>();
  const [txHistory, setTxHistory] = useState<TxHistory>({});

  const { writeContractAsync, isPending } = useWriteContract();
  const { data: receipt, isLoading: isTxLoading, isSuccess: isTxSuccess, error: txError } = useWaitForTransactionReceipt({ hash: latestTxHash });

  const { 
    data: history, 
    error: historyError, 
    isLoading: isHistoryLoading, 
    refetch: refetchHistory 
  } = useReadContract({
    ...atmofiContract,
    functionName: 'getDerivativeHistory',
    args: [10n],
  });

  const { data: chainlinkFeedAddress } = useReadContract({
    ...atmofiContract,
    functionName: 'priceFeedContractAddress',
  });

  const { data: livePriceData } = useReadContract({
    abi: AggregatorV3InterfaceAbi,
    address: chainlinkFeedAddress as `0x${string}` | undefined,
    functionName: 'latestRoundData',
    refetchInterval: 5000,
    query: { enabled: !!chainlinkFeedAddress },
  });

  const { data: activeDerivative, refetch: refetchDerivative } = useReadContract({
    ...atmofiContract,
    functionName: 'derivatives',
    args: [activeDerivativeId!],
    query: { enabled: activeDerivativeId !== null },
  });
  
  const livePrice = livePriceData ? Number(livePriceData[1]) / 10**8 : 0;
  
  useEffect(() => {
    const savedHistory = localStorage.getItem('atmofiTxHistory');
    if (savedHistory) setTxHistory(JSON.parse(savedHistory));
  }, []);

  useEffect(() => {
    if (isTxSuccess && receipt?.status === 'success') {
      refetchHistory();
      
      if (view === 'CREATION' && activeDerivativeId !== null) {
        const newHistory = { ...txHistory, [activeDerivativeId.toString()]: receipt.transactionHash };
        setTxHistory(newHistory);
        localStorage.setItem('atmofiTxHistory', JSON.stringify(newHistory));
        setView('FUNDING');
        refetchDerivative();
      } 
      else if (view === 'FUNDING') {
        setView('SETTLEMENT_PENDING');
        refetchDerivative();
      } 
      else if (view === 'SETTLEMENT_PENDING') {
        setView('POST_SETTLEMENT');
      }
    }
  }, [isTxSuccess, receipt]);

  async function createDerivative(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const provider = new ethers.JsonRpcProvider('https://sepolia.drpc.org');
      const contract = new ethers.Contract(atmofiContract.address, atmofiContract.abi, provider);
      const nextId = await contract.nextDerivativeId() as bigint;
      setActiveDerivativeId(nextId);
      
      const hash = await writeContractAsync({
        ...atmofiContract,
        functionName: 'initialize',
        args: [beverageCo, parseEther(payout), BigInt(strike), 120],
        value: parseEther(premium),
      });
      setLatestTxHash(hash);
    } catch (err) {
      console.error('Error initializing derivative:', err);
      setActiveDerivativeId(null);
    }
  }

  async function fundDerivative() {
    if (activeDerivativeId === null) return;
    try {
      const payoutAmount = activeDerivative?.[3];
      if (!payoutAmount) return;
      const hash = await writeContractAsync({
        ...atmofiContract,
        functionName: 'fundInsurer',
        args: [activeDerivativeId],
        value: payoutAmount,
      });
      setLatestTxHash(hash);
    } catch (err) { console.error('Error funding derivative:', err); }
  }

  async function handleSettle() {
    if (activeDerivativeId === null) return;
    try {
      const hash = await writeContractAsync({
        ...atmofiContract,
        functionName: 'settleContract',
        args: [activeDerivativeId],
      });
      setLatestTxHash(hash);
    } catch (err) { console.error('Error settling derivative:', err); }
  }

// We add a 60-second buffer to account for clock drift between our browser and the blockchain
  const GRACE_PERIOD_SECONDS = 60;
  const canSettle = activeDerivative ? BigInt(Math.floor(Date.now() / 1000)) > (activeDerivative[5] + BigInt(GRACE_PERIOD_SECONDS)) : false;
  const buttonDisabled = isPending || isTxLoading;
  const getButtonText = (defaultText: string) => {
    if (isPending) return 'Check Wallet...';
    if (isTxLoading) return 'Confirming...';
    return defaultText;
  };

  const renderCreationView = () => (
    <>
      <div className="live-data">
        <h3>Live Market Data (ETH/USD)</h3>
        <p className="price">${livePrice > 0 ? livePrice.toFixed(2) : 'Fetching...'}</p>
        <p className="subtext">This is our stand-in for temperature. A lower price is "cooler" weather.</p>
      </div>
      <form onSubmit={createDerivative} className="contract-form">
        <h4>Create New Derivative</h4>
        <input name="beverageCo" placeholder="Beverage Co. Address (0x...)" value={beverageCo} onChange={(e) => setBeverageCo(e.target.value)} required />
        <input name="premium" placeholder="Premium (e.g., 0.01 ETH)" value={premium} onChange={(e) => setPremium(e.target.value)} required />
        <input name="payout" placeholder="Payout (e.g., 0.1 ETH)" value={payout} onChange={(e) => setPayout(e.target.value)} required />
        <input name="strike" placeholder="Strike Price (e.g., 2600)" value={strike} onChange={(e) => setStrike(e.target.value)} required />
        <div className="outcome-preview">
          <h5>Potential Outcome Preview</h5>
          {strike && premium && payout && livePrice > 0 ? ( livePrice < Number(strike) ?
              (<p>🟢 Current conditions favor the <strong>Beverage Company</strong>.</p>) :
              (<p>🔴 Current conditions favor the <strong>Insurer</strong>.</p>)
          ) : <p>Enter all values to see a preview.</p>}
        </div>
        <button type="submit" disabled={buttonDisabled}>{getButtonText('Create Derivative')}</button>
      </form>
    </>
  );

  const renderFundingView = () => (
    <div className="contract-view">
      <h3>Derivative #{activeDerivativeId?.toString()} Created</h3>
      <p>Status: <strong>Pending Funding</strong></p>
      <p>Please deposit the collateral to activate the contract.</p>
      <p>Payout Amount: <strong>{activeDerivative ? formatEther(activeDerivative[3]) : '...'} ETH</strong></p>
      <button onClick={fundDerivative} disabled={buttonDisabled}>{getButtonText('Deposit Collateral')}</button>
    </div>
  );

  const renderSettlementView = () => (
    <div className="contract-view">
      <h3>Derivative #{activeDerivativeId?.toString()} Active</h3>
      <p>Status: <strong>Funded & Awaiting Settlement</strong></p>
      <p>End Time: {activeDerivative ? new Date(Number(activeDerivative[5]) * 1000).toLocaleString() : '...'}</p>
      <button onClick={handleSettle} disabled={buttonDisabled || !canSettle}>
          {getButtonText(canSettle ? 'Settle Contract' : 'Waiting for End Time')}
      </button>
    </div>
  );
  
  const renderPostSettlementView = () => (
    <div className="contract-view">
        <h3>Settlement Submitted!</h3>
        <div className="outcome-preview">
          <p>✅ Your transaction to settle the derivative was successful.</p>
          <p>The final outcome will appear in the "Derivative History" table below as it updates automatically.</p>
        </div>
        <button onClick={() => { 
          setView('CREATION'); setActiveDerivativeId(null); setLatestTxHash(undefined);
          setBeverageCo(''); setPayout(''); setPremium(''); setStrike('');
        }}>Create Another Derivative</button>
    </div>
  );
  
  // Notice this function now accepts the props it needs
  const renderTransactionStatus = ({ isSuccess, txError }: { isSuccess: boolean, txError: Error | null }) => (
    <div className="tx-status">
      {isPending && <p>Please confirm the transaction in your wallet...</p>}
      {isTxLoading && <p>Waiting for confirmation on the blockchain...</p>}
      {latestTxHash && !isPending && !isTxLoading && <p>Last Transaction: <a href={`https://sepolia.etherscan.io/tx/${latestTxHash}`} target="_blank" rel="noopener noreferrer">{latestTxHash.substring(0,10)}...</a></p>}
      {isSuccess && receipt?.status === 'success' && <p>✅ Transaction was successful!</p>}
      {isSuccess && receipt?.status === 'reverted' && <p>❌ Transaction reverted.</p>}
      {txError && <p className="error-message">Error: {txError.message.split('(')[0]}</p>}
    </div>
  );

  return (
    <div className="dapp-container">
      {view === 'CREATION' && renderCreationView()}
      {view === 'FUNDING' && renderFundingView()}
      {view === 'SETTLEMENT_PENDING' && renderSettlementView()}
      {view === 'POST_SETTLEMENT' && renderPostSettlementView()}
      
      {/* And here we pass the props into the function call */}
      {renderTransactionStatus({ isSuccess: isTxSuccess, txError })}
      
      <HistoryTable 
        history={history || []} 
        txHistory={txHistory} 
        isLoading={isHistoryLoading} 
        error={historyError} 
      />
    </div>
  );
}