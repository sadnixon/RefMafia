const {
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');
const _ = require('lodash');
const { clearTasks, scheduleInXHours, cancelTask } = require('./scheduler');
const { setTalkConfig, clearMessages } = require('./talkstate');
const { generateCombination } = require('gfycat-style-urls');
const { kill } = require('node:process');

const errorMessage = (message) => {
  return {
    embeds: [new EmbedBuilder().setDescription(message).setColor('#ff0000')],
  };
};

const colorMap = {
  Town: '#0087d6',
  town: '#0087d6',
  Mafia: '#fc4141',
  mafia: '#fc4141',
  Neutral: '#7f7f7f',
};

const standardEmbed = (header, message, team = 'Neutral') => {
  return {
    embeds: [
      new EmbedBuilder()
        .setTitle(header)
        .setDescription(message)
        .setColor(colorMap[team]),
    ],
  };
};

async function startGame(interaction) {
  await gameInfo.set('inPlay', true);
  const players = await gameInfo.get('players');
  const player_num = players.length;
  const rolePool = await gameInfo.get('rolePool');
  if (player_num !== Object.keys(rolePool).length) {
    return interaction.channel.send(
      `Game cannot start, the amount of roles and the amount of players does not match.`,
    );
  }
  const roles = Object.keys(rolePool); //TODO IMPLEMENT ROLES LISTS

  const gameChannels = await gameInfo.get('game_channels');
  const playerChannels = await gameInfo.get('player_channels');

  const shuffledRoles = shuffleArray(roles);
  const shuffledPlayers = shuffleArray(players);

  const knownSpies = shuffledPlayers.filter(
    (e, i) =>
      rolePool[shuffledRoles[i]].team === 'Mafia' &&
      rolePool[shuffledRoles[i]].nonpack === false,
  );

  let genChannel;
  let picksChannel;
  let paragraphsChannel;
  //let loversChannel;
  let spiesChannel;
  let heavenChannel;
  let announceChannel;
  let nongameChannel;

  try {
    genChannel = await interaction.guild.channels.fetch(
      gameChannels['general'].channelId,
    );
    picksChannel = await interaction.guild.channels.fetch(
      gameChannels['picks'].channelId,
    );
    paragraphsChannel = await interaction.guild.channels.fetch(
      gameChannels['paragraphs'].channelId,
    );
    //loversChannel = await interaction.guild.channels.fetch(
    //  gameChannels['lovers'].channelId,
    //);
    spiesChannel = await interaction.guild.channels.fetch(
      gameChannels['spies'].channelId,
    );
    heavenChannel = await interaction.guild.channels.fetch(
      gameChannels['heaven'].channelId,
    );
    announceChannel = await interaction.guild.channels.fetch(
      gameChannels['announcements'].channelId,
    );
    nongameChannel = await interaction.guild.channels.fetch(
      gameChannels['nongame'].channelId,
    );
  } catch (error) {
    console.error('Failed to get all channels:', error);
    process.exitCode = 1;
    return interaction.channel.send(
      'Game cannot start, some of the required game channels are missing!',
    );
  }

  for (const channel of [
    genChannel,
    picksChannel,
    paragraphsChannel,
    nongameChannel,
  ]) {
    await channel.permissionOverwrites.set([
      {
        id: interaction.guild.roles.everyone.id,
        deny: [PermissionFlagsBits.SendMessages],
      },
      {
        id: interaction.guild.members.me.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageChannels,
        ],
      },
    ]);
  }

  for (const channel of [spiesChannel]) {
    await channel.permissionOverwrites.set([
      {
        id: interaction.guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: interaction.guild.members.me.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageChannels,
        ],
      },
    ]);
  }

  await heavenChannel.permissionOverwrites.set([
    {
      id: interaction.guild.roles.everyone.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.ReadMessageHistory,
      ],
      deny: [PermissionFlagsBits.SendMessages],
    },
    {
      id: interaction.guild.members.me.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageChannels,
      ],
    },
  ]);

  for (let i = 0; i < player_num; i++) {
    if (
      !_.range(0, 13)
        .map((e) => `${e * 100}`)
        .includes(shuffledPlayers[i])
    ) {
      console.log(shuffledPlayers[i]);
      const member = await interaction.guild.members
        .fetch(shuffledPlayers[i])
        .catch(() => null);
      console.log(shuffledPlayers[i], member ? 'found' : 'NOT IN GUILD');

      await genChannel.permissionOverwrites.edit(shuffledPlayers[i], {
        [PermissionFlagsBits.ViewChannel]: true,
        [PermissionFlagsBits.SendMessages]: false,
        [PermissionFlagsBits.ReadMessageHistory]: true,
      });
      await picksChannel.permissionOverwrites.edit(shuffledPlayers[i], {
        [PermissionFlagsBits.ViewChannel]: true,
        [PermissionFlagsBits.SendMessages]: false,
        [PermissionFlagsBits.ReadMessageHistory]: true,
      });
      await paragraphsChannel.permissionOverwrites.edit(shuffledPlayers[i], {
        [PermissionFlagsBits.ViewChannel]: true,
        [PermissionFlagsBits.SendMessages]: false,
        [PermissionFlagsBits.ReadMessageHistory]: true,
      });
      await nongameChannel.permissionOverwrites.edit(shuffledPlayers[i], {
        [PermissionFlagsBits.ViewChannel]: true,
        [PermissionFlagsBits.SendMessages]: true,
        [PermissionFlagsBits.ReadMessageHistory]: true,
      });
      await heavenChannel.permissionOverwrites.edit(shuffledPlayers[i], {
        [PermissionFlagsBits.ViewChannel]: false,
        [PermissionFlagsBits.SendMessages]: false,
        [PermissionFlagsBits.ReadMessageHistory]: false,
      });
    }
    let playerChannel;
    try {
      playerChannel = await interaction.guild.channels.fetch(
        playerChannels[shuffledPlayers[i]].channelId,
      );
    } catch (error) {
      console.error('Failed to get all channels:', error);
      process.exitCode = 1;
      return interaction.channel.send(
        `Game cannot start, the required game channel from <${shuffledPlayers[i]}> is missing!`,
      );
    }

    await playerChannel.send(
      `**<@${shuffledPlayers[i]}>, you are ${shuffledRoles[i]}!**\n\nUse /ack to acknowledge that you have viewed your role and gain access to the public chats.`,
    );
    if (knownSpies.includes(shuffledPlayers[i])) {
      if (
        !_.range(0, 13)
          .map((e) => `${e * 100}`)
          .includes(shuffledPlayers[i])
      ) {
        console.log(shuffledPlayers[i]);
        const member = await interaction.guild.members
          .fetch(shuffledPlayers[i])
          .catch(() => null);
        console.log(shuffledPlayers[i], member ? 'found' : 'NOT IN GUILD');
        await spiesChannel.permissionOverwrites.edit(shuffledPlayers[i], {
          [PermissionFlagsBits.ViewChannel]: true,
          [PermissionFlagsBits.SendMessages]: true,
          [PermissionFlagsBits.ReadMessageHistory]: true,
        });
      }

      await playerChannel.send(
        standardEmbed(
          'La Cosa Nostra stands assembled:',
          `${knownSpies.map((e) => `<@${e}>`).join(', ')}`,
          'Mafia',
        ),
      );
    }
  }

  let uid = generateCombination(3, '', true);
  while (true) {
    const foundGame = await gameHistory.get(uid);
    if (foundGame) uid = generateCombination(3, '', true);
    else break;
  }

  const startState = {
    startTime: Date.now(),
    endTime: null,
    gameId: uid,
    guildId: interaction.guildId,
    players: _.range(0, player_num).map((i) => ({
      id: shuffledPlayers[i],
      role: shuffledRoles[i],
      team: rolePool[shuffledRoles[i]].team,
      alive: true,
      flipped: false,
    })),
    dayVotes: [
      Array(player_num).fill(null),
      Array(player_num).fill(null),
      Array(player_num).fill(null),
      Array(player_num).fill(null),
      Array(player_num).fill(null),
      Array(player_num).fill(null),
      Array(player_num).fill(null),
      Array(player_num).fill(null),
      Array(player_num).fill(null),
      Array(player_num).fill(null),
      Array(player_num).fill(null),
      Array(player_num).fill(null),
      Array(player_num).fill(null),
      Array(player_num).fill(null),
      Array(player_num).fill(null),
    ],
    dayExecuted: [],
    dayITAs: [[], [], [], [], [], [], [], [], [], [], [], [], [], [], []],
    itaActive: false,
    dayChats: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}],
    chatLimit: 1000,
    currentState: 'DaySupermaj',
    dayIndex: 0,
    phaseTimers: [],
    pausedState: null,
  };

  console.log(startState);
  console.log(startState.players);
  await gameInfo.set('gameState', startState);

  await sendGameState(interaction.client, 'general');
  await genChannel.send(
    `${shuffledPlayers.map((e) => `<@${e}>`).join(', ')}, the Mafia have infiltrated your number, and the game has thus begun.`,
  );
  await scheduleInXHours('end_supermaj', {}, 6);
  setTalkConfig({
    channelId: gameChannels['general'].channelId,
    limit: 1000,
  });
}

