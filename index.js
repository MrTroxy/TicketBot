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
const db = require('./database/db');
const fs = require('fs');

const logger = require('./logger');

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
    logger.info(`Created category "${categoryName}" in guild "${guild.name}".`);
  }

  return category;
}

// Register slash commands to each guild the bot is in
client.once('ready', async () => {
  logger.info(`Logged in as ${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

  try {
    logger.info('Started refreshing application (/) commands for all guilds.');

    const guilds = client.guilds.cache.map(guild => guild.id);
    for (const guildId of guilds) {
      await rest.put(
        Routes.applicationGuildCommands(client.user.id, guildId),
        { body: commands },
      );
      logger.info(`Successfully reloaded application (/) commands for guild ${guildId}.`);
    }

    logger.info('All guild slash commands have been refreshed.');
  } catch (error) {
    logger.error('Error registering slash commands:', error);
  }
});

client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (command) await command.execute(interaction, client);
    } else if (interaction.isButton()) {
      const { customId } = interaction;

      switch (customId) {
        case 'create_ticket':
          await handleCreateTicket(interaction);
          break;

        case 'close_ticket':
          await handleCloseTicket(interaction);
          break;

        case 'confirm_archive':
          await handleConfirmArchive(interaction);
          break;

        case 'confirm_delete':
          await handleConfirmDelete(interaction);
          break;

        default:
          logger.warn(`Unhandled button interaction with customId: ${customId}`);
          await interaction.reply({ content: 'Unknown action.', ephemeral: true });
      }
    }
  } catch (error) {
    logger.error('Error handling interaction:', error);
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content: 'An error occurred while processing your request.', ephemeral: true });
    } else {
      await interaction.reply({ content: 'An error occurred while processing your request.', ephemeral: true });
    }
  }
});

// Handler Functions
async function handleCreateTicket(interaction) {
  const openCategoryName = 'Open Tickets';
  const openCategory = await findOrCreateCategory(interaction.guild, openCategoryName);

  // Extract description from the original embed message
  const description = interaction.message.embeds[0]?.data?.description || 'No description provided.';

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
    ephemeral: true
  });

  // Save ticket to database
  if (db.DB_TYPE === 'mongodb') {
    const MongoTicket = db.getMongoTicket();
    if (!MongoTicket) {
      logger.error('MongoTicket model is not initialized.');
      await interaction.reply({ content: 'Database error. Please try again later.', ephemeral: true });
      return;
    }
    const ticket = new MongoTicket({
      channelId: channel.id,
      creatorId: interaction.user.id,
      description: description,
    });
    await ticket.save();
  } else if (db.DB_TYPE === 'mysql' || db.DB_TYPE === 'sqlite') {
    const SequelizeTicket = db.getSequelizeTicket();
    if (!SequelizeTicket) {
      logger.error('SequelizeTicket model is not initialized.');
      await interaction.reply({ content: 'Database error. Please try again later.', ephemeral: true });
      return;
    }
    await SequelizeTicket.create({
      channelId: channel.id,
      creatorId: interaction.user.id,
      description: description,
    });
  }

  await interaction.reply({ 
    content: `Ticket created! <#${channel.id}>`, 
    ephemeral: true
  });
}

async function handleCloseTicket(interaction) {
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

async function handleConfirmArchive(interaction) {
  const channel = interaction.channel;
  const guild = interaction.guild;

  const archivedCategoryName = 'Archived Tickets';
  const archivedCategory = await findOrCreateCategory(guild, archivedCategoryName);

  // Rename the channel from 'ticket-username' to 'archived-username'
  if (channel.name.startsWith('ticket-')) {
    const newName = channel.name.replace(/^ticket-/i, 'archived-');
    await channel.setName(newName);
    logger.info(`Channel renamed to ${newName}`);
  } else {
    logger.warn(`Channel ${channel.id} does not start with 'ticket-'. Skipping rename.`);
  }

  // Move the channel to the "Archived Tickets" category
  await channel.setParent(archivedCategory.id);
  logger.info(`Channel moved to category "${archivedCategoryName}"`);

  // Remove @everyone permission to view the channel
  await channel.permissionOverwrites.edit(guild.id, { ViewChannel: false });
  logger.info(`Removed @everyone's ViewChannel permission for ${channel.name}`);

  // Update ticket status in database
  if (db.DB_TYPE === 'mongodb') {
    const MongoTicket = db.getMongoTicket();
    if (!MongoTicket) {
      logger.error('MongoTicket model is not initialized.');
      await interaction.reply({ content: 'Database error. Please try again later.', ephemeral: true });
      return;
    }
    await MongoTicket.findOneAndUpdate(
      { channelId: channel.id },
      { status: 'archived' }
    );
    logger.info(`Ticket ${channel.id} status updated to 'archived' in MongoDB`);
  } else if (db.DB_TYPE === 'mysql' || db.DB_TYPE === 'sqlite') {
    const SequelizeTicket = db.getSequelizeTicket();
    if (!SequelizeTicket) {
      logger.error('SequelizeTicket model is not initialized.');
      await interaction.reply({ content: 'Database error. Please try again later.', ephemeral: true });
      return;
    }
    const [updated] = await SequelizeTicket.update(
      { status: 'archived' },
      { where: { channelId: channel.id } }
    );
    if (updated) {
      logger.info(`Ticket ${channel.id} status updated to 'archived' in Sequelize`);
    } else {
      logger.warn(`No ticket found with channelId: ${channel.id} to update`);
    }
  }

  // Acknowledge the interaction
  await interaction.reply({
    content: 'Ticket has been archived.',
    ephemeral: true,
  });
}

async function handleConfirmDelete(interaction) {
  const channel = interaction.channel;

  // Acknowledge the interaction before deleting the channel
  await interaction.reply({
    content: 'Ticket has been deleted.',
    ephemeral: true,
  });

  // Delete ticket from database
  if (db.DB_TYPE === 'mongodb') {
    const MongoTicket = db.getMongoTicket();
    if (!MongoTicket) {
      logger.error('MongoTicket model is not initialized.');
      return;
    }
    await MongoTicket.findOneAndDelete({ channelId: channel.id });
    logger.info(`Ticket ${channel.id} deleted from MongoDB`);
  } else if (db.DB_TYPE === 'mysql' || db.DB_TYPE === 'sqlite') {
    const SequelizeTicket = db.getSequelizeTicket();
    if (!SequelizeTicket) {
      logger.error('SequelizeTicket model is not initialized.');
      return;
    }
    const deleted = await SequelizeTicket.destroy({ where: { channelId: channel.id } });
    if (deleted) {
      logger.info(`Ticket ${channel.id} deleted from Sequelize`);
    } else {
      logger.warn(`No ticket found with channelId: ${channel.id} to delete`);
    }
  }

  // Delete the channel after replying
  await channel.delete('Ticket deleted by user.');
}

// Connect to the database and login the bot
db.connectDB().then(() => {
  client.login(process.env.TOKEN);
}).catch(error => {
  logger.error('Failed to connect to the database:', error);
});