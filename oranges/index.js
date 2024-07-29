function healthyOranges(rowLength, colLength, maxDays, rottenOranges) {
  let grid = [];
  for (let rows = 0; rows < rowLength; rows++) {
    grid.push([]);
    for (let col = 0; col < colLength; col++) {
      grid[rows].push(1);
    }
  }

  for (let [row, col] of rottenOranges) {
    grid[row][col] = 0;
  }

  function isInGrid(row, col) {
    return row >= 0 && row < rowLength && col >= 0 && col < colLength;
  }

  for (let day = 0; day < maxDays; day++) {
    let newRotten = [];

    for (let row = 0; row < rowLength; row++) {
      for (let col = 0; col < colLength; col++) {
        if (grid[row][col] === 0) {
          if (isInGrid(row + 1, col) && grid[row + 1][col] === 1) {
            newRotten.push([row + 1, col]);
          }
          if (isInGrid(row - 1, col) && grid[row - 1][col] === 1) {
            newRotten.push([row - 1, col]);
          }
          if (isInGrid(row, col + 1) && grid[row][col + 1] === 1) {
            newRotten.push([row, col + 1]);
          }
          if (isInGrid(row, col - 1) && grid[row][col - 1] === 1) {
            newRotten.push([row, col - 1]);
          }
        }
      }
    }

    for (let [row, col] of newRotten) {
      grid[row][col] = 0;
    }
  }

  let healthyCount = 0;
  for (let row = 0; row < rowLength; row++) {
    for (let col = 0; col < colLength; col++) {
      if (grid[row][col] === 1) {
        healthyCount++;
      }
    }
  }
  console.table(grid);

  return healthyCount;
}

let K = 5;
let L = 5;
let R = 2;
let rottenOranges = [
  [4, 8],
  [2, 7],
];

console.log(healthyOranges(8, 10, 1, rottenOranges));
