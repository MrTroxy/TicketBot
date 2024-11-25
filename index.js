require('dotenv').config();
const { 
  Client, 
  Collection, 
  GatewayIntentBits, 
  REST, 
  Routes, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} = require('discord.js');
const { connectDB } = require('./database/db');
const fs = require('fs');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

// Load commands
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
const commands = [];
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
  commands.push(command.data.toJSON());
}

// Helper function to find or create a category
async function findOrCreateCategory(guild, categoryName) {
  // Attempt to find the category by name
  let category = guild.channels.cache.find(
    (c) => c.name === categoryName && c.type === 4 // 4 = Category
  );

  // If not found, create the category
  if (!category) {
    category = await guild.channels.create({
      name: categoryName,
      type: 4, // GuildCategory
    });
    console.log(`Created category "${categoryName}" in guild "${guild.name}".`);
  }

  return category;
}

// Register slash commands to each guild the bot is in
client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

  try {
    console.log('Started refreshing application (/) commands for all guilds.');

    const guilds = client.guilds.cache.map(guild => guild.id);
    for (const guildId of guilds) {
      await rest.put(
        Routes.applicationGuildCommands(client.user.id, guildId),
        { body: commands },
      );
      console.log(`Successfully reloaded application (/) commands for guild ${guildId}.`);
    }

    console.log('All guild slash commands have been refreshed.');
  } catch (error) {
    console.error('Error registering slash commands:', error);
  }
});

client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (command) await command.execute(interaction, client);
  } else if (interaction.isButton()) {
    const { customId } = interaction;

    if (customId === 'create_ticket') {
      // Handle ticket creation
      const openCategoryName = 'Open Tickets';
      const openCategory = await findOrCreateCategory(interaction.guild, openCategoryName);

      const channel = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username}`,
        type: 0, // GuildText
        parent: openCategory.id, // Assign to "Open Tickets" category
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: ['ViewChannel'],
          },
          {
            id: interaction.user.id,
            allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
          },
        ],
      });

      // Create Close Ticket button
      const closeButton = new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('Close Ticket')
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder().addComponents(closeButton);

      await channel.send({
        content: `${interaction.user}, your ticket has been created.`,
        components: [row],
      });

      await interaction.reply({ 
        content: `Ticket created! <#${channel.id}>`, 
      });
    }

    else if (customId === 'close_ticket') {
      // Confirm Close Ticket
      const confirmArchive = new ButtonBuilder()
        .setCustomId('confirm_archive')
        .setLabel('Archive')
        .setStyle(ButtonStyle.Secondary);

      const confirmDelete = new ButtonBuilder()
        .setCustomId('confirm_delete')
        .setLabel('Delete')
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder().addComponents(confirmArchive, confirmDelete);

      await interaction.reply({
        content: 'Are you sure you want to close this ticket?',
        components: [row],
        ephemeral: true,
      });
    }

    else if (customId === 'confirm_archive') {
      // Archive Ticket: Remove all permissions except for roles that should keep access
      const channel = interaction.channel;
      const guild = interaction.guild;

      // Define the archived category
      const archivedCategoryName = 'Archived Tickets';
      const archivedCategory = await findOrCreateCategory(guild, archivedCategoryName);

      // Rename the channel from 'ticket-username' to 'archived-username'
      if (channel.name.startsWith('ticket-')) {
        const newName = channel.name.replace(/^ticket-/i, 'archived-');
        await channel.setName(newName);
      } else {
        console.warn(`Channel ${channel.id} does not start with 'ticket-'. Skipping rename.`);
      }

      // Move the channel to the "Archived Tickets" category
      await channel.setParent(archivedCategory.id);

      // Remove @everyone permission to view the channel
      await channel.permissionOverwrites.edit(guild.id, { ViewChannel: false });

      await interaction.update({
        content: 'Ticket has been archived.',
        components: [],
      });
    }

    else if (customId === 'confirm_delete') {
      // Delete the channel
      await interaction.channel.delete('Ticket deleted by user.');
    }
  }
});

connectDB(); // Connect to the database
client.login(process.env.TOKEN);