'use strict';

const {
  shuffleArray,
  sendGameState,
  sendVoteState,
  standardEmbed,
  endGame,
  randomNumber,
} = require('./message-helpers');
const {
  registerHandler,
  scheduleInXHours,
  scheduleTask,
  scheduleInXSeconds,
  clearTasks,
} = require('./scheduler');
const { clearMessages } = require('./talkstate');
const _ = require('lodash');

let client;

function initializeTaskHandlers(discordClient) {
  client = discordClient;

  registerHandler('end_supermaj', async (data) => {
    let gameState = await gameInfo.get('gameState');
    const guild = await client.guilds.fetch(gameState.guildId);
    const gameChannels = await gameInfo.get('game_channels');
    const pickChannel = await guild.channels.fetch(
      gameChannels['picks'].channelId,
    );
    const genChannel = await guild.channels.fetch(
      gameChannels['general'].channelId,
    );
    const currentPlayers = await gameInfo.get('players');

    let mostVotes = 0;
    let mostVotesPlayer;
    for (const player of [...currentPlayers, 'Sleep']) {
      const voteCount = gameState.dayVotes[gameState.dayIndex].filter(
        (e) => e === player,
      ).length;
      if (voteCount > mostVotes) {
        mostVotes = voteCount;
        mostVotesPlayer = player;
      }
    }

    const voteMaj =
      Math.floor(gameState.players.filter((e) => e.alive).length / 2) + 1;

    const itaTimer = gameState.phaseTimers[1]?.timeStamp ?? null;

    if (mostVotes >= voteMaj) {
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

      if (targetUser === 'Sleep') {
        const announceChannel = await guild.channels.fetch(
          gameChannels['announcements'].channelId,
        );

        await announceChannel.send(
          `${currentPlayers.map((e) => `<@${e}>`).join(' ')}\nNobody has been executed, everyone sleeps!`,
        );
      } else {
        await killPlayer(client, targetUser);
      }

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
        await sendGameState(client);
        await genChannel.send(
          standardEmbed('The night has fallen...', `Sleep tight, town.`),
        );

        const nongameChannel = await guild.channels.fetch(
          gameChannels['nongame'].channelId,
        );
        //const paragraphsChannel = await guild.channels.fetch(
        //  gameChannels['paragraphs'].channelId,
        //);

        console.log(currentPlayers);
        for (const id of currentPlayers) {
          console.log(id);
          const member = await guild.members.fetch(id).catch(() => null);
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
    } else {
      gameState.currentState = 'Day';
      await gameInfo.set('gameState', gameState);
      await clearTasks();
      await scheduleInXHours('end_day', {}, 6);
      if (gameState.itaActive) {
        await scheduleTask('deactivate_ita', {}, itaTimer);
      } else {
        await scheduleTask('activate_ita', {}, itaTimer);
      }
    }
  });

  registerHandler('end_day', async (data) => {
    const currentPlayers = await gameInfo.get('players');
    let gameState = await gameInfo.get('gameState');
    const guild = await client.guilds.fetch(gameState.guildId);
    const gameChannels = await gameInfo.get('game_channels');
    const pickChannel = await guild.channels.fetch(
      gameChannels['picks'].channelId,
    );
    const genChannel = await guild.channels.fetch(
      gameChannels['general'].channelId,
    );

    if (gameState.currentState === 'adminPaused') {
      await genChannel.send(
        standardEmbed(
          'TIMER IGNORED',
          "The vote timer has been ignored due to the game's paused state.",
        ),
      );
      return;
    }

    await clearTasks();

    let mostVotes = 0;
    let mostVotesPlayers = [];
    for (const player of [...currentPlayers, 'Sleep']) {
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
          `RNG will determine between ${mostVotesPlayers.map((e) => (e === 'Sleep' ? 'SLEEP' : `<@${e}>`)).join(', ')}.`,
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
    gameState.dayExecuted.push(targetUser);

    await gameInfo.set('gameState', gameState);

    if (targetUser === 'Sleep') {
      const announceChannel = await guild.channels.fetch(
        gameChannels['announcements'].channelId,
      );

      await announceChannel.send(
        `${currentPlayers.map((e) => `<@${e}>`).join(' ')}\nNobody has been executed, everyone sleeps!`,
      );
    } else {
      await killPlayer(client, targetUser);
    }

    gameState = await gameInfo.get('gameState');

    const leftAlive = gameState.players.filter((e) => e.alive).length;
    const mafiaAlive = gameState.players.filter(
      (e) => e.alive && e.team === 'Mafia',
    ).length;

    if (mafiaAlive < leftAlive / 2 && mafiaAlive > 0) {
      await scheduleInXHours('end_night', {}, 12);
      await sendGameState(client);
      await genChannel.send(
        standardEmbed('The night has fallen...', `Sleep tight, town.`),
      );

      const nongameChannel = await guild.channels.fetch(
        gameChannels['nongame'].channelId,
      );
      //const paragraphsChannel = await guild.channels.fetch(
      //  gameChannels['paragraphs'].channelId,
      //);

      console.log(currentPlayers);
      for (const id of currentPlayers) {
        console.log(id);
        const member = await guild.members.fetch(id).catch(() => null);
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
  });

  registerHandler('end_night', async (data) => {
    const currentPlayers = await gameInfo.get('players');
    let gameState = await gameInfo.get('gameState');
    const guild = await client.guilds.fetch(gameState.guildId);
    const gameChannels = await gameInfo.get('game_channels');
    const pickChannel = await guild.channels.fetch(
      gameChannels['picks'].channelId,
    );
    const genChannel = await guild.channels.fetch(
      gameChannels['general'].channelId,
    );
    const nongameChannel = await guild.channels.fetch(
      gameChannels['nongame'].channelId,
    );
    //const paragraphsChannel = await guild.channels.fetch(
    //  gameChannels['paragraphs'].channelId,
    //);

    if (gameState.currentState === 'adminPaused') {
      await genChannel.send(
        standardEmbed(
          'TIMER IGNORED',
          "The vote timer has been ignored due to the game's paused state.",
        ),
      );
      return;
    }

    await clearTasks();

    for (const id of gameState.players
      .filter((e) => e.alive)
      .map((e) => e.id)) {
      await clearMessages(id);
      console.log(id);
      const member = await guild.members.fetch(id).catch(() => null);
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
      //await paragraphsChannel.permissionOverwrites.edit(id, {
      //  [PermissionFlagsBits.SendMessages]: true,
      //});
    }

    gameState.currentState = 'DaySupermaj';
    gameState.dayIndex += 1;

    await gameInfo.set('gameState', gameState);

    await scheduleInXHours('end_supermaj', {}, 6);
    await scheduleInXHours('activate_ita', {}, 1);
    await sendGameState(client);
    await genChannel.send(
      `${currentPlayers.map((e) => `<@${e}>`).join(' ')}\nAwaken town, for the sun has risen!`,
    );
  });

  registerHandler('activate_ita', async (data) => {
    const gameState = await gameInfo.get('gameState');
    gameState.itaActive = true;
    gameState.phaseTimers = gameState.phaseTimers.slice(0, -1);
    await gameInfo.set('gameState', gameState);
    await scheduleInXHours('deactivate_ita', {}, 10);
  });

  registerHandler('deactivate_ita', async (data) => {
    const gameState = await gameInfo.get('gameState');
    gameState.itaActive = false;
    gameState.phaseTimers = gameState.phaseTimers.slice(0, -1);
    await gameInfo.set('gameState', gameState);
  });
}

module.exports = {
  initializeTaskHandlers,
};
