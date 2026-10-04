'use strict';

const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('adminremoverole')
  .setDescription('Remove role from pool')
  .addStringOption((option) =>
    option
      .setName('role')
      .setDescription('The role to remove from the role pool')
      .setRequired(true),
  );

async function execute(interaction, user) {
  await interaction.deferReply({ ephemeral: true });
  if (!user.isAuthorized) {
    return interaction.editReply({
      content: 'ADMIN ONLY COMMAND',
      ephemeral: true,
    });
  }

  const rolePool = await gameInfo.get('rolePool');

  const role = interaction.options.getString('role');

  if (role in rolePool) {
    delete rolePool[role];
    await gameInfo.set('rolePool', rolePool);
    await interaction.editReply({
      content: `The role ${role} was removed!`,
      ephemeral: true,
    });
  } else {
    await interaction.editReply({
      content: `The role ${role} was not found!`,
      ephemeral: true,
    });
  }
}

module.exports = {
  data,
  execute,
};
