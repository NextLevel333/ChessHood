export interface GameMode {
  id: 'free-1v1' | 'free-tournament' | 'gated-wager' | 'gated-prize';
  name: string;
  blurb: string;
  gated: boolean;
}

export const GAME_MODES: GameMode[] = [
  {
    id: 'free-1v1',
    name: 'Free 1v1',
    blurb: 'Quick casual game. No wallet, no token.',
    gated: false,
  },
  {
    id: 'free-tournament',
    name: 'Free Tournaments',
    blurb: 'Join bracket rooms for bragging rights.',
    gated: false,
  },
  {
    id: 'gated-wager',
    name: 'Token-Gated Wager Matches',
    blurb: 'Planned for later, pending verification and compliance review.',
    gated: true,
  },
  {
    id: 'gated-prize',
    name: 'Token-Gated Prize Tournaments',
    blurb: 'Planned for later, pending verification and compliance review.',
    gated: true,
  },
];

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
