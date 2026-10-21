'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { standardEmbed } = require('../message-helpers');

const data = new SlashCommandBuilder()
  .setName('adminsub')
  .setDescription('Swap the roles of two players')
  .addUserOption((option) =>
    option
      .setName('userout')
      .setDescription('The user to swap out')
      .setRequired(true),
  )
  .addUserOption((option) =>
    option
      .setName('userin')
      .setDescription('The user to swap in')
      .setRequired(true),
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
  let currentPlayers = await gameInfo.get('players');
  const playerChannels = await gameInfo.get('player_channels');
  const userOut = interaction.options.getUser('userout').id;
  const userIn = interaction.options.getUser('userin').id;

  if (
    !gameOngoing ||
    !currentPlayers.includes(userOut) ||
    currentPlayers.includes(userIn) ||
    (!userIn) in playerChannels
  ) {
    await interaction.editReply({
      content: `What if YOU tried to sub someone in but SadNixon said "NO"`,
      ephemeral: true,
    });
    return;
  }

  const gameState = await gameInfo.get('gameState');
  const rolePool = await gameInfo.get('rolePool');
  const gameChannels = await gameInfo.get('game_channels');
  const genChannel = await interaction.guild.channels.fetch(
    gameChannels['general'].channelId,
  );
  const spiesChannel = await interaction.guild.channels.fetch(
    gameChannels['spies'].channelId,
  );
  const picksChannel = await interaction.guild.channels.fetch(
    gameChannels['picks'].channelId,
  );
  const paragraphsChannel = await interaction.guild.channels.fetch(
    gameChannels['paragraphs'].channelId,
  );
  const heavenChannel = await interaction.guild.channels.fetch(
    gameChannels['heaven'].channelId,
  );
  const nongameChannel = await interaction.guild.channels.fetch(
    gameChannels['nongame'].channelId,
  );

  const currentPlayerIdx = currentPlayers.indexOf(userOut);
  currentPlayers = currentPlayers.toSpliced(currentPlayerIdx, 1, userIn);

  const userOutIndex = gameState.players.map((e) => e.id).indexOf(userOut);
  gameState.players[userOutIndex].id = userIn;

  for (let j; j <= gameState.dayIndex; j++) {
    for (let i; i < currentPlayers.length; i++) {
      if (gameState.dayVotes[j][i] === userOut) {
        gameState.dayVotes[j][i] = userIn;
      }
    }
  }

  for (const ita of gameState.dayITAs[gameState.dayIndex]) {
    if (ita.id === userOut) {
      ita.id = userIn;
    }
  }

  const key = `talkCount:${interaction.guild.id}:${userOut}`;
  let countOld = (await chatCounts.get(key)) ?? 0;
  await chatCounts.set(`talkCount:${interaction.guild.id}:${userIn}`, countOld);

  await genChannel.permissionOverwrites.edit(userIn, {
    [PermissionFlagsBits.ViewChannel]: true,
    [PermissionFlagsBits.SendMessages]: true,
    [PermissionFlagsBits.ReadMessageHistory]: true,
  });
  await picksChannel.permissionOverwrites.edit(userIn, {
    [PermissionFlagsBits.ViewChannel]: true,
    [PermissionFlagsBits.SendMessages]: true,
    [PermissionFlagsBits.ReadMessageHistory]: true,
  });
  await paragraphsChannel.permissionOverwrites.edit(userIn, {
    [PermissionFlagsBits.ViewChannel]: true,
    [PermissionFlagsBits.SendMessages]: true,
    [PermissionFlagsBits.ReadMessageHistory]: true,
  });
  await nongameChannel.permissionOverwrites.edit(userIn, {
    [PermissionFlagsBits.ViewChannel]: true,
    [PermissionFlagsBits.SendMessages]: true,
    [PermissionFlagsBits.ReadMessageHistory]: true,
  });
  await heavenChannel.permissionOverwrites.edit(userIn, {
    [PermissionFlagsBits.ViewChannel]: false,
    [PermissionFlagsBits.SendMessages]: false,
    [PermissionFlagsBits.ReadMessageHistory]: false,
  });

  await genChannel.permissionOverwrites.edit(userOut, {
    [PermissionFlagsBits.ViewChannel]: true,
    [PermissionFlagsBits.SendMessages]: false,
    [PermissionFlagsBits.ReadMessageHistory]: true,
  });
  await picksChannel.permissionOverwrites.edit(userOut, {
    [PermissionFlagsBits.ViewChannel]: true,
    [PermissionFlagsBits.SendMessages]: false,
    [PermissionFlagsBits.ReadMessageHistory]: true,
  });
  await paragraphsChannel.permissionOverwrites.edit(userOut, {
    [PermissionFlagsBits.ViewChannel]: true,
    [PermissionFlagsBits.SendMessages]: false,
    [PermissionFlagsBits.ReadMessageHistory]: true,
  });
  await nongameChannel.permissionOverwrites.edit(userOut, {
    [PermissionFlagsBits.ViewChannel]: true,
    [PermissionFlagsBits.SendMessages]: false,
    [PermissionFlagsBits.ReadMessageHistory]: true,
  });

  const userOutRole = gameState.players[userOutIndex].role;

  let playerChannel;
  try {
    playerChannel = await interaction.guild.channels.fetch(
      playerChannels[userIn].channelId,
    );
  } catch (error) {
    console.error('Failed to get all channels:', error);
    process.exitCode = 1;
    return interaction.channel.send(
      `Game cannot start, the required game channel from <${userIn}> is missing!`,
    );
  }
  await playerChannel.send(
    `**<@${userIn}>, you are ${userOutRole}!**\n${rolePool[userOutRole].team === 'Avalon' ? '🟩' : '🟥'} ${rolePool[userOutRole].pm} ${rolePool[userOutRole].team === 'Avalon' ? '🟩' : '🟥'}\n\nUse /ack to acknowledge that you have viewed your role and gain access to the public chats.`,
  );

  const knownSpies = gameState.players.filter(
    (e, i) =>
      rolePool[e.role].team === 'Secret Hitler' &&
      rolePool[e.role].nonpack === false,
  );

  if (knownSpies.includes(userIn)) {
    if (
      !_.range(0, 13)
        .map((e) => `${e * 100}`)
        .includes(userIn)
    ) {
      console.log(userIn);
      const member = await interaction.guild.members
        .fetch(userIn)
        .catch(() => null);
      console.log(userIn, member ? 'found' : 'NOT IN GUILD');
      await spiesChannel.permissionOverwrites.edit(userIn, {
        [PermissionFlagsBits.ViewChannel]: true,
        [PermissionFlagsBits.SendMessages]: true,
        [PermissionFlagsBits.ReadMessageHistory]: true,
      });
    }

    await playerChannel.send(
      standardEmbed(
        'The Secret Hitlers stand assembled:',
        `${knownSpies.map((e) => `<@${e}>`).join(', ')}`,
        'Secret Hitler',
      ),
    );
  }

  await gameInfo.set('gameState', gameState);
  await gameInfo.set('players', currentPlayers);

  await interaction.editReply({
    content: `<@${userOut}> has subbed with <@${userIn}>.`,
    ephemeral: true,
  });
}

module.exports = {
  data,
  execute,
};
