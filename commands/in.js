'use strict';

const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

const { standardEmbed } = require('../message-helpers');

const data = new SlashCommandBuilder()
  .setName('in')
  .setDescription('Join the Mafia game, if it is not ongoing')
  .addUserOption((option) =>
    option
      .setName('user')
      .setDescription('The user to in for, if you are an admin')
      .setRequired(false),
  );

async function createPrivateChannel(guild, userDisplay, userId) {
  const channel = await guild.channels.create({
    name: `private-${userDisplay}`,
    type: ChannelType.GuildText,

    permissionOverwrites: [
      {
        // Hide the channel from everyone by default
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        // Allow the specific user to see and use it
        id: userId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
      {
        id: guild.members.me.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
    ],
  });

  return channel;
}

async function execute(interaction, user) {
  await interaction.deferReply({ ephemeral: true });
  if (!interaction.guildId) {
    return interaction.editReply({
      content: 'This command can only be used in a server.',
      ephemeral: true,
    });
  }
  const gameOngoing = await gameInfo.get('inPlay');
  const currentPlayers = (await gameInfo.get('players')) ?? [];
  if (gameOngoing) {
    await interaction.editReply({
      content: `The game is ongoing/full, nobody can join!`,
      ephemeral: true,
    });
    return;
  }
  const gameChannels = await gameInfo.get('game_channels');
  const genChannel = await interaction.guild.channels.fetch(
    gameChannels['general'].channelId,
  );

  const targetUser = interaction.options.getUser('user');
  let newUser = interaction.user;
  if (user.isAuthorized && targetUser) {
    newUser = targetUser;
  }

  // Don't add the user twice
  if (!currentPlayers.includes(newUser.id)) {
    currentPlayers.push(newUser.id);

    await gameInfo.set('players', currentPlayers);
    await genChannel.send(
      `<@${newUser.id}> has now joined the lobby! Player count is at ${currentPlayers.length}/Inf.`,
    );
    await interaction.editReply({
      content: `You have joined the lobby!`,
      ephemeral: true,
    });

    if (currentPlayers.length === 17) {

      const playerChannels = await gameInfo.get('player_channels');

      for (const id of currentPlayers) {
        if (id in playerChannels) {
          // nothin
        } else {
          const newUser = await interaction.client.users.fetch(id);
          const displayName = newUser.globalName ?? newUser.username;
          const newChannel = await createPrivateChannel(
            interaction.guild,
            displayName,
            id,
          );
          playerChannels[id] = {
            id: id,
            displayName: displayName,
            channelId: newChannel.id,
          };
        }
      }
      await gameInfo.set('player_channels', playerChannels);
    }
  } else {
    await interaction.editReply({
      content: `You can't add the lobby if you're already in it.`,
      ephemeral: true,
    });
  }
}

module.exports = {
  data,
  execute,
};
