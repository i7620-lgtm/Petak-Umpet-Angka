import React from 'react';
import { GameState } from '../types';

interface InstructionsProps {
  gameState: GameState;
  round: number;
  clue: string;
  result: 'safe' | 'caught' | null;
}

const Instructions: React.FC<InstructionsProps> = ({ gameState, round, clue, result }) => {
  const getInstructions = () => {
    switch (gameState) {
      case GameState.Welcome:
        return {
          title: "Selamat Datang di Petak Umpet Angka!",
          text: "Akal-akali si Pencari AI! Atur permainanmu, buat room, dan undang teman-temanmu untuk bermain dengan aturan yang sama!",
        };
      case GameState.Lobby:
        return {
          title: "Room Telah Dibuat!",
          text: "Bagikan kode room di bawah ini kepada teman-temanmu agar mereka bisa bergabung dan bermain dengan pengaturan yang sama.",
        };
      case GameState.Clue:
        return {
          title: `Ronde ${round}: Petunjuk dari Pencari`,
          text: `"${clue}"`,
        };
      case GameState.Hiding:
        return {
          title: `Ronde ${round}: Pilih Tempat Sembunyi!`,
          text: `Petunjuk: "${clue}"`,
        };
      case GameState.Seeking:
        return {
          title: `Ronde ${round}: Mencari...`,
          text: "Pencari sedang bergerak! Di mana ia akan mencari?",
        };
       case GameState.Result:
        if (result === 'caught') {
           return { title: `Ronde ${round}: Tertangkap!`, text: "Pencari menemukanmu!" };
        }
        return { title: `Ronde ${round}: Kamu Aman!`, text: "Fiuh! Nyaris saja. Lanjut ke ronde berikutnya." };
      case GameState.GameOver:
        return {
          title: "Permainan Selesai",
          text: "Kamu telah ditangkap oleh Pencari. Semoga beruntung lain kali!",
        };
      case GameState.Win:
        return {
          title: "Selamat! Kamu Menang! 🎉",
          text: "Kamu adalah yang terakhir bertahan! Kamu berhasil mengakali Pencari AI.",
        };
      default:
        return { title: "", text: "" };
    }
  };

  const { title, text } = getInstructions();

  if (!title) return null;

  return (
    <div className="w-full max-w-md p-6 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 shadow-2xl">
      <h2 className="text-2xl font-bold text-cyan-400 mb-3">{title}</h2>
      <p className="text-slate-300 italic">{text}</p>
    </div>
  );
};

export default Instructions;
