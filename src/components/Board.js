import React from "react";

const Board = ({ board }) => {
  return (
    <div className="board">
      {board.map((row, rowIndex) =>
        row.map((cell, cellIndex) => (
          <div
            key={`${rowIndex}-${cellIndex}`}
            className={`cell ${cell ? `filled-${cell}` : ""}`}
          ></div>
        ))
      )}
    </div>
  );
};

export default Board;
