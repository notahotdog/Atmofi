// src/components/HistoryTable.tsx
import { useReadContract } from 'wagmi';
import { atmofiContract } from '../contract';
import { formatEther } from 'viem';

export function HistoryTable() {
  const { data: history, isLoading, error } = useReadContract({
    ...atmofiContract,
    functionName: 'getDerivativeHistory',
    args: [10n], // Fetch up to 10 of the latest entries
    // Refetch every 15 seconds to keep the list updated
    watch: { refetchInterval: 15000 }
  });

  const getStatus = (state: number) => {
    switch (state) {
      case 0: return 'Pending Funding';
      case 1: return 'Active';
      case 2: return 'Settled';
      default: return 'Unknown';
    }
  };

  if (isLoading) return <p>Loading history...</p>;
  if (error) return <p>Error loading history.</p>;
  if (!history || history.length === 0) return <p>No derivatives have been created yet.</p>;

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
            <th>Insurer</th>
          </tr>
        </thead>
        <tbody>
          {history.map((item, index) => (
            <tr key={index}>
              <td>#{history.length - index}</td>
              <td>{getStatus(item.state)}</td>
              <td>${Number(item.strikeTemperature)}</td>
              <td>{formatEther(item.payoutAmount)} ETH</td>
              <td>{`<span class="math-inline">\{item\.insurer\.substring\(0, 6\)\}\.\.\.</span>{item.insurer.substring(item.insurer.length - 4)}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}