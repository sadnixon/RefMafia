'use strict';

const {
  SlashCommandBuilder,
} = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('authorize')
  .setDescription('Authorize a user to use restricted bot commands')
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('The user to authorize')
      .setRequired(true)
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

  const targetUser = interaction.options.getUser('user');

  const authorizedUsers =
    (await authorizedDataSetters.get('auth')) ?? [];

  // Don't add the user twice
  if (!authorizedUsers.includes(targetUser.id)) {
    authorizedUsers.push(targetUser.id);

    await authorizedDataSetters.set(
      'auth',
      authorizedUsers
    );
  }

  await interaction.editReply({
    content: `<@${targetUser.id}> is now authorized.`,
    ephemeral: true,
  });
}

module.exports = {
  data,
  execute,
};