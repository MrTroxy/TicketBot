const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Remove a user from the ticket')
    .addUserOption(option => option.setName('user').setDescription('User to remove').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    await interaction.channel.permissionOverwrites.edit(user.id, { ViewChannel: false });
    await interaction.reply({ content: `${user} has been removed from the ticket.`, ephemeral: true });
  },
};
