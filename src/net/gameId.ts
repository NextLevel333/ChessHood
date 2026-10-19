/** Extracts a room code from a bare code or a pasted invite link (e.g. .../#/game/ABCD2345). */
export function parseGameId(input: string): string | null {
  const last = input.trim().split(/[/?#]/).filter(Boolean).pop();
  const id = last?.toUpperCase();
  return id && /^[A-Z2-9]{6,12}$/.test(id) ? id : null;
}
