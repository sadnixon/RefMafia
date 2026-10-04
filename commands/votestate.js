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
      .addChoices(
        {
          name: 'Day 1',
          value: 1,
        },
        {
          name: 'Day 2',
          value: 2,
        },
        {
          name: 'Day 3',
          value: 3,
        },
        {
          name: 'Day 4',
          value: 4,
        },
        {
          name: 'Day 5',
          value: 5,
        },
        {
          name: 'Day 6',
          value: 6,
        },
        {
          name: 'Day 7',
          value: 7,
        },
         {
          name: 'Day 8',
          value: 8,
        },
        {
          name: 'Day 9',
          value: 9,
        },
        {
          name: 'Day 10',
          value: 10,
        },
        {
          name: 'Day 11',
          value: 11,
        },
        {
          name: 'Day 12',
          value: 12,
        },
        {
          name: 'Day 13',
          value: 13,
        },
        {
          name: 'Day 14',
          value: 14,
        },
        {
          name: 'Day 15',
          value: 15,
        },
      ),
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
  await sendVoteState(interaction.client, 'current', missionIndex ? missionIndex : -1, interaction);
}

module.exports = {
  data,
  execute,
};
