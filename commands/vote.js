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
  scheduleInXSeconds,
  scheduleTask,
} = require('../scheduler');

const data = new SlashCommandBuilder()
  .setName('vote')
  .setDescription('Pick your execution')
  .addUserOption((option) =>
    option
      .setName('player')
      .setDescription('The player who you want to execute today')
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
      content: `It's not time for you to make a vote!`,
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
  const pickChannel = await interaction.guild.channels.fetch(
    gameChannels['picks'].channelId,
  );
  const genChannel = await interaction.guild.channels.fetch(
    gameChannels['general'].channelId,
  );

  gameState.dayVotes[gameState.dayIndex][playerIndex] = targetUser;

  await gameInfo.set('gameState', gameState);

  const voterChats =
    (await chatCounts.get(
      `talkCount:${gameState.guildId}:${interaction.user.id}`,
    )) ?? 0;
  const votedChats =
    (await chatCounts.get(`talkCount:${gameState.guildId}:${targetUser}`)) ?? 0;

  await pickChannel.send(
    standardEmbed(
      'A vote has been made!',
      `**<@${interaction.user.id}> (${voterChats}) voted to execute <@${targetUser}> (${votedChats}) !**`,
    ),
  );
  await genChannel.send(
    standardEmbed(
      'A vote has been made!',
      `**<@${interaction.user.id}> (${voterChats}) voted to execute <@${targetUser}> (${votedChats}) !**`,
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
    gameState.dayVotes[gameState.dayIndex].filter((e) => e === targetUser)
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
    gameState.dayExecuted.push(targetUser);

    await gameInfo.set('gameState', gameState);

    await killPlayer(interaction.client, targetUser);

    gameState = await gameInfo.get('gameState');

    const leftAlive = gameState.players.filter((e) => e.alive).length;
    const mafiaAlive = gameState.players.filter(
      (e) => e.alive && e.team === 'Mafia',
    ).length;

    if (mafiaAlive < leftAlive / 2 && mafiaAlive > 0) {
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
      //const paragraphsChannel = await interaction.guild.channels.fetch(
      //  gameChannels['paragraphs'].channelId,
      //);

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
        //await paragraphsChannel.permissionOverwrites.edit(id, {
        //  [PermissionFlagsBits.SendMessages]: false,
        //});
      }
    }
  }
}

module.exports = {
  data,
  execute,
};
