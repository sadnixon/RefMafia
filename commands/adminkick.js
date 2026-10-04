'use strict';

const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

const { sendGameState } = require('../message-helpers');

const data = new SlashCommandBuilder()
  .setName('adminkick')
  .setDescription('Kick a player from the lobby')
  .addUserOption((option) =>
    option
      .setName('user')
      .setDescription('The user to kick, if you are an admin')
      .setRequired(true),
  );

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
    await interaction.editReply({
      content: 'The game is going, too late to kick!',
      ephemeral: true,
    });
    return;
  }

  const currentPlayers = await gameInfo.get('players');
  const targetUser = interaction.options.getUser('user');

  if (currentPlayers.includes(targetUser.id)) {
    await gameInfo.set(
      'players',
      currentPlayers.filter((x) => x !== targetUser.id),
    );

    await interaction.editReply({
      content: `You have kicked successfully!`,
      ephemeral: true,
    });
    await interaction.channel.send(
      `<@${targetUser.id}> has been kicked from the lobby! Player count is at ${currentPlayers.filter((x) => x !== targetUser.id).length}/17.`,
    );
  } else {
    await interaction.editReply({
      content: 'They are not in the lobby!',
      ephemeral: true,
    });
  }
}

module.exports = {
  data,
  execute,
};