'use strict';

const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

const { killPlayer } = require('../message-helpers');

const data = new SlashCommandBuilder()
  .setName('adminsetplayerchat')
  .setDescription('Set a player chat amount')
  .addUserOption((option) =>
    option
      .setName('user')
      .setDescription('The user to set chats for')
      .setRequired(true),
  )
  .addIntegerOption((option) =>
    option
      .setName('number')
      .setDescription('The number to set the variable to')
      .setRequired(true)
      .setMinValue(0),
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
  const number = interaction.options.getInteger('number');

  if (!gameOngoing || !currentPlayers.includes(targetUser)) {
    await interaction.editReply({
      content: `What if YOU tried to FLIP someone but SadNixon said "NO"`,
      ephemeral: true,
    });
    return;
  }

  const key = `talkCount:${interaction.guild.id}:${targetUser}`;
  await chatCounts.set(key, number);

  await interaction.editReply({
    content: `Their chats have been set to ${number}!`,
    ephemeral: true,
  });
}

module.exports = {
  data,
  execute,
};
