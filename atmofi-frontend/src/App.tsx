// src/App.tsx
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import './App.css';
import { AtmofiDapp } from './components/AtmofiDapp';
import { HistoryTable } from './components/HistoryTable'; // <-- CHANGE THIS IMPORT

function App() {
  const { isConnected } = useAccount();

  return (
    <div className="App">
      <div className="App-container"> 
        <header className="App-header">
          <h1>AtmoFi Weather Derivatives</h1>
          <div className="connect-button-container">
            <ConnectButton />
          </div>
        </header>

        <main className="App-main">
          {isConnected ? (
            <>
              <AtmofiDapp />
              {/* RENDER THE NEW TABLE COMPONENT */}
              <HistoryTable />
            </>
          ) : (
            <p>Please connect your wallet to interact with the AtmoFi dApp.</p>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;