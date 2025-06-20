// src/components/HistoryChart.tsx

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useReadContract } from 'wagmi';
import { atmofiContract } from '../contract';

export function HistoryChart() {
  // Hook to fetch the last 10 settled derivatives from our new `getHistory` function
  const { data: history, isLoading } = useReadContract({
    ...atmofiContract,
    functionName: 'getHistory',
    args: [10n], // Fetch up to 10 of the latest entries
  });

  // Format the data for the chart
  const chartData = history?.map((item, index) => ({
    name: `ID ${history.length - index}`, // Show as "ID 1", "ID 2", etc.
    strike: Number(item.strikeTemperature),
    settled: Number(item.settledTemperature),
  })).reverse() ?? [];

  if (isLoading) return <p>Loading history...</p>;
  if (!chartData || chartData.length === 0) return <p>No settlement history yet.</p>;

  return (
    <div className="history-chart-container">
      <h3>Settlement History</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis dataKey="name" stroke="#ccc" />
          <YAxis stroke="#ccc" label={{ value: 'Price ($)', angle: -90, position: 'insideLeft', fill: '#ccc' }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#282c34', border: '1px solid #555' }}
            labelStyle={{ color: '#fff' }}
          />
          <Legend />
          <Bar dataKey="strike" fill="#8884d8" name="Strike Price" />
          <Bar dataKey="settled" fill="#82ca9d" name="Settled Price" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}