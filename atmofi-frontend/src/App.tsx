// src/App.tsx
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import './App.css';
import { AtmofiDapp } from './components/AtmofiDapp'; // <-- IMPORT

function App() {
  const { isConnected } = useAccount();

  return (
    <div className="App">
      <header className="App-header">
        <h1>AtmoFi Weather Derivatives</h1>
        <div className="connect-button-container">
          <ConnectButton />
        </div>
      </header>

      <main className="App-main">
        {isConnected ? (
          // RENDER OUR NEW COMPONENT
          <AtmofiDapp />
        ) : (
          <p>Please connect your wallet to interact with the AtmoFi dApp.</p>
        )}
      </main>
    </div>
  );
}

export default App;