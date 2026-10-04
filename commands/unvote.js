'use strict';

const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

const {
  standardEmbed,
  sendGameState,
  sendVoteState,
} = require('../message-helpers');
const { clearTasks, scheduleInXHours } = require('../scheduler');

const data = new SlashCommandBuilder()
  .setName('unvote')
  .setDescription('Unpick your execution');

async function execute(interaction, user) {
  await interaction.deferReply({ ephemeral: true });
  if (!interaction.guildId) {
    return interaction.editReply({
      content: 'This command can only be used in a server.',
      ephemeral: true,
    });
  }
  const gameOngoing = await gameInfo.get('inPlay');
  const gameState = await gameInfo.get('gameState');
  const currentPlayers = await gameInfo.get('players');
  const playerIndex =
    gameState?.players?.findIndex((e) => e.id === interaction.user.id) ?? -1;
  if (
    !gameOngoing ||
    !gameState.currentState === 'Day' ||
    !currentPlayers.includes(interaction.user.id) ||
    gameState.players[playerIndex].alive === false
  ) {
    return interaction.editReply({
      content: `It's not time for you to unvote!`,
      ephemeral: true,
    });
  }

  const gameChannels = await gameInfo.get('game_channels');
  const pickChannel = await interaction.guild.channels.fetch(
    gameChannels['picks'].channelId,
  );
  
  gameState.dayVotes[gameState.dayIndex][playerIndex] = null;

  await gameInfo.set('gameState', gameState);

  await pickChannel.send(
    standardEmbed(
      'A vote has been retracted!',
      `**<@${interaction.user.id}> has unvoted!**`,
    ),
  );
  await interaction.editReply({
    content: `You unvoted!`,
    ephemeral: true,
  });
  await sendVoteState(interaction.client);
}

module.exports = {
  data,
  execute,
};
