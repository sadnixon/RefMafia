'use strict';

const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

const { killPlayer } = require('../message-helpers');

const data = new SlashCommandBuilder()
  .setName('adminressurect')
  .setDescription('Ressurect a player')
  .addUserOption((option) =>
    option
      .setName('user')
      .setDescription('The user to ascend')
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
  const currentPlayers = await gameInfo.get('players');
  const gameState = await gameInfo.get('gameState');
  const targetUser = interaction.options.getUser('user').id;
  const playerIndex = gameState.players.map((e) => e.id).indexOf(targetUser);
  const rolePool = await gameInfo.get('rolePool');

  if (
    !gameOngoing ||
    !currentPlayers.includes(targetUser) ||
    gameState.players[playerIndex].alive
  ) {
    await interaction.editReply({
      content: `What if YOU tried to send someone to HELL but SadNixon said "NO"`,
      ephemeral: true,
    });
    return;
  }

  const gameChannels = await gameInfo.get('game_channels');

  gameState.players[playerIndex].alive = false;
  gameState.players[playerIndex].flipped = false;

  await gameInfo.set('gameState', gameState);

  const genChannel = await interaction.guild.channels.fetch(
    gameChannels['general'].channelId,
  );
  const nongameChannel = await interaction.guild.channels.fetch(
    gameChannels['nongame'].channelId,
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
  const spiesChannel = await interaction.guild.channels.fetch(
    gameChannels['spies'].channelId,
  );

  await genChannel.permissionOverwrites.edit(targetUser, {
    [PermissionFlagsBits.SendMessages]: true,
  });
  await nongameChannel.permissionOverwrites.edit(targetUser, {
    [PermissionFlagsBits.SendMessages]: true,
  });
  await picksChannel.permissionOverwrites.edit(targetUser, {
    [PermissionFlagsBits.SendMessages]: true,
  });
  await paragraphsChannel.permissionOverwrites.edit(targetUser, {
    [PermissionFlagsBits.SendMessages]: true,
  });
  await heavenChannel.permissionOverwrites.edit(targetUser, {
    [PermissionFlagsBits.ViewChannel]: false,
    [PermissionFlagsBits.SendMessages]: false,
    [PermissionFlagsBits.ReadMessageHistory]: false,
  });
  if (
    gameState.players[playerIndex].team === 'Town' ||
    rolePool[gameState.players[playerIndex].role].nonpack
  ) {
    await spiesChannel.permissionOverwrites.edit(targetUser, {
      [PermissionFlagsBits.ViewChannel]: false,
      [PermissionFlagsBits.SendMessages]: false,
      [PermissionFlagsBits.ReadMessageHistory]: false,
    });
  } else {
    await spiesChannel.permissionOverwrites.edit(targetUser, {
      [PermissionFlagsBits.ViewChannel]: true,
      [PermissionFlagsBits.SendMessages]: true,
      [PermissionFlagsBits.ReadMessageHistory]: true,
    });
  }

  await interaction.editReply({
    content: `They're getting sent to hell!`,
    ephemeral: true,
  });
}

module.exports = {
  data,
  execute,
};
