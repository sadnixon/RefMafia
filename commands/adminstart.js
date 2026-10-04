'use strict';

const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

const { startGame } = require('../message-helpers');

const data = new SlashCommandBuilder()
  .setName('adminstart')
  .setDescription('Force start the game');

async function execute(interaction, user) {
  await interaction.deferReply({ ephemeral: true });
  if (!user.isAuthorized) {
    return interaction.editReply({
      content: 'ADMIN ONLY COMMAND',
      ephemeral: true,
    });
  }

  const gameOngoing = await gameInfo.get('inPlay');
  if (gameOngoing) {
    return interaction.editReply({
      content: 'This command cannot be used during an ongoing game.',
      ephemeral: true,
    });
  }
  
  await startGame(interaction);
  await interaction.editReply({
    content: 'We starting!',
    ephemeral: true,
  });
}

module.exports = {
  data,
  execute,
};
