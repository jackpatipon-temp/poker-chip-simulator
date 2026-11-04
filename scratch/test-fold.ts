import { createInitialRoomState, startNewHand, handlePlayerAction } from '../src/lib/poker-engine';
import { Player } from '../src/types/poker';

const host: Player = {
  id: 'user_host',
  name: 'Host',
  avatarUrl: '',
  chips: 1000,
  currentBet: 0,
  totalRoundBet: 0,
  status: 'active',
  seatIndex: 0,
  isDealer: true,
  isSmallBlind: false,
  isBigBlind: false,
  isTurn: false,
  isHost: true,
  isApproved: true,
  hasActedThisRound: false,
};

const p2: Player = {
  id: 'user_p2',
  name: 'Player 2',
  avatarUrl: '',
  chips: 1000,
  currentBet: 0,
  totalRoundBet: 0,
  status: 'active',
  seatIndex: 1,
  isDealer: false,
  isSmallBlind: false,
  isBigBlind: false,
  isTurn: false,
  isHost: false,
  isApproved: true,
  hasActedThisRound: false,
};

let room = createInitialRoomState('1234', host);
room.players.push(p2);

console.log('\n--- Start Hand 1 ---');
room = startNewHand(room);
console.log('Pot:', room.pot);

console.log('\n--- Host Folds ---');
room = handlePlayerAction(room, 'user_host', 'fold');
console.log('Street:', room.street);
console.log('Pot:', room.pot);
console.log('Winner IDs:', room.winnerIds);
console.log('Players chips:', room.players.map(p => `${p.name}: ${p.chips} (status: ${p.status})`));

console.log('\n--- Start Hand 2 (Next Hand) ---');
room = startNewHand(room);
console.log('Street:', room.street);
console.log('Pot:', room.pot);
console.log('Active Player Index:', room.activePlayerIndex);
console.log('Active Player:', room.players[room.activePlayerIndex]?.name, room.players[room.activePlayerIndex]?.id);
console.log('Players chips:', room.players.map(p => `${p.name}: ${p.chips} (status: ${p.status}, isDealer: ${p.isDealer}, isSB: ${p.isSmallBlind}, isBB: ${p.isBigBlind})`));
