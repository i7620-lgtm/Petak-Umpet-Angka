import React, { useState, useEffect, useCallback } from 'react';
import GameBoard from './components/GameBoard';
import Instructions from './components/Instructions';
import { GameState } from './types';
import { getSeekerClue } from './services/geminiService';

// Helper functions for short, user-friendly room codes
const encodeSettings = (totalNumbers: number, hidingTime: number, difficulty: number): string => {
  const n = totalNumbers - 4; // Range 0-32
  const t = hidingTime - 5;   // Range 0-25
  const d = difficulty - 1; // Range 0-9

  // Combine into a single integer. Max value: (32*260) + (25*10) + 9 = 8579
  const combined = (n * 26 * 10) + (t * 10) + d;

  // Convert to a 3-char Base36 string (e.g., "6LB") and add 3 random chars
  const settingsCode = combined.toString(36).toUpperCase().padStart(3, '0');
  
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomPart = '';
  for (let i = 0; i < 3; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return settingsCode + randomPart;
};

const decodeSettings = (code: string): { totalNumbers: number; hidingTime: number; difficulty: number } | null => {
  // Stricter validation: code must be a 6-character string.
  if (typeof code !== 'string' || code.length !== 6) return null;

  try {
    const settingsCode = code.substring(0, 3);
    const combined = parseInt(settingsCode, 36);
    if (isNaN(combined)) return null;

    const d_norm = combined % 10;
    const t_norm = Math.floor(combined / 10) % 26;
    const n_norm = Math.floor(combined / (26 * 10));

    const totalNumbers = n_norm + 4;
    const hidingTime = t_norm + 5;
    const difficulty = d_norm + 1;

    // Validate ranges
    if (
      totalNumbers < 4 || totalNumbers > 36 ||
      hidingTime < 5 || hidingTime > 30 ||
      difficulty < 1 || difficulty > 10
    ) {
      return null; // Invalid settings
    }

    return { totalNumbers, hidingTime, difficulty };
  } catch (e) {
    return null;
  }
};


const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.Welcome);
  const [round, setRound] = useState<number>(1);
  const [availableNumbers, setAvailableNumbers] = useState<number[]>([]);
  const [userPosition, setUserPosition] = useState<number | null>(null);
  const [seekerPosition, setSeekerPosition] = useState<number | null>(null);
  const [clue, setClue] = useState<string>('');
  const [result, setResult] = useState<'safe' | 'caught' | null>(null);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Game Configuration State
  const [totalNumbers, setTotalNumbers] = useState<number>(16);
  const [hidingTime, setHidingTime] = useState<number>(10);
  const [difficulty, setDifficulty] = useState<number>(5);
  const [hidingTimeLeft, setHidingTimeLeft] = useState<number>(hidingTime);
  const [roomCode, setRoomCode] = useState<string>('');
  const [joinRoomInput, setJoinRoomInput] = useState<string>('');
  const [joinError, setJoinError] = useState<string>('');


  // Handle URL hash on initial load. Silently ignore invalid codes.
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#room=')) {
        const potentialCode = hash.substring(6).toUpperCase().replace(/[^A-Z0-9]/g, '');
        
        // Only proceed if the code is valid
        if (potentialCode.length === 6) {
            const settings = decodeSettings(potentialCode);
            if (settings) {
                setTotalNumbers(settings.totalNumbers);
                setHidingTime(settings.hidingTime);
                setDifficulty(settings.difficulty);
                setRoomCode(potentialCode);
                setGameState(GameState.Lobby);
            } else {
                 // Invalid code, clear the hash and do nothing.
                window.location.hash = '';
            }
        } else {
             // Malformed code, clear the hash and do nothing.
            window.location.hash = '';
        }
    }
  }, []);

  const handleCreateRoom = () => {
    const code = encodeSettings(totalNumbers, hidingTime, difficulty);
    setRoomCode(code);
    window.location.hash = `room=${code}`;
    setGameState(GameState.Lobby);
  };

  const handleJoinRoom = () => {
    setJoinError('');
    const settings = decodeSettings(joinRoomInput);
     if (settings) {
        setTotalNumbers(settings.totalNumbers);
        setHidingTime(settings.hidingTime);
        setDifficulty(settings.difficulty);
        setRoomCode(joinRoomInput);
        window.location.hash = `room=${joinRoomInput}`;
        setGameState(GameState.Lobby);
    } else {
        setJoinError('Kode room tidak valid!');
    }
  };
  
  const handleLeaveLobby = () => {
    window.location.hash = '';
    setRoomCode('');
    setGameState(GameState.Welcome);
  };

  const handleNumberClick = useCallback((number: number) => {
    if (gameState === GameState.Hiding && availableNumbers.includes(number)) {
      setUserPosition(number);
      setGameState(GameState.Seeking);
    }
  }, [gameState, availableNumbers]);

  const resetGame = useCallback(() => {
    setGameState(GameState.Lobby); // Go back to the lobby after a game
  }, []);
  
  const startGame = useCallback(async () => {
    setIsLoading(true);
    setRound(1);
    const initialNumbers = Array.from({ length: totalNumbers }, (_, i) => i + 1);
    setAvailableNumbers(initialNumbers);
    setGameState(GameState.Clue);
    setUserPosition(null);
    setSeekerPosition(null);
    setResult(null);
    setIsRevealed(false);
    setHidingTimeLeft(hidingTime);
    setClue('');

    try {
      const { clue: newClue, chosenNumber } = await getSeekerClue(initialNumbers, 1, difficulty);
      setClue(newClue);
      setSeekerPosition(chosenNumber);
      setGameState(GameState.Hiding);
    } catch (error) {
      console.error("Failed to get clue:", error);
      setGameState(GameState.Lobby); // Fallback to lobby on error
    } finally {
      setIsLoading(false);
    }
  }, [totalNumbers, hidingTime, difficulty]);

  const startNewRound = useCallback(async () => {
    setIsLoading(true);

    const currentAvailable = availableNumbers.filter(n => n !== seekerPosition);
    
    setAvailableNumbers(currentAvailable);
    setGameState(GameState.Clue);
    setUserPosition(null);
    setResult(null);
    setIsRevealed(false);
    setHidingTimeLeft(hidingTime);
    setClue('');

    try {
      const { clue: newClue, chosenNumber } = await getSeekerClue(currentAvailable, round + 1, difficulty);
      setClue(newClue);
      setSeekerPosition(chosenNumber);
      setGameState(GameState.Hiding);
    } catch (error) {
      console.error("Failed to get clue:", error);
       setGameState(GameState.Lobby);
    } finally {
      setIsLoading(false);
    }
  }, [round, seekerPosition, availableNumbers, hidingTime, difficulty]);

  // Timer for hiding phase
  useEffect(() => {
    if (gameState !== GameState.Hiding) return;

    if (hidingTimeLeft > 0) {
      const timerId = setTimeout(() => setHidingTimeLeft(t => t - 1), 1000);
      return () => clearTimeout(timerId);
    } else if (userPosition === null) {
        const randomIndex = Math.floor(Math.random() * availableNumbers.length);
        handleNumberClick(availableNumbers[randomIndex]);
    }
  }, [gameState, hidingTimeLeft, userPosition, availableNumbers, handleNumberClick]);


  // Main game state machine
  useEffect(() => {
    if (gameState === GameState.Seeking) {
      const timerId = setTimeout(() => {
        setIsRevealed(true);
        const isCaught = userPosition === seekerPosition;
        setResult(isCaught ? 'caught' : 'safe');
        setGameState(GameState.Result);
      }, 2000);
      return () => clearTimeout(timerId);
    } else if (gameState === GameState.Result && result) {
       if (result === 'caught') {
        const timerId = setTimeout(() => setGameState(GameState.GameOver), 3000);
        return () => clearTimeout(timerId);
       }
       if (result === 'safe') {
        const newAvailableCount = availableNumbers.filter(n => n !== seekerPosition).length;
        if (newAvailableCount <= 1) {
            const timerId = setTimeout(() => setGameState(GameState.Win), 3000);
            return () => clearTimeout(timerId);
        } else {
            setRound(r => r + 1);
        }
       }
    }
  }, [gameState, result, userPosition, seekerPosition, availableNumbers]);


  const renderContent = () => {
     if (gameState === GameState.Welcome) {
      return (
        <div className="space-y-6 flex flex-col items-center w-full max-w-md">
          <Instructions gameState={gameState} round={round} clue={clue} result={result} />
          
          <div className="w-full p-6 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 space-y-4">
            <h3 className="text-xl font-bold text-cyan-400">Pengaturan Permainan</h3>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <label htmlFor="totalNumbers" className="text-slate-300 mb-2 sm:mb-0">Jumlah Angka:</label>
              <input type="number" id="totalNumbers" value={totalNumbers} onChange={(e) => setTotalNumbers(Math.max(4, Math.min(36, parseInt(e.target.value, 10) || 4)))} className="bg-slate-900 border border-slate-600 rounded-md px-3 py-2 w-full sm:w-24 text-center" min="4" max="36" />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <label htmlFor="hidingTime" className="text-slate-300 mb-2 sm:mb-0">Waktu Bersembunyi (detik):</label>
              <input type="number" id="hidingTime" value={hidingTime} onChange={(e) => setHidingTime(Math.max(5, Math.min(30, parseInt(e.target.value, 10) || 5)))} className="bg-slate-900 border border-slate-600 rounded-md px-3 py-2 w-full sm:w-24 text-center" min="5" max="30" />
            </div>
            <div className="flex flex-col">
              <label htmlFor="difficulty" className="text-slate-300 mb-2">Tingkat Kesulitan AI: <span className="font-bold text-cyan-400">{difficulty}</span></label>
              <input type="range" id="difficulty" value={difficulty} onChange={(e) => setDifficulty(parseInt(e.target.value, 10))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer" min="1" max="10" />
            </div>
            <button onClick={handleCreateRoom} className="w-full mt-4 px-6 py-3 bg-cyan-500 text-slate-900 font-bold rounded-lg shadow-lg hover:bg-cyan-400 transition-colors">Buat Room</button>
          </div>

          <div className="w-full p-6 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 space-y-4">
              <h3 className="text-xl font-bold text-cyan-400">Gabung Room</h3>
              <div className="flex flex-col sm:flex-row gap-2">
                <input 
                  type="text" 
                  placeholder="Masukkan kode room..." 
                  value={joinRoomInput} 
                  onChange={(e) => {
                    // Clear error when user starts typing
                    if (joinError) setJoinError('');
                    const sanitized = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    setJoinRoomInput(sanitized.substring(0, 6));
                  }} 
                  className="flex-grow bg-slate-900 border border-slate-600 rounded-md px-3 py-2" 
                  maxLength={6}
                />
                <button onClick={handleJoinRoom} disabled={!joinRoomInput} className="px-6 py-2 bg-slate-600 text-white font-bold rounded-lg shadow-lg hover:bg-slate-500 disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors">Gabung</button>
              </div>
              {joinError && <p className="text-red-400 text-sm mt-2">{joinError}</p>}
          </div>
        </div>
      );
    }

    if (gameState === GameState.Lobby) {
      const baseUrl = window.location.origin + window.location.pathname;
      const joinUrl = `${baseUrl}#room=${roomCode}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(joinUrl)}`;
      return (
         <div className="space-y-6 flex flex-col items-center w-full max-w-md text-center">
            <Instructions gameState={gameState} round={round} clue={clue} result={result} />
            <div className="w-full p-6 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 space-y-4">
                <h3 className="text-lg font-bold text-cyan-400">Kode Room</h3>
                <p className="bg-slate-900 p-3 rounded-md font-mono text-2xl tracking-widest break-all">{roomCode}</p>
                 <img src={qrUrl} alt="QR Code" className="mx-auto my-4 rounded-lg border-4 border-slate-700" />
                 <p className="text-sm text-slate-400">Pindai kode QR atau bagikan tautan untuk mengundang.</p>
            </div>
             <div className="h-16 flex items-center space-x-4">
                <button onClick={handleLeaveLobby} className="px-6 py-3 bg-slate-600 text-white font-bold rounded-lg shadow-lg hover:bg-slate-500 transition-colors">Kembali</button>
                <button onClick={startGame} className="px-6 py-3 bg-cyan-500 text-slate-900 font-bold rounded-lg shadow-lg hover:bg-cyan-400 transition-colors">Mulai Bermain</button>
            </div>
         </div>
      )
    }

    // In-Game View
    return (
      <div className="space-y-6 flex flex-col items-center w-full">
        <Instructions gameState={gameState} round={round} clue={clue} result={result} />
        {isLoading && (
          <div className="text-center">
            <p className="text-xl text-cyan-400 animate-pulse">Pencari sedang berpikir...</p>
          </div>
        )}
        {gameState === GameState.Hiding && (
          <div className="text-2xl font-bold text-yellow-400 bg-slate-800/50 px-4 py-2 rounded-lg">
            Waktu: {hidingTimeLeft}s
          </div>
        )}
        <GameBoard
          totalNumbers={totalNumbers}
          availableNumbers={availableNumbers}
          userPosition={userPosition}
          seekerPosition={seekerPosition}
          isRevealed={isRevealed}
          onNumberClick={handleNumberClick}
          isClickable={gameState === GameState.Hiding}
        />
        <div className="h-16 flex items-center">
          {gameState === GameState.Result && result === 'safe' && availableNumbers.filter(n => n !== seekerPosition).length > 1 && (
            <button onClick={startNewRound} className="px-6 py-3 bg-cyan-500 text-slate-900 font-bold rounded-lg shadow-lg hover:bg-cyan-400 transition-colors">Ronde Berikutnya</button>
          )}
          {(gameState === GameState.GameOver || gameState === GameState.Win) && (
            <button onClick={resetGame} className="px-6 py-3 bg-cyan-500 text-slate-900 font-bold rounded-lg shadow-lg hover:bg-cyan-400 transition-colors">Main Lagi</button>
          )}
        </div>
      </div>
    );
  };

  return (
    <main className="bg-slate-900 text-white min-h-screen flex flex-col items-center justify-center p-4 font-sans">
      {renderContent()}
    </main>
  );
};

export default App;
