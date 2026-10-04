'use strict';

const { SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('authorized')
  .setDescription('See authorized users');

async function execute(interaction, user) {
  await interaction.deferReply({ ephemeral: true });
  // Only authorized users can authorize other users
  if (!user.isAuthorized) {
    return interaction.editReply({
      content: 'ADMIN ONLY COMMAND',
      ephemeral: true,
    });
  }

  await interaction.editReply({
    content: `You authorized em!`,
    ephemeral: true,
  });
  await interaction.channel.send(
    `**Authorized Long Form Bot Users:**\n\n<@${[
      ...new Set(await authorizedDataSetters.get('auth')),
    ].join('>, <@')}>`,
  );
}

module.exports = {
  data,
  execute,
};
