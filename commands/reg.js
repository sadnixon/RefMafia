'use strict';

const { SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('reg')
  .setDescription(
    'Register the channel you are in as your private game channel',
  )
  .addUserOption((option) =>
    option
      .setName('user')
      .setDescription('The user to reg for, if you are an admin')
      .setRequired(false),
  );

async function execute(interaction, user) {
  await interaction.deferReply({ ephemeral: true });
  if (!interaction.guildId) {
    return interaction.editReply({
      content: 'This command can only be used in a server.',
      ephemeral: true,
    });
  }

  const playerChannels = await gameInfo.get('player_channels');

  const targetUser = interaction.options.getUser('user');
  let newUser = interaction.user;
  if (user.isAuthorized && targetUser) {
    newUser = targetUser;
  }
  const id = newUser.id;
  const displayName = newUser.globalName ?? newUser.username;

  playerChannels[id] = {
    id: id,
    displayName: displayName,
    channelId: interaction.channel.id,
  };

  await gameInfo.set('player_channels', playerChannels);

  await interaction.editReply({
    content: `Registration successful!`,
    ephemeral: true,
  });
  await interaction.channel.send(
    `You have now registered this channel as your private channel for games!`,
  );
}

module.exports = {
  data,
  execute,
};
