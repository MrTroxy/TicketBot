const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  channelId: { type: String, required: true, unique: true },
  creatorId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  description: { type: String },
  status: { type: String, enum: ['open', 'archived', 'deleted'], default: 'open' },
  usersAdded: { type: [String], default: [] },
  usersRemoved: { type: [String], default: [] }
});

module.exports = mongoose.model('Ticket', ticketSchema);