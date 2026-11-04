import { createServerRoom, requestJoinServerRoom, dispatchServerRoomAction, getServerRoom } from '../src/lib/server-store';

const pin = '8888';
createServerRoom(pin, 'Alice', '', 1000, 5, 10);
requestJoinServerRoom(pin, 'Bob', '', 1000, true);
requestJoinServerRoom(pin, 'Charlie', '', 1000, true);

console.log('=== TEST 1: 3-PLAYER HAND WITH FOLD AND SHOWDOWN ===');
dispatchServerRoomAction(pin, { type: 'START_HAND' });
let room = getServerRoom(pin)!;
console.log('Hand started. Pot:', room.pot, 'Active:', room.players[room.activePlayerIndex].name);

// Charlie (first to act) folds
const firstActor = room.players[room.activePlayerIndex];
dispatchServerRoomAction(pin, { type: 'ACTION', playerId: firstActor.id, action: 'fold' });
room = getServerRoom(pin)!;
console.log('After Charlie folds. In-hand players remaining:', room.players.filter(p => p.status !== 'folded').length);
console.log('Street:', room.street, 'Next actor:', room.players[room.activePlayerIndex].name);

// Second actor calls
const secondActor = room.players[room.activePlayerIndex];
dispatchServerRoomAction(pin, { type: 'ACTION', playerId: secondActor.id, action: 'call' });
room = getServerRoom(pin)!;
console.log('After second actor calls. Next actor:', room.players[room.activePlayerIndex].name);

// Third actor checks
const thirdActor = room.players[room.activePlayerIndex];
dispatchServerRoomAction(pin, { type: 'ACTION', playerId: thirdActor.id, action: 'check' });
room = getServerRoom(pin)!;
console.log('Preflop complete! New Street:', room.street, 'Pot:', room.pot);

// Flop round: check, check
const flopActor1 = room.players[room.activePlayerIndex];
dispatchServerRoomAction(pin, { type: 'ACTION', playerId: flopActor1.id, action: 'check' });
room = getServerRoom(pin)!;
const flopActor2 = room.players[room.activePlayerIndex];
dispatchServerRoomAction(pin, { type: 'ACTION', playerId: flopActor2.id, action: 'check' });
room = getServerRoom(pin)!;
console.log('Flop complete! New Street:', room.street);

// Turn round: check, check
const turnActor1 = room.players[room.activePlayerIndex];
dispatchServerRoomAction(pin, { type: 'ACTION', playerId: turnActor1.id, action: 'check' });
room = getServerRoom(pin)!;
const turnActor2 = room.players[room.activePlayerIndex];
dispatchServerRoomAction(pin, { type: 'ACTION', playerId: turnActor2.id, action: 'check' });
room = getServerRoom(pin)!;
console.log('Turn complete! New Street:', room.street);

// River round: check, check
const riverActor1 = room.players[room.activePlayerIndex];
dispatchServerRoomAction(pin, { type: 'ACTION', playerId: riverActor1.id, action: 'check' });
room = getServerRoom(pin)!;
const riverActor2 = room.players[room.activePlayerIndex];
dispatchServerRoomAction(pin, { type: 'ACTION', playerId: riverActor2.id, action: 'check' });
room = getServerRoom(pin)!;
console.log('River complete! New Street:', room.street, 'Pot:', room.pot);

console.log('=== TEST 1 PASSED! ===');

