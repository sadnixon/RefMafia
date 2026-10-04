'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { standardEmbed } = require('../message-helpers');

const data = new SlashCommandBuilder()
  .setName('joined')
  .setDescription('See users in game');

async function execute(interaction, user) {
  await interaction.deferReply({ ephemeral: true });
  const currentPlayers = (await gameInfo.get('players')) ?? [];
  await interaction.editReply({
    content: `Here you go!`,
    ephemeral: true,
  });
  await interaction.channel.send(
    standardEmbed(
      'Users In Current Lobby:',
      `${currentPlayers.map((e) => `<@${e}>`).join(', ')}`,
    ),
  );
}

module.exports = {
  data,
  execute,
};
