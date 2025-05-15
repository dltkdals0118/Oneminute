const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const waitingUsers = new Map();

io.on('connection', (socket) => {
  socket.on('join-matching', (user) => {
    waitingUsers.set(socket.id, { user, joinedAt: Date.now(), socketId: socket.id });
    tryMatch(socket.id);
  });

  socket.on('disconnect', () => {
    waitingUsers.delete(socket.id);
  });
});

function tryMatch(socketId) {
  const current = waitingUsers.get(socketId);
  if (!current) return;

  const candidates = [...waitingUsers.values()]
    .filter(u => u.socketId !== socketId && u.user.country !== current.user.country);

  if (candidates.length > 0) {
    const partner = candidates[0];
    const sessionId = uuidv4();
    io.to(socketId).emit('match-found', { sessionId, partner: partner.user });
    io.to(partner.socketId).emit('match-found', { sessionId, partner: current.user });
    waitingUsers.delete(socketId);
    waitingUsers.delete(partner.socketId);
  }
}

const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Matching server running on port ${PORT}`);
}); 