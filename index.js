'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  Partials,
  ActivityType,
} = require('discord.js');

const Keyv = require('keyv').default;
const KeyvMongo = require('@keyv/mongo').default;
const Sentry = require('@sentry/node');

const {
  ENABLE_DB,
  DISCORD_TOKEN,
  SENTRY_DSN,
  ENABLE_SENTRY,
  OWNER,
} = require('./env');

const { errorMessage } = require('./message-helpers');

const { startScheduler } = require('./scheduler');

const { initializeTaskHandlers } = require('./task-handlers');

const { countMessage, setTalkConfig } = require('./talkstate');

// -----------------------------------------------------------------------------
// Sentry
// -----------------------------------------------------------------------------

if (ENABLE_SENTRY) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 1.0,
  });
}

// -----------------------------------------------------------------------------
// Database
// -----------------------------------------------------------------------------

const mongoStore = new KeyvMongo('mongodb://localhost:27017/refmafia');

global.authorizedDataSetters = ENABLE_DB
  ? new Keyv({
      store: mongoStore,
      namespace: 'authorized_data_setter',
    })
  : new Keyv();

global.gameInfo = ENABLE_DB
  ? new Keyv({
      store: mongoStore,
      namespace: 'game_info',
    })
  : new Keyv();

global.chatCounts = ENABLE_DB
  ? new Keyv({
      store: mongoStore,
      namespace: 'chat_counts',
    })
  : new Keyv();

global.gameHistory = ENABLE_DB
  ? new Keyv({
      store: mongoStore,
      namespace: 'game_history',
    })
  : new Keyv();

global.schedDB = ENABLE_DB
  ? new Keyv({
      store: mongoStore,
      namespace: 'sched_db',
    })
  : new Keyv();

authorizedDataSetters.on('error', (error) => {
  console.error('Authorized data store error:', error);
  Sentry.captureException(error);
});

gameHistory.on('error', (error) => {
  console.error('Game history store error:', error);
  Sentry.captureException(error);
});

gameInfo.on('error', (error) => {
  console.error('Game info store error:', error);
  Sentry.captureException(error);
});

schedDB.on('error', (error) => {
  console.error('Sched DB store error:', error);
  Sentry.captureException(error);
});

// -----------------------------------------------------------------------------
// Discord client
// -----------------------------------------------------------------------------

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
  ],

  partials: [Partials.Channel],
});

// -----------------------------------------------------------------------------
// Commands
// -----------------------------------------------------------------------------

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');

const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  if (!command.data || typeof command.execute !== 'function') {
    console.warn(`Skipping invalid command file: ${file}`);
    continue;
  }

  const commandName = command.data.name;

  client.commands.set(commandName, command);

  console.log(`Loaded command: /${commandName}`);
}

// -----------------------------------------------------------------------------
// Initialize database
// -----------------------------------------------------------------------------

async function initializeData() {
  if (!(await authorizedDataSetters.has('auth'))) {
    await authorizedDataSetters.set('auth', []);
  }

  if (!(await gameInfo.has('game_channels'))) {
    await gameInfo.set('game_channels', {});
  }

  if (!(await gameInfo.has('players'))) {
    await gameInfo.set('players', []);
  }

  if (!(await gameInfo.has('sawRolePlayers'))) {
    await gameInfo.set('sawRolePlayers', []);
  }

  if (!(await gameInfo.has('player_channels'))) {
    await gameInfo.set('player_channels', {});
  }

  if (!(await gameInfo.has('gameState'))) {
    await gameInfo.set('gameState', {});
  }

  if (!(await gameInfo.has('rolePool'))) {
    await gameInfo.set('rolePool', {});
  }

  if (!(await gameInfo.has('inPlay'))) {
    await gameInfo.set('inPlay', false);
  }

  const gameOngoing = await gameInfo.get('inPlay');
  if (gameOngoing) {
    const gameState = await gameInfo.get('gameState');
    const gameChannels = await gameInfo.get('game_channels');
    setTalkConfig({
      channelId: gameChannels['general'].channelId,
      limit: gameState.chatLimit,
    });
  }
}

// -----------------------------------------------------------------------------
// Ready
// -----------------------------------------------------------------------------

client.once(Events.ClientReady, async (readyClient) => {
  try {
    await initializeData();

    readyClient.user.setActivity('/info', {
      type: ActivityType.Watching,
    });

    initializeTaskHandlers(client);

    await startScheduler();

    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
  } catch (error) {
    console.error('Failed to initialize bot:', error);
    Sentry.captureException(error);
  }
});

// -----------------------------------------------------------------------------
// Slash command interactions
// -----------------------------------------------------------------------------

client.on(Events.InteractionCreate, async (interaction) => {
  // Only handle slash commands
  if (!interaction.isChatInputCommand()) {
    return;
  }

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.warn(`Received unknown slash command: /${interaction.commandName}`);

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(
        errorMessage(`Unknown command: /${interaction.commandName}`),
      );
    } else {
      await interaction.reply(
        errorMessage(`Unknown command: /${interaction.commandName}`),
      );
    }

    return;
  }

  try {
    // -------------------------------------------------------------------------
    // Authorization
    // -------------------------------------------------------------------------

    const authorizedUsers = (await authorizedDataSetters.get('auth')) ?? [];

    const isOwner = interaction.user.id === OWNER;

    const isAuthorized =
      isOwner || authorizedUsers.includes(interaction.user.id);

    // -------------------------------------------------------------------------
    // User information passed to commands
    // -------------------------------------------------------------------------

    const user = {
      isAuthorized,
      isOwner,
    };

    // -------------------------------------------------------------------------
    // Execute command
    // -------------------------------------------------------------------------

    await command.execute(interaction, user);
  } catch (error) {
    console.error(`Error executing /${interaction.commandName}:`, error);

    Sentry.captureException(error);

    const response = errorMessage(
      `There was an error trying to execute \`/${interaction.commandName}\`.`,
    );

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(response);
      } else {
        await interaction.reply(response);
      }
    } catch (replyError) {
      console.error('Failed to send command error response:', replyError);

      Sentry.captureException(replyError);
    }
  }
});

client.on(Events.MessageCreate, async (message) => {
  await countMessage(message);
});

// -----------------------------------------------------------------------------
// Process-level error handling
// -----------------------------------------------------------------------------

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
  Sentry.captureException(error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  Sentry.captureException(error);
});

// -----------------------------------------------------------------------------
// Login
// -----------------------------------------------------------------------------

client.login(DISCORD_TOKEN);
