import React from "react";

const Board = ({ board, preview }) => {
  return (
    <div className={`board ${preview ? "preview-board" : ""}`}>
      {board.map((row, rowIndex) =>
        row.map((cell, cellIndex) => (
          <div
            key={`${rowIndex}-${cellIndex}`}
            className={`cell ${
              cell
                ? cell.toString().startsWith("ghost-")
                  ? "ghost-cell"
                  : `filled-${cell}`
                : ""
            }`}
          ></div>
        ))
      )}
    </div>
  );
};

export default Board;
