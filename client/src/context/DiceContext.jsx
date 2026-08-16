import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useTheme } from './ThemeContext';
import Dice3D from '../components/Dice3D';
import { parseDiceFormula } from '../utils/diceFormula';

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
 *           or Promise<null> when dice are already in the air — one roll at a
 *           time. EVERY caller must guard: `if (!result) return;`
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
  // Re-entrancy guard. A ref, not the `rolling` state — state is stale inside
  // the rollDice3D useCallback, and a second roll starting mid-flight used to
  // cancel the first roll's delivery timer, orphaning its promise forever.
  const rollingRef = useRef(false);
  // Watchdog for the rollingRef guard. Dice3D arms its own 6s safety timeout, but
  // only AFTER the WebGLRenderer is built — if that setup throws or bails (no
  // canvas, WebGL unavailable, context lost on a GPU switch) onDiceSettled never
  // fires. Without this, every later roll would return null until a page reload.
  const watchdogRef = useRef(null);

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
    // One roll at a time — dice are still in the air. Resolve null (before the
    // parse, so the busy signal is unambiguous); every caller must guard on it.
    if (rollingRef.current) return Promise.resolve(null);
    // Defensive: never orphan a pending promise from an earlier roll.
    if (resolveRef.current) {
      resolveRef.current(null);
      resolveRef.current = null;
    }
    // Parse shorthand like '2d8', '1d20', '1d8+2', '1d8 + 2d6', '1' (flat damage).
    // The parser is shared with the sheet's advantage/disadvantage math.
    const { dice: diceArray, staticBonus, hasDice, d1Count } = parseDiceFormula(dice);

    if (!hasDice) {
      // Nothing to throw — a flat-damage weapon still scores its modifier.
      return Promise.resolve({ results: [], total: staticBonus });
    }
    // Only d1 dice (always 1) — nothing to render, resolve immediately.
    if (diceArray.length === 0) {
      return Promise.resolve({ results: [{ die: 'd1', sides: 1, value: d1Count }], total: staticBonus });
    }

    return new Promise((resolve) => {
      rollingRef.current = true;
      clearTimeout(watchdogRef.current);
      watchdogRef.current = setTimeout(() => {
        if (!rollingRef.current) return;
        rollingRef.current = false;
        setRolling(false);
        if (resolveRef.current) { resolveRef.current(null); resolveRef.current = null; }
      }, 10000);   // comfortably past Dice3D's own 6s safety net
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
    clearTimeout(watchdogRef.current);   // dice landed — stand the watchdog down
    clearFadeTimers();
    const t1 = setTimeout(() => {
      const total = diceResults.reduce((s, r) => s + r.value, 0) + bonusRef.current;
      rollingRef.current = false;
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
