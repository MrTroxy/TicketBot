const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const logger = require('../logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add')
    .setDescription('Add a user to the ticket')
    .addUserOption(option => option.setName('user').setDescription('User to add').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  async execute(interaction) {
    const user = interaction.options.getUser('user');

    try {
      await interaction.channel.permissionOverwrites.edit(user.id, { ViewChannel: true });
      await interaction.reply({ content: `${user} has been added to the ticket.`, ephemeral: true });

      // Update database
      if (db.DB_TYPE === 'mongodb') {
        const MongoTicket = db.getMongoTicket();
        if (!MongoTicket) {
          logger.error('MongoTicket model is not initialized.');
          return;
        }
        await MongoTicket.findOneAndUpdate(
          { channelId: interaction.channel.id },
          { $addToSet: { usersAdded: user.id } }
        );
      } else if (db.DB_TYPE === 'mysql' || db.DB_TYPE === 'sqlite') {
        const SequelizeTicket = db.getSequelizeTicket();
        if (!SequelizeTicket) {
          logger.error('SequelizeTicket model is not initialized.');
          return;
        }
        const ticket = await SequelizeTicket.findOne({ where: { channelId: interaction.channel.id } });
        if (ticket) {
          const updatedUsersAdded = [...ticket.usersAdded, user.id];
          await ticket.update({ usersAdded: updatedUsersAdded });
        } else {
          logger.warn(`Ticket not found for channelId: ${interaction.channel.id}`);
        }
      }
    } catch (error) {
      logger.error('Error adding user to ticket:', error);
      await interaction.followUp({ content: 'Failed to add the user to the ticket.', ephemeral: true });
    }
  },
};