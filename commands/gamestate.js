'use strict';

const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

const { sendGameState } = require('../message-helpers');

const data = new SlashCommandBuilder()
  .setName('gamestate')
  .setDescription('Check on the current game state');

async function execute(interaction, user) {
  await interaction.deferReply({ ephemeral: true });
  if (!interaction.guildId) {
    return interaction.editReply({
      content: 'This command can only be used in a server.',
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

  await interaction.editReply({
    content: "Here's the current game state!",
    ephemeral: true,
  });
  await sendGameState(interaction.client, 'current',false,'none',interaction);
}

module.exports = {
  data,
  execute,
};
