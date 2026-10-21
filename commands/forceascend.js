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
  )
  .addStringOption((option) =>
    option
      .setName('reason')
      .setDescription('The reason for the kill')
      .setRequired(true),
  )
  .addIntegerOption((option) =>
    option
      .setName('order')
      .setDescription('The number kill that this player was')
      .setRequired(false),
  );

async function execute(interaction, user) {
  await interaction.deferReply({ ephemeral: true });
  if (!interaction.guildId) {
    return interaction.editReply({
      content: 'This command can only be used in a server.',
      ephemeral: true,
    });
  }
  if (!user.isAuthorized) {
    return interaction.editReply({
      content: 'ADMIN ONLY COMMAND',
      ephemeral: true,
    });
  }
  const gameOngoing = await gameInfo.get('inPlay');
  const currentPlayers = await gameInfo.get('players');
  const targetUser = interaction.options.getUser('user').id;

  if (!gameOngoing || !currentPlayers.includes(targetUser)) {
    await interaction.editReply({
      content: `What if YOU tried to send someone to HEAVEN but SadNixon said "NO"`,
      ephemeral: true,
    });
    return;
  }

  const reason = interaction.options.getString('reason');
  const order = interaction.options.getInteger('order') ?? null;

  await interaction.editReply({
    content: `They're getting ascended!`,
    ephemeral: true,
  });

  await killPlayer(
    interaction.client,
    targetUser,
    reason.toUpperCase(),
    order,
    false,
  );
}

module.exports = {
  data,
  execute,
};