async function sendGameState(
  client,
  chanSelect = 'general',
  reveal = false,
  winner = 'none',
  interaction = null,
) {
  const gameChannels = await gameInfo.get('game_channels');
  const gameState = await gameInfo.get('gameState');
  const guild = await client.guilds.fetch(gameState.guildId);
  const genChannel = await guild.channels.fetch(
    gameChannels['general'].channelId,
  );
  const announceChannel = await guild.channels.fetch(
    gameChannels['announcements'].channelId,
  );
  const currentChannel = interaction ? interaction.channel : genChannel;
  let channel;
  if (chanSelect === 'general') {
    channel = genChannel;
  } else if (chanSelect === 'announce') {
    channel = announceChannel;
  } else {
    channel = currentChannel;
  }

  let pCrowns = gameState.players.map((e) => '');

  if (reveal && winner !== 'none') {
    pCrowns = gameState.players.map((e) => (e.team === winner ? '👑' : ''));
  }

  const embedColor = reveal && winner !== 'none' ? winner : 'Neutral';

  let cDayChats = {};

  for (const id of gameState.players.map((e) => e.id)) {
    cDayChats[id] =
      (await chatCounts.get(`talkCount:${gameState.guildId}:${id}`)) ?? 0;
  }

  const embed = standardEmbed(
    'Current Game State:',
    `${gameState.players.map((e, i) => `${i + 1}. ${e.alive ? '' : '~~'}<@${e.id}> (${cDayChats[e.id]}) ${pCrowns[i]}${e.alive ? '' : '~~'} ${reveal || e.flipped ? `**(${e.role}, ${e.team})**` : ''}`).join('\n')}\n\n**State:** ${gameState.currentState}${gameState.phaseTimers.length > 0 ? `\nPhase Ends <t:${Math.floor(gameState.phaseTimers[0].timeStamp / 1000)}:R>` : ''}${gameState.phaseTimers.length > 1 ? `\nITAs ${gameState.itaActive ? 'Deactivate' : 'Activate'} <t:${Math.floor(gameState.phaseTimers[1].timeStamp / 1000)}:R>` : '\nITAs Deactivated'}`,
    embedColor,
  );

  await channel.send(embed);
}

