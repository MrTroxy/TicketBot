# TicketBot

A Discord ticket system bot built with Node.js and Discord.js, featuring modular commands, multiple database support, and organized channel categories for efficient ticket management.

## Features

- **Slash Commands:** Utilize Discord's native slash commands for seamless interactions.
- **Modular Command Structure:** Commands are organized into separate files for easy maintenance and scalability.
- **Database Support:** Choose between MongoDB, MySQL, or SQLite for data storage.
- **Ticket Management:**
  - Create new tickets with customizable descriptions.
  - Add or remove users from tickets.
  - Close tickets with options to archive or delete.
- **Channel Categories:** Automatically organizes tickets under "Open Tickets" and "Archived Tickets" categories.
- **Interactive Buttons:** Use buttons for creating and managing tickets, enhancing user experience.
- **Ephemeral and Public Messages:** Control the visibility of bot responses based on your preferences.

## Prerequisites

- **Node.js:** Version 16.9.0 or higher. [Download Node.js](https://nodejs.org/)
- **Discord Bot Token:** Create a Discord bot and obtain its token. [Discord Developer Portal](https://discord.com/developers/applications)
- **Database:**
  - **MongoDB:** [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) or a local MongoDB instance.
  - **MySQL:** A running MySQL server.
  - **SQLite:** No additional setup required; SQLite files are created automatically.

## Installation

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/MrTroxy/TicketBot.git
   cd TicketBot
   ```

2. **Install Dependencies:**

   ```bash
   npm install
   ```

3. **Create a .env file**

Copy the content of the ``.env.example`` file in your directory and add your configuration details.

   ```bash
   TOKEN=YOUR_BOT_TOKEN
   DB_TYPE=sqlite # 'mongodb', 'mysql', or 'sqlite'
   MONGO_URI=your_mongodb_uri
   MYSQL_HOST=localhost
   MYSQL_USER=root
   MYSQL_DB=database
   MYSQL_PASS=password
   ```

Replace the placeholders with your actual credentials. If using SQLite, the MySQL and MongoDB configurations can be left as is or removed.

## Configuration
**Database Options**
The bot supports three types of databases. Set the ``DB_TYPE`` in your ``.env`` file to select your preferred database.

1. **MongoDB:**

Install and set up MongoDB.
Provide your MongoDB URI in the ``MONGO_URI`` variable in the ``.env`` file.

2. **MySQL:**

Install and set up MySQL.
Provide your MySQL credentials in the ``.env`` file.

3. **SQLite:**

No additional setup required.
The bot will create a ``database.sqlite`` file in the project directory.

## Bot Permissions

**Ensure your bot has the following permissions in your Discord server:**

1. Manage Channels
2. Send Messages
3. Read Message History
4. Manage Permissions
5. View Channels
6. Use Slash Commands

## Usage

1. **Start the bot:**

   ```bash
   npm start
   ```

2. **Invite the Bot to Your Server:**

Use the OAuth2 URL Generator in the Discord Developer Portal to invite the bot with the necessary permissions.

3. **Use Slash Commands:**

``/new`` : Create a new ticket.
``/add`` : Add a user to the ticket.
``/remove`` : Remove a user from the ticket.

## Commands

``/new [description]``
Create a new ticket.
**Description**: (Optional) Custom description for the ticket embed.

**Example:**

   ```bash
   /new description: "Need help with account setup."
   ```

``/add [user]``
Add a user to the ticket.
**User**: The user to add to the ticket.

**Example:**

   ```bash
   /add user: @Username
   ```

``/remove [user]``
Remove a user from the ticket.
**User**: The user to remove from the ticket.

**Example:**

   ```bash
   /remove user: @Username
   ```

## Ticket Workflow
**Creating a Ticket:**

- Use the ``/new`` command to send an embed with a "Create Ticket" button.
- Click the "Create Ticket" button to create a new ticket channel under the "Open Tickets" category.
- A message in the ticket channel will include a "Close Ticket" button.

**Managing a Ticket:**

- *Close Ticket:*
    1. Click the "Close Ticket" button.
    2. Confirm by clicking "Archive" or "Delete".

- *Archive:*
Renames the channel to archived-username and moves it to the "Archived Tickets" category.

- *Delete:*
Permanently deletes the ticket channel.

Add/Remove Users:

Use ``/add`` to add users to the ticket.
Use ``/remove`` to remove users from the ticket.

## License
This project is licensed under the MIT License.