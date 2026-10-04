'use strict';

const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('adminaddrole')
  .setDescription('Add role to pool')
  .addStringOption((option) =>
    option
      .setName('role')
      .setDescription('The role to add to the role pool')
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName('team')
      .setDescription('The team the role will be on')
      .setRequired(true)
      .addChoices(
        {
          name: 'Town',
          value: 'town',
        },
        {
          name: 'Mafia',
          value: 'mafia',
        },
        {
          name: 'Non-Pack Mafia',
          value: 'nonpack',
        },
      ),
  )
  .addIntegerOption((option) =>
    option
      .setName('itanumber')
      .setDescription('How many ITAs per day this role will have')
      .setRequired(false)
      .setMinValue(0)
      .setMaxValue(100),
  )
  .addIntegerOption((option) =>
    option
      .setName('itasuccess')
      .setDescription('What % chance the ITA has of working')
      .setRequired(false)
      .setMinValue(0)
      .setMaxValue(100),
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
  const team = interaction.options.getString('team');
  const itanumber = interaction.options.getInteger('itanumber') ?? 1;
  const itasuccess = interaction.options.getInteger('itasuccess') ?? 15;

  rolePool[role] = {
    role: role,
    team: team === 'town' ? 'Town' : 'Mafia',
    nonpack: team === 'nonpack',
    itanumber: itanumber,
    itasuccess: itasuccess,
  };

  await gameInfo.set('rolePool', rolePool);

  await interaction.editReply({
    content: `The role ${role} was added!`,
    ephemeral: true,
  });
}

module.exports = {
  data,
  execute,
};
