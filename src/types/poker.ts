export type Street = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

export type PlayerStatus = 'active' | 'folded' | 'all-in' | 'sitting-out';

export interface Player {
  id: string;
  name: string;
  avatarUrl: string;
  email?: string;
  chips: number;
  currentBet: number;
  totalRoundBet: number;
  status: PlayerStatus;
  seatIndex: number;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  isTurn: boolean;
  lastAction?: 'check' | 'call' | 'raise' | 'bet' | 'fold' | 'all-in';
  lastBetAmount?: number;
  prevStreetBet?: number;
  isHost: boolean;
  isApproved: boolean;
  hasActedThisRound: boolean;
}

export type RaiseRule = 'standard' | 'casual';

export interface SidePot {
  id?: string;
  name?: string;
  amount: number;
  eligiblePlayerIds: string[];
}

export interface Vote {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  options: {
    id: string;
    label: string;
    votes: string[]; // player ids
  }[];
  expiresAt?: number;
  resolved: boolean;
}

export interface PotWinnerDetail {
  potName: string;
  amount: number;
  winners: {
    id: string;
    name: string;
    avatarUrl?: string;
    prize: number;
  }[];
}

export interface ShowdownResult {
  id: string;
  timestamp: number;
  totalPot: number;
  isFoldWin: boolean;
  soleWinnerName?: string;
  soleWinnerAvatar?: string;
  potResults: PotWinnerDetail[];
}

export interface RoomState {
  roomId: string;
  roomName: string;
  hostId: string;
  isHostPlaying: boolean;
  smallBlind: number;
  bigBlind: number;
  nextSmallBlind?: number;
  nextBigBlind?: number;
  ante: number;
  raiseRule?: RaiseRule; // 'standard' (สากล) | 'casual' (บ้านๆ เกทับเท่าไหร่ก็ได้ > ล่าสุด)
  street: Street;
  pot: number;
  currentHighestBet: number;
  minRaise: number;
  dealerIndex: number;
  activePlayerIndex: number;
  players: Player[];
  sidePots: SidePot[];
  history: GameHistoryEntry[];
  pendingRequests: JoinRequest[];
  activeVote?: Vote | null;
  winnerIds?: string[];
  lastShowdownResult?: ShowdownResult | null;
  deckBurnCount?: number;
  isFirstHandStarted?: boolean;
}

export interface JoinRequest {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  requestedChips: number;
  createdAt: number;
}

export interface GameHistoryEntry {
  id: string;
  timestamp: number;
  description: string;
  snapshot: string; // serialized RoomState for undo
}