async function sendVoteState(
  client,
  chanSelect = 'picks',
  index = -1,
  interaction = null,
  reveal = false,
) {
  const gameChannels = await gameInfo.get('game_channels');
  const gameState = await gameInfo.get('gameState');
  const guild = await client.guilds.fetch(gameState.guildId);
  const pickChannel = await guild.channels.fetch(
    gameChannels['picks'].channelId,
  );
  const currentChannel = interaction ? interaction.channel : pickChannel;
  let channel;
  if (chanSelect === 'picks') {
    channel = pickChannel;
  } else {
    channel = currentChannel;
  }

  let dayIndex = index - 1;
  if (index === -1 || index - 1 > gameState.dayIndex) {
    dayIndex = gameState.dayIndex;
  }

  const cDayVoteOptions = [
    ...new Set(gameState.dayVotes[dayIndex].filter((e) => e !== null)),
  ];
  const cDayVotes = gameState.dayVotes[dayIndex];
  let cDayChats = {};

  if (dayIndex === gameState.dayIndex) {
    for (const id of gameState.players.map((e) => e.id)) {
      cDayChats[id] =
        (await chatCounts.get(`talkCount:${gameState.guildId}:${id}`)) ?? 0;
    }
  } else {
    cDayChats = gameState.dayChats[dayIndex];
  }

  let resultText = '';
  if (
    gameState.dayExecuted[dayIndex] &&
    gameState.dayExecuted[dayIndex] === 'Sleep'
  ) {
    resultText = `\n\n**The town went to sleep and no one was executed!**`;
  } else if (gameState.dayExecuted[dayIndex]) {
    resultText = `\n\n**<@${gameState.dayExecuted[dayIndex]}> (${cDayChats[gameState.dayExecuted[dayIndex]]}) was executed!**`;
  }

  const optionVotes = (option) => {
    return gameState.players
      .filter((e, i) => cDayVotes[i] === option)
      .map((e) => e.id);
  };

  const embed = standardEmbed(
    `Current Day ${dayIndex + 1} Vote State`,
    `${cDayVoteOptions
      .sort((a, b) => optionVotes(b).length - optionVotes(a).length)
      .map(
        (e) =>
          `**${e === 'Sleep' ? 'GO TO SLEEP' : `<@${e}> (${cDayChats[e]}) to be executed`}**\n${optionVotes(e).length} Votes: ${optionVotes(
            e,
          )
            .map((e1) => `<@${e1}> (${cDayChats[e1]})`)
            .join(', ')}`,
      )
      .join('\n\n')}\n\nNot Voted: ${optionVotes(null)
      .map((e1) => `<@${e1}> (${cDayChats[e1]})`)
      .join(', ')}${resultText}`,
  );

  await channel.send(embed);
}

