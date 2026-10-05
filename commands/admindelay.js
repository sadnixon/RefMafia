'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { scheduleInXHours, clearTasks } = require('../scheduler');

const data = new SlashCommandBuilder()
  .setName('admindelay')
  .setDescription('Delay current phase')
  .addIntegerOption((option) =>
    option
      .setName('hours')
      .setDescription(
        'Set the amount of hours from now this phase should end at',
      )
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(100),
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

  const gameState = await gameInfo.get('gameState');
  const hours = interaction.options.getInteger('hours');

  await clearTasks();

  if (gameState.currentPhase === 'Night') {
    await scheduleInXHours('end_night', {}, hours);
  } else if (gameState.currentPhase === 'Day') {
    await scheduleInXHours('end_day', {}, hours);
  } else {
    await scheduleInXHours('end_supermaj', {}, hours);
  }

  await interaction.editReply({
    content: `The phase has been delayed!`,
    ephemeral: true,
  });
}

module.exports = {
  data,
  execute,
};
