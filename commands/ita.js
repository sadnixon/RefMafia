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
  const rolePool = await gameInfo.get('rolePool');
  if (
    !gameOngoing ||
    !gameState.itaActive ||
    gameState.dayIndex < 1 ||
    !currentPlayers.includes(interaction.user.id) ||
    gameState.players[playerIndex].alive === false ||
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
      content: `Whoa there! You can't kill them!`,
      ephemeral: true,
    });
  }

  const gameChannels = await gameInfo.get('game_channels');
  const genChannel = await interaction.guild.channels.fetch(
    gameChannels['general'].channelId,
  );

  const randomRoll = randomNumber(1, 100);
  const targetHit =
    randomRoll <= rolePool[gameState.players[playerIndex].role].itasuccess;
  const targetKilled =
    targetHit && gameState.players[targetIndex].shields === 0;

  gameState.dayITAs[gameState.dayIndex].push({
    id: interaction.user.id,
    target: targetUser,
    hit: targetHit,
    killed: targetKilled,
  });

  if (targetHit && gameState.players[targetIndex].shields > 0) {
    gameState.players[targetIndex].shields -= 1;
  }

  await gameInfo.set('gameState', gameState);

  await genChannel.send(
    standardEmbed(
      'An ITA has been made!',
      `<@${interaction.user.id}> used their ITA on <@${targetUser}>! **It ${targetKilled ? 'KILLED them dead!' : targetHit ? 'HIT, but no one died!' : 'absolutely WHIFFED!'}**`,
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
