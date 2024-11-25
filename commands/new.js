const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('new')
    .setDescription('Create a new ticket')
    .addStringOption(option => 
      option.setName('description')
        .setDescription('Description for the ticket embed')
        .setRequired(false)
    ),
  async execute(interaction) {
    const description = interaction.options.getString('description') || 'Click the button below to create a ticket.';

    const embed = new EmbedBuilder()
      .setTitle('Create a Ticket')
      .setDescription(description)
      .setColor(0x00AE86);

    const button = new ButtonBuilder()
      .setCustomId('create_ticket')
      .setLabel('Create Ticket')
      .setStyle(ButtonStyle.Primary);

    await interaction.reply({ 
      embeds: [embed], 
      components: [new ActionRowBuilder().addComponents(button)] 
      // Removed 'ephemeral: true' to make the message public
    });
  },
};