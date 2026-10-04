'use strict';

const { SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('adminsetstate')
  .setDescription('Set the game phase to something')
  .addStringOption((option) =>
    option.setName('phase').setDescription('Phase type').setRequired(true),
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

  const gameOngoing = await gameInfo.get('inPlay');
  if (!gameOngoing) {
    return interaction.editReply({
      content: 'This command can only be used during an ongoing game.',
      ephemeral: true,
    });
  }

  const phaseType = interaction.options.getString('phase');

  const gameState = await gameInfo.get('gameState');
  gameState.currentState = phaseType;
  await gameInfo.set('gameState', gameState);

  await interaction.editReply({
    content: `The currentState is now ${phaseType.toUpperCase()}.`,
    ephemeral: true,
  });
}

module.exports = {
  data,
  execute,
};
