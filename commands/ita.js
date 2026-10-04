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
  endGame,
  killPlayer,
  randomNumber,
} = require('../message-helpers');
const {
  clearTasks,
  scheduleInXHours,
  scheduleInXSeconds,
} = require('../scheduler');

const data = new SlashCommandBuilder()
  .setName('ita')
  .setDescription('Send your ITA for the day')
  .addUserOption((option) =>
    option
      .setName('player')
      .setDescription('The player who you want to ITA today')
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
  const gameState = await gameInfo.get('gameState');
  const currentPlayers = await gameInfo.get('players');
  const playerIndex =
    gameState?.players?.findIndex((e) => e.id === interaction.user.id) ?? -1;
  if (
    !gameOngoing ||
    !['DaySupermaj', 'Day'].includes(gameState.currentState) ||
    gameState.dayIndex === 0 ||
    !currentPlayers.includes(interaction.user.id) ||
    gameState.players[playerIndex].alive === false ||
    (gameState.currentState === 'Day' &&
      Date.now() >= gameState.phaseTimers[0].timeStamp - 60 * 60 * 1000) ||
    (gameState.currentState === 'DaySupermaj' &&
      Date.now() <= gameState.phaseTimers[0].timeStamp - 5 * 60 * 60 * 1000) ||
    gameState.dayITAs[gameState.dayIndex].filter(
      (e) => e.id === interaction.user.id,
    ).length >= rolePool[gameState.players[playerIndex].role].itanumber
  ) {
    return interaction.editReply({
      content: `It's not time for you to make an ITA!`,
      ephemeral: true,
    });
  }

  const targetUser = interaction.options.getUser(`player`).id;
  const targetIndex = gameState.players.map((e) => e.id).indexOf(targetUser);
  if (
    !currentPlayers.includes(targetUser) ||
    gameState.players[targetIndex].alive === false
  ) {
    return interaction.editReply({
      content: `Maronne! You can't kill them!`,
      ephemeral: true,
    });
  }

  const gameChannels = await gameInfo.get('game_channels');
  const genChannel = await interaction.guild.channels.fetch(
    gameChannels['general'].channelId,
  );

  const randomRoll = randomNumber(1, 100);
  const targetKilled =
    randomRoll <= rolePool[gameState.players[playerIndex].role].itasuccess;

  gameState.dayITAs[gameState.dayIndex].push({
    id: interaction.user.id,
    target: targetUser,
    killed: targetKilled,
  });

  await gameInfo.set('gameState', gameState);

  await genChannel.send(
    standardEmbed(
      'An ITA has been made!',
      `<@${interaction.user.id}> used their ITA on <@${targetUser}>! **It ${targetKilled ? 'KILLED them dead!' : 'absolutely WHIFFED!'}**`,
    ),
  );

  if (targetKilled) {
    await killPlayer(interaction.client, targetUser);
  }

  await interaction.editReply({
    content: `You made an ITA!`,
    ephemeral: true,
  });
}

module.exports = {
  data,
  execute,
};
