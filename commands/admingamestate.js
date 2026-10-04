'use strict';

const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

const { sendGameState } = require('../message-helpers');

const data = new SlashCommandBuilder()
  .setName('admingamestate')
  .setDescription('Check on the current game state with roles revealed');

async function execute(interaction, user) {
  await interaction.deferReply({ ephemeral: true });
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

  await interaction.editReply({
    content: "Here's the current game state!",
    ephemeral: true,
  });
  const gameState = await gameInfo.get('gameState');
  const timers = await schedDB.get('scheduled_tasks');
  console.log(gameState);
  console.log(timers);
  await sendGameState(interaction.client, 'current', true, 'none', interaction);
  for (const taskId of timers) {
    const task = await schedDB.get(`scheduled_task:${taskId}`);

    if (!task) {
      console.log(`${taskId} NOT FOUND`);
      continue;
    } else {
      console.log(task);
    }
  }
}

module.exports = {
  data,
  execute,
};
