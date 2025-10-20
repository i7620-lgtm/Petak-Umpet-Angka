import React from 'react';

interface NumberCellProps {
  number: number;
  isAvailable: boolean;
  isUserHidden: boolean;
  isSeekerHere: boolean;
  isRevealed: boolean;
  onClick: (number: number) => void;
  isClickable: boolean;
}

const NumberCell: React.FC<NumberCellProps> = ({ number, isAvailable, isUserHidden, isSeekerHere, isRevealed, onClick, isClickable }) => {
  let cellClasses = "w-16 h-16 md:w-20 md:h-20 flex items-center justify-center rounded-lg transition-all duration-500 font-bold text-2xl md:text-3xl border-2";
  let content = <>{number}</>;

  if (isRevealed) {
    if (isSeekerHere && isUserHidden) {
      cellClasses += " bg-red-500 border-red-300 text-white transform scale-110 shadow-lg shadow-red-500/50";
      content = <>😭<br/>{number}</>;
    } else if (isSeekerHere) {
      cellClasses += " bg-orange-500 border-orange-300 text-white transform scale-110 shadow-lg shadow-orange-500/50";
       content = <>👀<br/>{number}</>;
    } else if (isUserHidden) {
      cellClasses += " bg-blue-500 border-blue-300 text-white transform scale-110 shadow-lg shadow-blue-500/50";
      content = <>😎<br/>{number}</>;
    } else {
      cellClasses += " bg-slate-900 border-slate-700 text-slate-600 opacity-50";
    }
  } else if (!isAvailable) {
    cellClasses += " bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed";
  } else {
    // Add hover effects and cursor pointer only when the board is clickable
    if (isClickable) {
      cellClasses += " bg-slate-700 border-slate-600 hover:bg-cyan-800 hover:border-cyan-500 cursor-pointer";
    } else {
      cellClasses += " bg-slate-700 border-slate-600";
    }
  }
  
  return (
    <div className={cellClasses} onClick={() => isClickable && isAvailable && onClick(number)}>
      <div className="flex flex-col items-center justify-center text-center">
        {content}
      </div>
    </div>
  );
};


interface GameBoardProps {
  totalNumbers: number;
  availableNumbers: number[];
  userPosition: number | null;
  seekerPosition: number | null;
  isRevealed: boolean;
  onNumberClick: (number: number) => void;
  isClickable: boolean;
}

const GameBoard: React.FC<GameBoardProps> = ({
  totalNumbers,
  availableNumbers,
  userPosition,
  seekerPosition,
  isRevealed,
  onNumberClick,
  isClickable,
}) => {
  const numbers = Array.from({ length: totalNumbers }, (_, i) => i + 1);

  return (
    <div className="grid grid-cols-4 gap-3 p-4 bg-slate-800 rounded-lg border-2 border-slate-700 shadow-lg">
      {numbers.map((num) => (
        <NumberCell
          key={num}
          number={num}
          isAvailable={availableNumbers.includes(num)}
          isUserHidden={userPosition === num}
          isSeekerHere={seekerPosition === num}
          isRevealed={isRevealed && (seekerPosition === num || userPosition === num)}
          onClick={onNumberClick}
          isClickable={isClickable}
        />
      ))}
    </div>
  );
};

export default GameBoard;
