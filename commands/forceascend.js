'use strict';

const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

const { killPlayer } = require('../message-helpers');

const data = new SlashCommandBuilder()
  .setName('forceascend')
  .setDescription('Force a player to Ascend')
  .addUserOption((option) =>
    option
      .setName('user')
      .setDescription('The user to ascend')
      .setRequired(true),
  );

async function execute(interaction, user) {
  await interaction.deferReply({ ephemeral: true });
  if (!interaction.guildId) {
    return interaction.editReply({
      content: 'This command can only be used in a server.',
      ephemeral: true,
    });
  }
  const gameOngoing = await gameInfo.get('inPlay');
  const currentPlayers = await gameInfo.get('players');
  const gameState = await gameInfo.get('gameState');
  const targetUser = interaction.options.getUser('user').id;

  if (!gameOngoing || !currentPlayers.includes(targetUser)) {
    await interaction.editReply({
      content: `What if YOU tried to send someone to HEAVEN but SadNixon said "NO"`,
      ephemeral: true,
    });
    return;
  }

  await interaction.editReply({
    content: `They're getting ascended!`,
    ephemeral: true,
  });

  await killPlayer(interaction.client, targetUser);
}

module.exports = {
  data,
  execute,
};
