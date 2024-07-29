export function createTableCell(textContent) {
  const cell = document.createElement("td");
  cell.textContent = textContent;
  return cell;
}

export function createActionButton(text, onClick) {
  const button = document.createElement("button");
  button.textContent = text;
  button.addEventListener("click", onClick);
  return button;
}
