'use strict';

const { SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('adminvoid')
  .setDescription('Fully void a game')
  .addStringOption((option) =>
    option
      .setName('type')
      .setDescription('Void type')
      .setRequired(true)
      .addChoices(
        {
          name: 'Timers',
          value: 'timers',
        },
        {
          name: 'Current Game',
          value: 'game',
        },
        {
          name: 'Player Channels',
          value: 'channels',
        },
        {
          name: 'Game Channels',
          value: 'admin_channels',
        },
        {
          name: 'Signups',
          value: 'signups',
        },
        {
          name: 'Back To Ready',
          value: 'back',
        },
        {
          name: 'Special',
          value: 'special',
        },
      ),
  );

async function execute(interaction, user) {
  await interaction.deferReply({ ephemeral: true });
  // Only authorized users can authorize other users
  if (!user.isAuthorized) {
    return interaction.editReply({
      content: 'ADMIN ONLY COMMAND',
      ephemeral: true,
    });
  }

  const voidType = interaction.options.getString('type');

  if (voidType === 'game') {
    await gameInfo.set('gameState', {});
    await gameInfo.set('players', []);
    await gameInfo.set('sawRolePlayers', []);
    await gameInfo.set('inPlay', false);
    await schedDB.clear();
  } else if (voidType === 'channels') {
    await gameInfo.set('player_channels', {});
  } else if (voidType === 'game_channels') {
    await gameInfo.set('game_channels', {});
  } else if (voidType === 'signups') {
    await gameInfo.set('players', []);
    await gameInfo.set('sawRolePlayers', []);
    await gameInfo.set('inPlay', false);
  } else if (voidType === 'back') {
    await gameInfo.set('gameState', {});
    await gameInfo.set('sawRolePlayers', []);
    await gameInfo.set('inPlay', false);
    await schedDB.clear();
  } else if (voidType === 'timers') {
    await schedDB.clear();
    const gameState = await gameInfo.get('gameState');
    gameState.phaseTimers = [];
    await gameInfo.set('gameState', gameState);
  } else if (voidType === 'special') {
    const gameState = await gameInfo.get('gameState');
    gameState.dayChats = [
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
    ];
    await gameInfo.set('gameState', gameState);
  }

  await interaction.editReply({
    content: `${voidType.toUpperCase()} is now VOIDED.`,
    ephemeral: true,
  });
}

module.exports = {
  data,
  execute,
};
