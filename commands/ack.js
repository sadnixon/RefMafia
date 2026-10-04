'use strict';

const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

const { standardEmbed } = require('../message-helpers');

const data = new SlashCommandBuilder()
  .setName('ack')
  .setDescription('Acknowledge viewing of role');

async function execute(interaction, user) {
  await interaction.deferReply({ ephemeral: true });
  const playerChannels = await gameInfo.get('player_channels');
  const playerChannelId = playerChannels[interaction.user.id].channelId;
  if (!interaction.guildId || interaction.channel.id !== playerChannelId) {
    return interaction.editReply({
      content: "This command can only be used in a player's private channel.",
      ephemeral: true,
    });
  }

  const gameOngoing = await gameInfo.get('inPlay');
  const sawRolePlayers = await gameInfo.get('sawRolePlayers');
  const currentPlayers = await gameInfo.get('players');
  if (
    !gameOngoing ||
    !currentPlayers.includes(interaction.user.id) ||
    sawRolePlayers.includes(interaction.user.id)
  ) {
    await interaction.editReply({
      content: `It's not time for you to acknowledge that you saw your role!`,
      ephemeral: true,
    });
    return;
  }

  sawRolePlayers.push(interaction.user.id);
  await gameInfo.set('sawRolePlayers', sawRolePlayers);

  await interaction.editReply({
    content: `You did it!`,
    ephemeral: true,
  });
  await interaction.channel.send(
    `Thanks for looking at your role! You now have access to the public channels.`,
  );

  const gameChannels = await gameInfo.get('game_channels');
  const genChannel = await interaction.guild.channels.fetch(
    gameChannels['general'].channelId,
  );
  const picksChannel = await interaction.guild.channels.fetch(
    gameChannels['picks'].channelId,
  );
  const paragraphsChannel = await interaction.guild.channels.fetch(
    gameChannels['paragraphs'].channelId,
  );

  await genChannel.permissionOverwrites.edit(interaction.user.id, {
    [PermissionFlagsBits.SendMessages]: true,
  });
  await picksChannel.permissionOverwrites.edit(interaction.user.id, {
    [PermissionFlagsBits.SendMessages]: true,
  });
  await paragraphsChannel.permissionOverwrites.edit(interaction.user.id, {
    [PermissionFlagsBits.SendMessages]: true,
  });
}

module.exports = {
  data,
  execute,
};
