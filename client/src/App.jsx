import { useState, Component } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { DiceProvider } from './context/DiceContext';
import Navbar from './components/Navbar';
import DiceRoller from './components/DiceRoller';
import Home from './pages/Home';
import Characters from './pages/Characters';
import CharacterSheet from './pages/CharacterSheet';
import CharacterCreate from './pages/CharacterCreate';
import CharacterEdit from './pages/CharacterEdit';
import Campaigns from './pages/Campaigns';
import CampaignView from './pages/CampaignView';
import Spells from './pages/Spells';
import Equipment from './pages/Equipment';
import Homebrew from './pages/Homebrew';
import Settings from './pages/Settings';

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('React crash:', error, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '40px', color: '#ff6b6b', fontFamily: 'monospace', background: '#1a0505', minHeight: '100vh' }}>
          <h2 style={{ color: '#ff4444' }}>Something crashed</h2>
          <pre style={{ whiteSpace: 'pre-wrap', marginTop: '16px', color: '#ffaaaa' }}>{this.state.error.message}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', marginTop: '8px', color: '#886666', fontSize: '12px' }}>{this.state.error.stack}</pre>
          <button onClick={() => { this.setState({ error: null }); window.location.href = '/characters'; }}
            style={{ marginTop: '20px', padding: '10px 20px', background: '#c9a227', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>
            Back to Characters
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [diceOpen, setDiceOpen] = useState(false);

  return (
    <ThemeProvider>
      <DiceProvider>
        <ErrorBoundary>
          <div style={{ minHeight: '100vh' }}>
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/characters" element={<Characters />} />
              <Route path="/characters/new" element={<CharacterCreate />} />
              <Route path="/characters/:id" element={<CharacterSheet />} />
              <Route path="/characters/:id/edit" element={<CharacterEdit />} />
              <Route path="/campaigns" element={<Campaigns />} />
              <Route path="/campaigns/:id" element={<CampaignView />} />
              <Route path="/spells" element={<Spells />} />
              <Route path="/equipment" element={<Equipment />} />
              <Route path="/homebrew" element={<Homebrew />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>

            {/* Floating dice button — bottom left */}
            <button
              onClick={() => setDiceOpen(p => !p)}
              title="Dice Roller"
              className="dice-fab"
              style={{
                position: 'fixed', bottom: '24px', left: '24px',
                width: '52px', height: '52px', borderRadius: '50%',
                fontSize: '24px', cursor: 'pointer', zIndex: 950,
                background: diceOpen ? 'var(--gold, #c9a227)' : 'var(--bg-card, #1a1205)',
                border: '2px solid var(--gold-dim, #7a5c10)',
                boxShadow: diceOpen
                  ? '0 0 18px rgba(201,162,39,0.5)'
                  : '0 4px 16px rgba(0,0,0,0.6)',
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              🎲
            </button>

            {diceOpen && <DiceRoller onClose={() => setDiceOpen(false)} />}
          </div>
        </ErrorBoundary>
      </DiceProvider>
    </ThemeProvider>
  );
}
