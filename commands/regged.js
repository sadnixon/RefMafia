'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { standardEmbed } = require('../message-helpers');

const data = new SlashCommandBuilder()
  .setName('regged')
  .setDescription('See regged users');

async function execute(interaction, user) {
  await interaction.deferReply({ ephemeral: true });
  // Only authorized users can authorize other users
  if (!user.isAuthorized) {
    return interaction.editReply({
      content: 'ADMIN ONLY COMMAND',
      ephemeral: true,
    });
  }
  const playerChannels = await gameInfo.get('player_channels');
  await interaction.editReply({
    content: `Here you go!`,
    ephemeral: true,
  });
  await interaction.channel.send(
    `**Users With /reg'd Channels:**\n\n${Object.keys(playerChannels)
      .map((e) => `<@${e}>`)
      .join(', ')}`,
  );
  for (const player of Object.keys(playerChannels)) {
    console.log(playerChannels[player]);
    try {
      const playerChannel = await interaction.guild.channels.fetch(
        playerChannels[player].channelId,
      );
      await playerChannel.send(
        standardEmbed(
          'Here it is!',
          `This is <@${player}>'s channel for games.`,
        ),
      );
    } catch (error) {
      console.error('Failed to get all channels:', error);
      process.exitCode = 1;
      await interaction.channel.send(`Channel for <@${player}> doesn't exist!`);
    }
  }
}

module.exports = {
  data,
  execute,
};
