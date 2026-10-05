'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { scheduleInXHours, clearTasks } = require('../scheduler');
const {
  shuffleArray,
  sendGameState,
  standardEmbed,
} = require('../message-helpers');
const {
  scheduleInXHours,
  clearTasks,
} = require('../scheduler');

const data = new SlashCommandBuilder()
  .setName('adminfastforward')
  .setDescription('Fastforward through current phase');

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

  let gameState = await gameInfo.get('gameState');
  const currentPlayers = await gameInfo.get('players');
  const gameChannels = await gameInfo.get('game_channels');
  const pickChannel = await interaction.guild.channels.fetch(
    gameChannels['picks'].channelId,
  );
  const genChannel = await interaction.guild.channels.fetch(
    gameChannels['general'].channelId,
  );
  const nongameChannel = await interaction.guild.channels.fetch(
    gameChannels['nongame'].channelId,
  );
  const paragraphsChannel = await interaction.guild.channels.fetch(
    gameChannels['paragraphs'].channelId,
  );

  if (gameState.currentPhase === 'Night') {
    await clearTasks();

    for (const id of gameState.players
      .filter((e) => e.alive)
      .map((e) => e.id)) {
      await clearMessages(id);
      console.log(id);
      const member = await interaction.guild.members
        .fetch(id)
        .catch(() => null);
      console.log(id, member ? 'found' : 'NOT IN GUILD');
      if (!member) continue;
      await genChannel.permissionOverwrites.edit(id, {
        [PermissionFlagsBits.SendMessages]: true,
      });
      await nongameChannel.permissionOverwrites.edit(id, {
        [PermissionFlagsBits.SendMessages]: true,
      });
      await pickChannel.permissionOverwrites.edit(id, {
        [PermissionFlagsBits.SendMessages]: true,
      });
      await paragraphsChannel.permissionOverwrites.edit(id, {
        [PermissionFlagsBits.SendMessages]: true,
      });
    }

    gameState.currentState = 'DaySupermaj';
    gameState.dayIndex += 1;

    await gameInfo.set('gameState', gameState);

    await scheduleInXHours('end_supermaj', {}, 6);
    await sendGameState(interaction.client);
    await genChannel.send(
      `${currentPlayers.map((e) => `<@${e}>`).join(' ')}\nAwaken town, for the sun has risen!`,
    );
  } else {
    await clearTasks();

    let mostVotes = 0;
    let mostVotesPlayers = [];
    for (const player of currentPlayers) {
      const voteCount = gameState.dayVotes[gameState.dayIndex].filter(
        (e) => e === player,
      ).length;
      if (voteCount > mostVotes) {
        mostVotes = voteCount;
        mostVotesPlayers = [player];
      } else if (voteCount === mostVotes) {
        mostVotesPlayers.push(player);
      }
    }

    if (mostVotesPlayers.length > 1) {
      await pickChannel.send(
        standardEmbed(
          'There is a tie in execution votes!',
          `RNG will determine the executed player between ${mostVotesPlayers.map((e) => `<@${e.id}>`).join(', ')}.`,
        ),
      );
    }
    const targetUser = shuffleArray(mostVotesPlayers)[0];

    gameState = await gameInfo.get('gameState');
    gameState.currentState = 'Night';

    let cDayChats = {};

    for (const id of gameState.players.map((e) => e.id)) {
      cDayChats[id] =
        (await chatCounts.get(`talkCount:${gameState.guildId}:${id}`)) ?? 0;
    }
    gameState.dayChats[gameState.dayIndex] = cDayChats;

    await gameInfo.set('gameState', gameState);

    await killPlayer(interaction.client, targetUser);

    gameState = await gameInfo.get('gameState');

    const leftAlive = gameState.players.filter((e) => e.alive).length;
    const mafiaAlive = gameState.players.filter(
      (e) => e.alive && e.team === 'Mafia',
    ).length;

    if (mafiaAlive < leftAlive / 2 && mafiaAlive > 0) {
      await scheduleInXHours('end_night', {}, 12);
      await sendGameState(interaction.client);
      await genChannel.send(
        standardEmbed('The night has fallen...', `Sleep tight, town.`),
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

  await interaction.editReply({
    content: `The phase has been fast forwarded!`,
    ephemeral: true,
  });
}

module.exports = {
  data,
  execute,
};
