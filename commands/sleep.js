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
} = require('../message-helpers');
const {
  clearTasks,
  scheduleInXHours,
  scheduleTask,
  scheduleInXSeconds,
} = require('../scheduler');

const data = new SlashCommandBuilder()
  .setName('sleep')
  .setDescription('Pick to sleep without executing');

async function execute(interaction, user) {
  await interaction.deferReply({ ephemeral: true });
  if (!interaction.guildId) {
    return interaction.editReply({
      content: 'This command can only be used in a server.',
      ephemeral: true,
    });
  }
  const gameOngoing = await gameInfo.get('inPlay');
  let gameState = await gameInfo.get('gameState');
  const currentPlayers = await gameInfo.get('players');
  const playerIndex =
    gameState?.players?.findIndex((e) => e.id === interaction.user.id) ?? -1;
  if (
    !gameOngoing ||
    !['DaySupermaj', 'Day'].includes(gameState.currentState) ||
    !currentPlayers.includes(interaction.user.id) ||
    gameState.players[playerIndex].alive === false
  ) {
    return interaction.editReply({
      content: `It's not time for you to vote to sleep!`,
      ephemeral: true,
    });
  }

  const gameChannels = await gameInfo.get('game_channels');
  const pickChannel = await interaction.guild.channels.fetch(
    gameChannels['picks'].channelId,
  );
  const genChannel = await interaction.guild.channels.fetch(
    gameChannels['general'].channelId,
  );

  gameState.dayVotes[gameState.dayIndex][playerIndex] = 'Sleep';

  await gameInfo.set('gameState', gameState);

  const voterChats =
    (await chatCounts.get(
      `talkCount:${gameState.guildId}:${interaction.user.id}`,
    )) ?? 0;

  await pickChannel.send(
    standardEmbed(
      'A vote has been made!',
      `**<@${interaction.user.id}> (${voterChats}) voted to go to sleep without executing!**`,
    ),
  );
  await genChannel.send(
    standardEmbed(
      'A vote has been made!',
      `**<@${interaction.user.id}> (${voterChats}) is eepy and voted to sleeby!**`,
    ),
  );
  await interaction.editReply({
    content: `You made a vote!`,
    ephemeral: true,
  });
  await sendVoteState(interaction.client);

  const voteMaj =
    gameState.currentState === 'Day'
      ? Math.floor(gameState.players.filter((e) => e.alive).length / 2) + 1
      : Math.ceil((gameState.players.filter((e) => e.alive).length * 2) / 3);

  if (
    gameState.dayVotes[gameState.dayIndex].filter((e) => e === 'Sleep')
      .length >= voteMaj
  ) {
    const itaTimer = gameState.phaseTimers[1]?.timeStamp ?? null;
    await clearTasks();
    gameState = await gameInfo.get('gameState');
    gameState.currentState = 'Night';

    let cDayChats = {};

    for (const id of gameState.players.map((e) => e.id)) {
      cDayChats[id] =
        (await chatCounts.get(`talkCount:${gameState.guildId}:${id}`)) ?? 0;
    }
    gameState.dayChats[gameState.dayIndex] = cDayChats;
    gameState.dayExecuted.push('Sleep');

    await gameInfo.set('gameState', gameState);

    const announceChannel = await interaction.guild.channels.fetch(
      gameChannels['announcements'].channelId,
    );

    await announceChannel.send(
      `${currentPlayers.map((e) => `<@${e}>`).join(' ')}\nNobody has been executed, everyone sleeps!`,
    );

    await scheduleInXHours('end_night', {}, 12);
    if (gameState.itaActive && itaTimer != null) {
      await scheduleTask('deactivate_ita', {}, itaTimer);
    } else if (itaTimer != null) {
      await scheduleTask('activate_ita', {}, itaTimer);
    }
    await sendGameState(interaction.client);
    await genChannel.send(
      standardEmbed('The night has fallen...', `Sleep tight, town.`),
    );

    const nongameChannel = await interaction.guild.channels.fetch(
      gameChannels['nongame'].channelId,
    );
    const paragraphsChannel = await interaction.guild.channels.fetch(
      gameChannels['paragraphs'].channelId,
    );

    console.log(currentPlayers);
    for (const id of currentPlayers) {
      console.log(id);
      const member = await interaction.guild.members
        .fetch(id)
        .catch(() => null);
      console.log(id, member ? 'found' : 'NOT IN GUILD');
      if (!member) continue;
      await genChannel.permissionOverwrites.edit(id, {
        [PermissionFlagsBits.SendMessages]: false,
      });
      await nongameChannel.permissionOverwrites.edit(id, {
        [PermissionFlagsBits.SendMessages]: false,
      });
      await pickChannel.permissionOverwrites.edit(id, {
        [PermissionFlagsBits.SendMessages]: false,
      });
      await paragraphsChannel.permissionOverwrites.edit(id, {
        [PermissionFlagsBits.SendMessages]: false,
      });
    }
  }
}

module.exports = {
  data,
  execute,
};
