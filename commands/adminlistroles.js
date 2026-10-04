'use strict';

const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('adminlistroles')
  .setDescription('List roles in pool');

async function execute(interaction, user) {
  await interaction.deferReply({ ephemeral: true });
  if (!user.isAuthorized) {
    return interaction.editReply({
      content: 'ADMIN ONLY COMMAND',
      ephemeral: true,
    });
  }

  const rolePool = await gameInfo.get('rolePool');

  await interaction.editReply({
    content: `Roles in the pool:\n\n${Object.keys(rolePool)
      .map(
        (e, i) =>
          `${i + 1}. ${rolePool[e].role}: ${rolePool[e].team}${rolePool[e].nonpack ? ' (non-pack)' : ''} ${rolePool[e].itanumber} ITA(s), ${rolePool[e].itasuccess}% odds`,
      )
      .join('\n')}`,
    ephemeral: true,
  });
}

module.exports = {
  data,
  execute,
};
