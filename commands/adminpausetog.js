'use strict';

const { SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('adminpausetog')
  .setDescription('Pause or unpause a game');

async function execute(interaction, user) {
  await interaction.deferReply({ ephemeral: true });
  // Only authorized users can authorize other users
  if (!user.isAuthorized) {
    return interaction.editReply({
      content: 'ADMIN ONLY COMMAND',
      ephemeral: true,
    });
  }
  const gameOngoing = await gameInfo.get('inPlay');
  if (!gameOngoing) {
    return interaction.editReply({
      content: 'This command must be used during an ongoing game.',
      ephemeral: true,
    });
  }
  const gameState = await gameInfo.get('gameState');

  if (gameState.pausedState == null) {
    gameState.pausedState = gameState.currentState;
    gameState.currentState = 'adminPaused';
    await gameInfo.set('gameState', gameState);

    await interaction.editReply({
      content: `The game is now PAUSED.`,
      ephemeral: true,
    });
  } else {
    gameState.currentState = gameState.pausedState;
    gameState.pausedState = null;
    await gameInfo.set('gameState', gameState);

    await interaction.editReply({
      content: `The game is now UNPAUSED.`,
      ephemeral: true,
    });
  }
}

module.exports = {
  data,
  execute,
};
