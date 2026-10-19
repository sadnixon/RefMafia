'use strict';

const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('adminseerole')
  .setDescription('Check all role attributes')
  .addStringOption((option) =>
    option.setName('role').setDescription('The role to see').setRequired(true),
  );

async function execute(interaction, user) {
  await interaction.deferReply({ ephemeral: true });
  if (!user.isAuthorized) {
    return interaction.editReply({
      content: 'ADMIN ONLY COMMAND',
      ephemeral: true,
    });
  }

  const role = interaction.options.getString('role');

  const rolePool = await gameInfo.get('rolePool');

  if (role in rolePool) {
    await interaction.editReply({
      content: `${rolePool[role].role}:\n\nTeam: ${rolePool[role].team}\nNonpack: ${rolePool[role].nonpack}\nPM: ${rolePool[role].pm}\nITA Number: ${rolePool[role].itanumber}\nITA Percent: ${rolePool[role].itasuccess}`,
      ephemeral: true,
    });
  } else {
    await interaction.editReply({
      content: `Role not found.`,
      ephemeral: true,
    });
  }
}

module.exports = {
  data,
  execute,
};
