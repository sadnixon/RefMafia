'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { getTalkConfig, setTalkConfig } = require('../talkstate');

const data = new SlashCommandBuilder()
  .setName('adminsetchatlim')
  .setDescription('Set the chat limit to something')
  .addIntegerOption((option) =>
    option
      .setName('number')
      .setDescription('The number to set the variable to')
      .setRequired(true)
      .setMinValue(0),
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

  const number = interaction.options.getInteger('number');

  const gameState = await gameInfo.get('gameState');

  gameState.chatLimit = number;
  await gameInfo.set('gameState', gameState);

  const talkConfig = getTalkConfig();
  setTalkConfig({
    channelId: talkConfig.channelId,
    limit: number,
  });

  await interaction.editReply({
    content: `The Chat Limit is now ${number}.`,
    ephemeral: true,
  });
}

module.exports = {
  data,
  execute,
};
