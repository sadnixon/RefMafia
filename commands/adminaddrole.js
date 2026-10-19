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
      .setName('pm')
      .setDescription('The role PM that the player will get')
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName('team')
      .setDescription('The team the role will be on')
      .setRequired(false)
      .addChoices(
        {
          name: 'Avalon',
          value: 'avalon',
        },
        {
          name: 'Secret Hitler',
          value: 'sh',
        },
        {
          name: 'Non-Pack Secret Hitler',
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
  const team = interaction.options.getString('team') ?? 'avalon';
  const pm = interaction.options.getString('pm');
  const itanumber = interaction.options.getInteger('itanumber') ?? 1;
  const itasuccess = interaction.options.getInteger('itasuccess') ?? 17;

  rolePool[role] = {
    role: role,
    team: team === 'avalon' ? 'Avalon' : 'Secret Hitler',
    nonpack: team === 'nonpack',
    pm: pm,
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
