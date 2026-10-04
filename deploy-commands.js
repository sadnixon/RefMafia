'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  REST,
  Routes,
} = require('discord.js');

const {
  DISCORD_TOKEN,
  CLIENT_ID,
  GUILD_ID,
} = require('./env');

// -----------------------------------------------------------------------------
// Load commands
// -----------------------------------------------------------------------------

const commands = [];

const commandsPath = path.join(__dirname, 'commands');

const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  if (!command.data || typeof command.data.toJSON !== 'function') {
    console.warn(
      `Skipping invalid command file: ${file}`
    );
    continue;
  }

  commands.push(command.data.toJSON());

  console.log(
    `Loaded command: /${command.data.name}`
  );
}

// -----------------------------------------------------------------------------
// Deploy commands
// -----------------------------------------------------------------------------

const rest = new REST({
  version: '10',
}).setToken(DISCORD_TOKEN);

async function deployCommands() {
  try {
    console.log(
      `Started refreshing ${commands.length} application (/) commands.`
    );

    // -------------------------------------------------------------------------
    // Development
    //
    // If GUILD_ID is provided, deploy to that guild.
    // Guild commands update immediately.
    // -------------------------------------------------------------------------

    if (GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(
          CLIENT_ID,
          GUILD_ID
        ),
        {
          body: commands,
        }
      );

      console.log(
        `Successfully registered ${commands.length} guild command(s).`
      );

      return;
    }

    // -------------------------------------------------------------------------
    // Production
    //
    // Without GUILD_ID, deploy globally.
    // Global commands may take some time to propagate.
    // -------------------------------------------------------------------------

    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      {
        body: commands,
      }
    );

    console.log(
      `Successfully registered ${commands.length} global command(s).`
    );
  } catch (error) {
    console.error('Failed to deploy commands:', error);
    process.exitCode = 1;
  }
}

deployCommands();