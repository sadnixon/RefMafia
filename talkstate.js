const {
  PermissionFlagsBits,
} = require('discord.js');

let talkConfig = null;

function getTalkConfig() {
  return talkConfig;
}

function setTalkConfig(config) {
  talkConfig = config;
}

function clearTalkConfig() {
  talkConfig = null;
}

async function countMessage(message) {
  if (talkConfig == null) return;
  if (message.channel.id !== talkConfig.channelId) return;
  if (message.author.bot) return;
  const key = `talkCount:${message.guild.id}:${message.author.id}`;

  let count = (await chatCounts.get(key)) ?? 0;
  count++;

  await chatCounts.set(key, count);

  if (count >= talkConfig.limit) {
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
    const paragraphsChannel = await message.guild.channels.fetch(
      gameChannels['paragraphs'].channelId,
    );

    const member = await message.guild.members
      .fetch(message.author.id)
      .catch(() => null);

    await genChannel.permissionOverwrites.edit(message.author.id, {
      [PermissionFlagsBits.SendMessages]: false,
    });
    await nongameChannel.permissionOverwrites.edit(message.author.id, {
      [PermissionFlagsBits.SendMessages]: false,
    });
    await picksChannel.permissionOverwrites.edit(message.author.id, {
      [PermissionFlagsBits.SendMessages]: false,
    });
    await paragraphsChannel.permissionOverwrites.edit(message.author.id, {
      [PermissionFlagsBits.SendMessages]: false,
    });

    await genChannel.send(
      `<@${message.author.id}>, you just ran out of chats for today!`,
    );
  }
}

async function clearMessages(id) {
  const gameState = gameInfo.get('gameState');

  const key = `talkCount:${gameState.guildId}:${id}`;

  await chatCounts.set(key, 0);
}

module.exports = {
  getTalkConfig,
  setTalkConfig,
  clearTalkConfig,
  countMessage,
  clearMessages,
};
