'use strict';

const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

const { sendVoteState } = require('../message-helpers');

const data = new SlashCommandBuilder()
  .setName('votestate')
  .setDescription('Check on how a day went')
  .addIntegerOption((option) =>
    option
      .setName('day')
      .setDescription('The number of the day you want to check on')
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(30),
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
  if (!gameOngoing) {
    return interaction.editReply({
      content: 'This command can only be used during an ongoing game.',
      ephemeral: true,
    });
  }

  const missionIndex = interaction.options.getInteger('day');
  await interaction.editReply({
    content: "Here's how that day went!",
    ephemeral: true,
  });
  await sendVoteState(
    interaction.client,
    'current',
    missionIndex ? missionIndex : -1,
    interaction,
  );
}

module.exports = {
  data,
  execute,
};