async function killPlayer(client, targetUser) {
  const gameState = await gameInfo.get('gameState');
  const guild = await client.guilds.fetch(gameState.guildId);
  const gameChannels = await gameInfo.get('game_channels');

  const announceChannel = await guild.channels.fetch(
    gameChannels['announcements'].channelId,
  );
  const currentPlayers = await gameInfo.get('players');

  const killedChats =
    (await chatCounts.get(`talkCount:${gameState.guildId}:${targetUser}`)) ?? 0;

  await announceChannel.send(
    `${currentPlayers.map((e) => `<@${e}>`).join(' ')}\nRest in peace <@${targetUser}> (${killedChats}), who has been executed!`,
  );

  const playerIndex = gameState.players.map((e) => e.id).indexOf(targetUser);
  gameState.players[playerIndex].alive = false;

  await gameInfo.set('gameState', gameState);

  const genChannel = await guild.channels.fetch(
    gameChannels['general'].channelId,
  );
  const nongameChannel = await guild.channels.fetch(
    gameChannels['nongame'].channelId,
  );
  const picksChannel = await guild.channels.fetch(
    gameChannels['picks'].channelId,
  );
  const paragraphsChannel = await guild.channels.fetch(
    gameChannels['paragraphs'].channelId,
  );
  const heavenChannel = await guild.channels.fetch(
    gameChannels['heaven'].channelId,
  );
  const spiesChannel = await guild.channels.fetch(
    gameChannels['spies'].channelId,
  );

  await genChannel.permissionOverwrites.edit(targetUser, {
    [PermissionFlagsBits.SendMessages]: false,
  });
  await nongameChannel.permissionOverwrites.edit(targetUser, {
    [PermissionFlagsBits.SendMessages]: false,
  });
  await picksChannel.permissionOverwrites.edit(targetUser, {
    [PermissionFlagsBits.SendMessages]: false,
  });
  await paragraphsChannel.permissionOverwrites.edit(targetUser, {
    [PermissionFlagsBits.SendMessages]: false,
  });
  await heavenChannel.permissionOverwrites.edit(targetUser, {
    [PermissionFlagsBits.ViewChannel]: true,
    [PermissionFlagsBits.SendMessages]: true,
    [PermissionFlagsBits.ReadMessageHistory]: true,
  });
  await spiesChannel.permissionOverwrites.edit(targetUser, {
    [PermissionFlagsBits.SendMessages]: false,
  });

  //Final check
  const leftAlive = gameState.players.filter((e) => e.alive).length;
  const mafiaAlive = gameState.players.filter(
    (e) => e.alive && e.team === 'Mafia',
  ).length;

  if (mafiaAlive >= leftAlive / 2 || mafiaAlive === 0) {
    await endGame(client);
  }
}

