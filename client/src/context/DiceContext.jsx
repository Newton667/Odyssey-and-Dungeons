import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useTheme } from './ThemeContext';
import Dice3D from '../components/Dice3D';

const DiceContext = createContext(null);

const DIE_SIDES = { d4: 4, d6: 6, d8: 8, d10: 10, d12: 12, d20: 20, d100: 100 };

/** Force presets — controls physics intensity of 3D dice rolls */
export const FORCE_PRESETS = [
  { value: 1, label: 'Gentle',  icon: '~',  color: '#6eb5ff', desc: 'Soft toss, minimal bounce' },
  { value: 2, label: 'Normal',  icon: '●',  color: '#c9a227', desc: 'Standard throw' },
  { value: 3, label: 'Strong',  icon: '◆',  color: '#ff8c00', desc: 'Hard throw, more bounce' },
  { value: 4, label: 'Mighty',  icon: '★',  color: '#ff3030', desc: 'Maximum force, chaotic bounce' },
];

/**
 * Shared 3D dice provider.
 *
 * Any component can call:
 *   rollDice3D(diceArray, label?)
 *     diceArray: [{ die: 'd20', sides: 20 }, ...] or shorthand string '2d8'
 *     label: optional string shown while rolling (e.g. "Fire Bolt — Damage")
 *   Returns: Promise<{ results: [{die,sides,value},...], total: number }>
 *
 * Force setting is global and persists to localStorage.
 *   diceForce / setDiceForce — get/set the current force level (1-4)
 */
export function DiceProvider({ children }) {
  const { diceTheme } = useTheme();
  const [diceToRoll, setDiceToRoll] = useState(null);
  const [rollKey, setRollKey] = useState(0);
  const [fading, setFading] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [rollLabel, setRollLabel] = useState('');
  const [lastResults, setLastResults] = useState(null);
  const [diceForce, setDiceForceState] = useState(() => {
    const saved = localStorage.getItem('ond-dice-force');
    return saved ? Number(saved) : 2;
  });
  const resolveRef = useRef(null);
  const bonusRef = useRef(0);
  const fadeTimers = useRef([]);

  const setDiceForce = useCallback((f) => {
    const val = Math.max(1, Math.min(4, f));
    setDiceForceState(val);
    localStorage.setItem('ond-dice-force', String(val));
  }, []);

  const clearFadeTimers = () => {
    fadeTimers.current.forEach(t => clearTimeout(t));
    fadeTimers.current = [];
  };

  const rollDice3D = useCallback((dice, label) => {
    // Parse shorthand string like '2d8', '1d20', '1d8+2', or '1d8 + 2d6'
    let diceArray = dice;
    let staticBonus = 0;
    if (typeof dice === 'string') {
      // Try multiple dice groups: "1d8 + 2d6" or "1d8+2"
      const groups = dice.match(/(\d+)d(\d+)/g);
      const bonusMatch = dice.match(/\+\s*(\d+)(?!\s*d)/); // +N that's not followed by 'd'
      if (groups && groups.length > 0) {
        diceArray = [];
        for (const g of groups) {
          const m = g.match(/(\d+)d(\d+)/);
          const count = Number(m[1]);
          const sides = Number(m[2]);
          const die = `d${sides}`;
          for (let i = 0; i < count; i++) diceArray.push({ die, sides });
        }
        if (bonusMatch) staticBonus = Number(bonusMatch[1]);
        // d1 dice are flat damage (always 1) — add to bonus instead of rendering
        const d1Count = diceArray.filter(d => d.sides === 1).length;
        if (d1Count > 0) {
          staticBonus += d1Count;
          diceArray = diceArray.filter(d => d.sides !== 1);
        }
        // If only d1 dice (no real dice to render), resolve immediately
        if (diceArray.length === 0) {
          return Promise.resolve({ results: [{ die: 'd1', sides: 1, value: d1Count }], total: staticBonus });
        }
      } else {
        return Promise.resolve({ results: [], total: 0 });
      }
    }

    return new Promise((resolve) => {
      clearFadeTimers();
      setFading(false);
      setLastResults(null);
      setRolling(true);
      setRollLabel(label || '');
      setRollKey(k => k + 1);
      setDiceToRoll(diceArray);
      bonusRef.current = staticBonus;
      resolveRef.current = resolve;
    });
  }, []);

  const onDiceSettled = useCallback((diceResults) => {
    clearFadeTimers();
    const t1 = setTimeout(() => {
      const total = diceResults.reduce((s, r) => s + r.value, 0) + bonusRef.current;
      setRolling(false);
      setLastResults({ results: diceResults, total, bonus: bonusRef.current });

      if (resolveRef.current) {
        resolveRef.current({ results: diceResults, total, bonus: bonusRef.current });
        resolveRef.current = null;
      }

      const t2 = setTimeout(() => {
        setFading(true);
        const t3 = setTimeout(() => {
          setDiceToRoll(null);
          setFading(false);
        }, 1200);
        fadeTimers.current.push(t3);
      }, 4000);
      fadeTimers.current.push(t2);
    }, 500);
    fadeTimers.current.push(t1);
  }, []);

  return (
    <DiceContext.Provider value={{ rollDice3D, rolling, rollLabel, lastResults, diceForce, setDiceForce }}>
      {children}
      {diceToRoll && (
        <Dice3D
          key={rollKey}
          diceToRoll={diceToRoll}
          onSettled={onDiceSettled}
          fading={fading}
          force={diceForce}
          diceTheme={diceTheme}
        />
      )}
    </DiceContext.Provider>
  );
}

export function useDice() {
  const ctx = useContext(DiceContext);
  if (!ctx) throw new Error('useDice must be used within DiceProvider');
  return ctx;
}
