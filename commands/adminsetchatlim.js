'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getTalkConfig, setTalkConfig } = require('../talkstate');

const data = new SlashCommandBuilder()
  .setName('adminsetchatlim')
  .setDescription('Set the chat limit to something')
  .addIntegerOption((option) =>
    option
      .setName('number')
      .setDescription('The number to set the variable to')
      .setRequired(true)
      .setMinValue(0),
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
  if (!gameOngoing) {
    return interaction.editReply({
      content: 'This command can only be used during an ongoing game.',
      ephemeral: true,
    });
  }

  const number = interaction.options.getInteger('number');

  const gameState = await gameInfo.get('gameState');
  
  const oldLimit = gameState.chatLimit;
  gameState.chatLimit = number;

  const gameChannels = await gameInfo.get('game_channels');

  const genChannel = await message.guild.channels.fetch(
    gameChannels['general'].channelId,
  );
  const nongameChannel = await message.guild.channels.fetch(
    gameChannels['nongame'].channelId,
  );
  const picksChannel = await message.guild.channels.fetch(
    gameChannels['picks'].channelId,
  );

  for (const id of gameState.players.map((e) => e.id)) {
    let playerChats =
      (await chatCounts.get(`talkCount:${gameState.guildId}:${id}`)) ?? 0;
    if (playerChats >= oldLimit && playerChats < number) {
      await genChannel.permissionOverwrites.edit(message.author.id, {
        [PermissionFlagsBits.SendMessages]: true,
      });
      await nongameChannel.permissionOverwrites.edit(message.author.id, {
        [PermissionFlagsBits.SendMessages]: true,
      });
      await picksChannel.permissionOverwrites.edit(message.author.id, {
        [PermissionFlagsBits.SendMessages]: true,
      });
    }
  }

  await gameInfo.set('gameState', gameState);

  const talkConfig = getTalkConfig();
  setTalkConfig({
    channelId: talkConfig.channelId,
    limit: number,
  });

  await interaction.editReply({
    content: `The Chat Limit is now ${number}.`,
    ephemeral: true,
  });
}

module.exports = {
  data,
  execute,
};