async function endGame(client) {
  const gameState = await gameInfo.get('gameState');
  const guild = await client.guilds.fetch(gameState.guildId);
  const currentPlayers = await gameInfo.get('players');

  const gameChannels = await gameInfo.get('game_channels');
  const genChannel = await guild.channels.fetch(
    gameChannels['general'].channelId,
  );
  const nongameChannel = await guild.channels.fetch(
    gameChannels['nongame'].channelId,
  );
  const picksChannel = await guild.channels.fetch(
    gameChannels['picks'].channelId,
  );
  const paragraphsChannel = await guild.channels.fetch(
    gameChannels['paragraphs'].channelId,
  );
  const heavenChannel = await guild.channels.fetch(
    gameChannels['heaven'].channelId,
  );
  const spiesChannel = await guild.channels.fetch(
    gameChannels['spies'].channelId,
  );
  const announceChannel = await guild.channels.fetch(
    gameChannels['announcements'].channelId,
  );

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
      [PermissionFlagsBits.SendMessages]: true,
    });
    await picksChannel.permissionOverwrites.edit(id, {
      [PermissionFlagsBits.SendMessages]: false,
    });
    await paragraphsChannel.permissionOverwrites.edit(id, {
      [PermissionFlagsBits.SendMessages]: false,
    });
    await heavenChannel.permissionOverwrites.edit(id, {
      [PermissionFlagsBits.ViewChannel]: true,
      [PermissionFlagsBits.SendMessages]: true,
      [PermissionFlagsBits.ReadMessageHistory]: true,
    });
    await spiesChannel.permissionOverwrites.edit(id, {
      [PermissionFlagsBits.ViewChannel]: true,
      [PermissionFlagsBits.SendMessages]: false,
      [PermissionFlagsBits.ReadMessageHistory]: true,
    });
  }

  const leftAlive = gameState.players.filter((e) => e.alive).length;
  const mafiaAlive = gameState.players.filter(
    (e) => e.alive && e.team === 'Mafia',
  ).length;

  let winningTeam;
  if (mafiaAlive >= leftAlive / 2) {
    await announceChannel.send(
      `${currentPlayers.map((e) => `<@${e}>`).join(' ')}\n# THE MAFIA WIN!`,
    );
    winningTeam = 'Mafia';
  } else if (mafiaAlive === 0) {
    await announceChannel.send(
      `${currentPlayers.map((e) => `<@${e}>`).join(' ')}\n# THE TOWN WIN!`,
    );
    winningTeam = 'Town';
  }
  gameState.endTime = Date.now();
  gameState.currentState = 'GameOver';
  await gameInfo.set('gameState', gameState);
  await gameHistory.set(gameState.gameId, gameState);
  await gameInfo.set('inPlay', false);
  await gameInfo.set('players', []);
  await gameInfo.set('sawRolePlayers', []);
  await sendGameState(client, 'general', true, winningTeam);
  await sendGameState(client, 'announce', true, winningTeam);
}

const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
};

//const randomNumber = (max) => {
//  return Math.floor(Math.random() * (max + 1));
//};

const randomNumber = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const isUnique = (arr) => arr.length === new Set(arr).size;

module.exports = {
  errorMessage,
  standardEmbed,
  shuffleArray,
  randomNumber,
  startGame,
  endGame,
  sendGameState,
  sendVoteState,
  killPlayer,
  isUnique,
};
