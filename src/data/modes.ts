export interface TournamentRoom {
  id: string;
  name: string;
  format: string;
  startsIn: string;
  capacity: number;
  joined: number;
}

export const MOCK_TOURNAMENTS: TournamentRoom[] = [
  {
    id: 't1',
    name: 'Lime Blitz Bash',
    format: '8-player knockout',
    startsIn: '10 min',
    capacity: 8,
    joined: 5,
  },
  {
    id: 't2',
    name: 'Pawn Party',
    format: '4-player knockout',
    startsIn: '25 min',
    capacity: 4,
    joined: 2,
  },
  {
    id: 't3',
    name: 'Rookie Rumble',
    format: '16-player knockout',
    startsIn: '1 hr',
    capacity: 16,
    joined: 9,
  },
];
